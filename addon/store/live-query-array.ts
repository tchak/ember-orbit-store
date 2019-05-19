import { Query } from '@orbit/data';

import Cache from './cache';

export default class LiveQueryArray<Model> implements Iterable<Model> {
  private readonly cache: Cache<Model>;
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

  constructor(cache: Cache<Model>, query: Query) {
    this.cache = cache;
    this.query = query;
    Object.freeze(this);
  }

  notifyArrayChange() {
    liveQueryArrayDataCache.delete(this);
  }
}

const liveQueryArrayDataCache = new WeakMap();
