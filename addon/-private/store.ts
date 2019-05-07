import OrbitStore from '@orbit/store';
import { Record as OrbitRecord, Query, QueryOrExpression, buildQuery, RecordIdentity, RecordOperation, AttributeDefinition, RelationshipDefinition } from '@orbit/data';
import { QueryResultData } from '@orbit/record-cache';
import { Dict } from '@orbit/utils';
import { tracked } from '@glimmer/tracking';
import { registerWaiter, unregisterWaiter } from '@ember/test';
import { DEBUG } from '@glimmer/env';
import Observable from 'zen-observable';
import { Cache, Record, Scope } from 'ember-orbit-store';

enum Changes {
  None,
  Complete
}

export default class Store {
  readonly cache: Cache;
  private readonly source: OrbitStore;

  constructor(source: OrbitStore) {
    this.source = source;
    this.cache = new Cache(source.cache, this);

    if (DEBUG) {
      registerWaiter(this, this.isIdle);
    }
  }

  destroy() {
    this.cache.destroy();
    if (DEBUG) {
      unregisterWaiter(this, this.isIdle);
    }
  }

  @tracked
  private _loadingCount = 0;
  @tracked
  private _savingCount = 0;

  get isLoading() {
    return this._loadingCount > 0;
  }
  get isSaving() {
    return this._savingCount > 0;
  }

  private isIdle() {
    return !this.isLoading && !this.isSaving;
  }

  private async loading(promise: Promise<any>, queryType: string) {
    const prop = queryType === 'query' ? '_loadingCount' : '_savingCount';
    this[prop] += 1;
    return promise.finally(() => {
      this[prop] -= 1;
    });
  }

  async addRecord(type: string, record: Dict<any>) {
    const id = this.source.schema.generateId();
    const attributes: Dict<any> = {};
    const relationships: Dict<any> = {};

    this.eachAttribute(type, (name: string) => {
      attributes[name] = record[name];
    });
    this.eachRelationship(type, (name: string) => {
      relationships[name] = { data: record[name] };
    });

    const result = await this.loading(
      this.source.update(t =>
        t.addRecord({
          id,
          type,
          attributes,
          relationships
        })
      ),
      'mutation'
    );
    if (!result) {
      return this.cache.scope(type).find(id);
    }
    return this.materializeOne(result);
  }

  async updateRecord(identity: RecordIdentity, attributes: Dict<any>) {
    if (Object.keys(attributes).length !== 0) {
      await this.loading(
        this.source.update(t =>
          Object.keys(attributes).map(attribute =>
            t.replaceAttribute(identity, attribute, attributes[attribute])
          )
        ),
        'mutation'
      );
    }
    return this.cache.scope(identity.type).find(identity.id);
  }

  async removeRecord(identity: RecordIdentity) {
    await this.loading(
      this.source.update(t => t.removeRecord(identity)),
      'mutation'
    );
  }

  async addToRelatedRecords(owner: RecordIdentity, name: string, record: RecordIdentity) {
    await this.loading(
      this.source.update(t => t.addToRelatedRecords(owner, name, record)),
      'mutation'
    );
  }

  async removeFromRelatedRecords(owner: RecordIdentity, name: string, record: RecordIdentity) {
    await this.loading(
      this.source.update(t => t.removeFromRelatedRecords(owner, name, record)),
      'mutation'
    );
  }

  async replaceRelatedRecords(owner: RecordIdentity, name: string, records: RecordIdentity[]) {
    await this.loading(
      this.source.update(t => t.replaceRelatedRecords(owner, name, records)),
      'mutation'
    );
  }

  async replaceRelatedRecord(owner: RecordIdentity, name: string, record: RecordIdentity) {
    await this.loading(
      this.source.update(t => t.replaceRelatedRecord(owner, name, record)),
      'mutation'
    );
  }

  watch(record: Record) {
    return this.changes(record).subscribe((changes: string[]) => {
      record.notifyPropertyChanges(changes);
    });
  }

  fork() {
    const source = this.source.fork();
    return new Store(source);
  }

  merge(store: Store) {
    return this.source.merge(store.source);
  }

  scope(type: string) {
    return new Scope(type, this);
  }

  async query(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this.source.queryBuilder
    );

    const result = await this.source.query(query);
    return this.materialize(query, result);
  }

  liveQuery(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    return this.cache.liveQuery(queryOrExpression, options, id);
  }

  findRelatedRecord(record: RecordIdentity, name: string) {
    return this.query(q => q.findRelatedRecord(record, name));
  }

  findRelatedRecords(record: RecordIdentity, name: string) {
    return this.query(q => q.findRelatedRecords(record, name));
  }

  changes(record?: Record) {
    return new Observable(obs => {
      const callback = (operation?: RecordOperation) => {
        if (!obs.closed) {
          if (!record) {
            obs.next([]);
          } else if (operation) {
            const changes = this.computeChanges(record, operation);
            switch (changes) {
            case Changes.Complete:
              obs.complete();
              break;
            case Changes.None:
              break;
            default:
              obs.next(changes);
            }
          }
        }
      };
      this.cache.on('patch', callback);
      callback();
      return () => this.cache.off('patch', callback);
    });
  }

  materialize(query: Query, result: QueryResultData): Record | Record[] | null {
    if (isMany(query.expression.op, result)) {
      if (isNull(result)) {
        return []
      }
      return this.materializeMany(result);
    }
    if (isNull(result)) {
      return null;
    }
    return this.materializeOne(result);
  }

  private materializeOne(result: OrbitRecord): Record {
    return new Record(result.type, result.id, this);
  }

  private materializeMany(results: OrbitRecord[]): Record[] {
    return results.map(result => this.materializeOne(result));
  }

  private computeChanges(record: Record, operation: RecordOperation): string[] | Changes {
    if (record.isEqual(operation.record)) {
      switch (operation.op) {
        case 'updateRecord':
          return [];
        case 'removeRecord':
          return Changes.Complete;
        case 'replaceAttribute':
          return [operation.attribute];
        case 'replaceKey':
          return ['id'];
        case 'addToRelatedRecords':
        case 'removeFromRelatedRecords':
        case 'replaceRelatedRecords':
        case 'replaceRelatedRecord':
          return [operation.relationship];
      }
    } else if (
      operation.op === 'addRecord' ||
      operation.op === 'removeRecord'
    ) {
      const changes: string[] = [];
      this.eachRelationship(record.type, (name: string, { model, type }: RelationshipDefinition) => {
        if (type === 'hasMany' && operation.record.type === model) {
          changes.push(name);
        }
      });
      return changes;
    }
    return Changes.None;
  }

  private getModel(type: string) {
    return this.source.schema.getModel(type);
  }

  eachAttribute(type: string, callback: (name: string, attribute: AttributeDefinition) => void) {
    const attributes = this.getModel(type).attributes || {};
    for (let attribute in attributes) {
      callback(attribute, attributes[attribute]);
    }
  }

  eachRelationship(type: string, callback: (name: string, relationship: RelationshipDefinition) => void) {
    const relationships = this.getModel(type).relationships || {};
    for (let relationship in relationships) {
      callback(relationship, relationships[relationship]);
    }
  }
}

function isNull(x: any): x is null {
  return x == null;
}

function isMany(op: string, _result: QueryResultData): _result is OrbitRecord[] {
  if (op === 'findRecords' || op === 'findRelatedRecords') {
    return true;
  }
  return false;
}
