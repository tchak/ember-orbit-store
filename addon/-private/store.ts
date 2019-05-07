import OrbitStore from '@orbit/store';
import { Record as OrbitRecord, Query, QueryOrExpression, buildQuery, RecordIdentity, RecordOperation, AttributeDefinition, RelationshipDefinition } from '@orbit/data';
import { QueryResultData } from '@orbit/record-cache';
import { Dict } from '@orbit/utils';
import { tracked } from '@glimmer/tracking';
import { registerWaiter, unregisterWaiter } from '@ember/test';
import { DEBUG } from '@glimmer/env';
import Observable from 'zen-observable';

import Cache from './cache';
import Record from './record';
import Scope from './scope';
import { defineProperty } from './property';

enum Changes {
  None,
  Complete
}

export default class Store {
  readonly cache: Cache;

  private readonly _store: OrbitStore;

  constructor(store: OrbitStore) {
    this._store = store;
    this.cache = new Cache(store.cache, this);

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

  private getModel(type: string) {
    return this._store.schema.getModel(type);
  }

  async addRecord(type: string, record: Dict<any>) {
    const id = this._store.schema.generateId();
    const attributes: Dict<any> = {};
    const relationships: Dict<any> = {};

    this.eachAttribute(type, (name: string) => {
      attributes[name] = record[name];
    });
    this.eachRelationship(type, (name: string) => {
      relationships[name] = { data: record[name] };
    });

    const result = await this.loading(
      this._store.update(t =>
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
        this._store.update(t =>
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
      this._store.update(t => t.removeRecord(identity)),
      'mutation'
    );
  }

  watch(record: Record) {
    return this.changes(record).subscribe((changes: string[]) => {
      record.notifyPropertyChanges(changes);
    });
  }

  fork() {
    const store = this._store.fork();
    return new Store(store);
  }

  merge(store: Store) {
    return this._store.merge(store._store);
  }

  scope(type: string) {
    return new Scope(type, this);
  }

  async query(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this._store.queryBuilder
    );

    const result = await this._store.query(query);
    return this.materialize(query, result);
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

  private materializeMany(results: OrbitRecord[]): Record[] {
    return results.map(result => this.materializeOne(result));
  }

  private materializeOne(result: OrbitRecord): Record {
    const record = new Record(result.type, result.id, this);

    this.eachAttribute(result.type, (name: string) => {
      defineProperty(record, name, () => record.store.cache.readAttribute(record, name));
    });

    this.eachRelationship(result.type, (name: string, { type }: RelationshipDefinition) => {
      if (type === 'hasMany') {
        defineProperty(record, name, () => record.hasMany(name).records);
      } else {
        defineProperty(record, name, () => record.hasOne(name).record);
      }
    });

    return record;
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
