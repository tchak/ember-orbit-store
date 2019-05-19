import { Cache as MemoryCache } from '@orbit/store';
import { QueryOrExpression, buildQuery, RecordIdentity } from '@orbit/data';
import { RecordManager } from '../record-data';

import LiveQueryArray from './live-query-array';

export interface CacheSettings<Model> {
  cache: MemoryCache;
  manager: RecordManager<Model>;
}

export default class Cache<Model> {
  private sourceCache: MemoryCache;
  private readonly manager: RecordManager<Model>;

  constructor(settings: CacheSettings<Model>) {
    this.sourceCache = settings.cache;
    this.manager = settings.manager;
  }

  destroy() {
    this.sourceCache.off('patch');
  }

  query(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this.sourceCache.queryBuilder
    );

    const result = this.sourceCache.query(query);
    return this.manager.lookup(result);
  }

  liveQuery(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this.sourceCache.queryBuilder
    );

    return new LiveQueryArray<Model>(this, query);
  }

  findRecords(type: string) {
    return this.query(q => q.findRecords(type));
  }

  findRecord(identity: RecordIdentity) {
    return this.query(q => q.findRecord(identity));
  }
}
