import { notifyPropertyChange } from '@ember/object';
import { Query, FindRecords } from '@orbit/data';
import { Cache, Record } from 'ember-orbit-store';

export default class LiveQueryArray {
  private readonly cache: Cache;
  private readonly query: Query;

  private get records() {
    return recordArrayDataCache.get(this) || [];
  }

  [Symbol.iterator]() {
    return this.records[Symbol.iterator]();
  }

  get length() {
    return this.records.length;
  }

  get type() {
    const expression = this.query.expression as FindRecords;
    return expression.type;
  }

  constructor(cache: Cache, query: Query) {
    this.cache = cache;
    this.query = query;
    Object.freeze(this);
    this.notifyChanges();
  }

  notifyChanges() {
    const records = this.cache.query(this.query) as Record[];
    recordArrayDataCache.set(this, records);
    notifyPropertyChange(this, '[]');
  }
}

const recordArrayDataCache = new WeakMap();
