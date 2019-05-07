import { Cache as OrbitCache } from '@orbit/store';
import { RecordIdentity, QueryOrExpression, buildQuery } from '@orbit/data';
import { Listener } from '@orbit/core';
import { deepGet } from '@orbit/utils';
import Store, { Scope } from 'ember-orbit-store';

export default class Cache {
  private readonly sourceCache: OrbitCache;
  private readonly store: Store;

  constructor(source: OrbitCache, store: Store) {
    this.sourceCache = source;
    this.store = store;
  }

  scope(type: string) {
    return new Scope(type, this);
  }

  on(event: string, listener: Listener) {
    this.sourceCache.on(event, listener);
  }

  off(event: string, listener?: Listener) {
    this.sourceCache.off(event, listener);
  }

  destroy() {
    this.off('patch');
  }

  query(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this.sourceCache.queryBuilder
    );

    const result = this.sourceCache.query(query);
    return this.store.materialize(query, result);
  }

  liveQuery(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this.sourceCache.queryBuilder
    );

    this.store.query(query);
    return this.store.changes().map(() => this.query(query));
  }

  findRelatedRecord(record: RecordIdentity, name: string) {
    return this.query(q => q.findRelatedRecord(record, name));
  }

  findRelatedRecords(record: RecordIdentity, name: string) {
    return this.query(q => q.findRelatedRecord(record, name));
  }

  readAttribute(identity: RecordIdentity, attribute: string): any {
    const data = this.sourceCache.getRecordSync(identity);
    return data && deepGet(data, ['attributes', attribute]);
  }
}
