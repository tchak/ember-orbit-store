import { Query } from '@orbit/data';
import RecordModel from '../record-data';

import Cache from './cache';

export default class LiveQueryArray implements Iterable<RecordModel> {
  private readonly cache: Cache;
  private readonly query: Query;

  private get value() {
    let records = liveQueryArrayDataCache.get(this);
    if (!records) {
      records = this.cache.query(this.query);
      liveQueryArrayDataCache.set(this, records);
    }
    return records;
  }

  [Symbol.iterator]() {
    return this.value[Symbol.iterator]();
  }

  get length() {
    return this.value.length;
  }

  constructor(cache: Cache, query: Query) {
    this.cache = cache;
    this.query = query;
    Object.freeze(this);
  }

  notifyArrayChange() {
    liveQueryArrayDataCache.delete(this);
  }
}

const liveQueryArrayDataCache = new WeakMap();
