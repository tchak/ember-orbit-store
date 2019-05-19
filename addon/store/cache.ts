import { Cache as MemoryCache } from '@orbit/store';
import { QueryOrExpression, buildQuery, RecordIdentity } from '@orbit/data';
import { RecordManager } from '../record-data';

import LiveQueryArray from './live-query-array';

export interface CacheSettings {
  cache: MemoryCache;
  manager: RecordManager;
}

export default class Cache {
  private sourceCache: MemoryCache;
  private readonly manager: RecordManager;

  constructor(settings: CacheSettings) {
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

    return new LiveQueryArray(this, query);
  }

  findRecords(type: string) {
    return this.query(q => q.findRecords(type));
  }

  findRecord(identity: RecordIdentity) {
    return this.query(q => q.findRecord(identity));
  }
}
