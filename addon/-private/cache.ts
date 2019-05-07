import { Cache as OrbitCache } from '@orbit/store';
import { RecordIdentity, QueryOrExpression, buildQuery } from '@orbit/data';
import { Listener } from '@orbit/core';
import { deepGet } from '@orbit/utils';

import Store from './store';
import Scope from './scope';

export default class Cache {
  private readonly _cache: OrbitCache;
  private readonly _store: Store;

  constructor(cache: OrbitCache, store: Store) {
    this._cache = cache;
    this._store = store;
  }

  scope(type: string) {
    return new Scope(type, this);
  }

  on(event: string, listener: Listener) {
    this._cache.on(event, listener);
  }

  off(event: string, listener?: Listener) {
    this._cache.off(event, listener);
  }

  destroy() {
    this.off('patch');
  }

  query(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this._cache.queryBuilder
    );

    const result = this._cache.query(query);
    return this._store.materialize(query, result);
  }

  liveQuery(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this._cache.queryBuilder
    );

    this._store.query(query);
    return this._store.changes().map(() => this.query(query));
  }

  findRelatedRecord(record: RecordIdentity, name: string) {
    return this.query(q => q.findRelatedRecord(record, name));
  }

  findRelatedRecords(record: RecordIdentity, name: string) {
    return this.query(q => q.findRelatedRecord(record, name));
  }

  readAttribute(identity: RecordIdentity, attribute: string): any {
    const data = this._cache.getRecordSync(identity);
    return data && deepGet(data, ['attributes', attribute]);
  }
}
