import Store, { Cache, Record } from 'ember-orbit-store';

export default class Relationship {
  protected readonly _store: Store;
  protected readonly _cache: Cache;
  readonly owner: Record;
  readonly name: string;

  constructor(owner: Record, name: string) {
    this._store = owner.store;
    this._cache = owner.store.cache;
    this.owner = owner;
    this.name = name;
  }
}

export class HasManyRelationship extends Relationship {
  get records() {
    return this._cache.findRelatedRecords(this.owner, this.name);
  }

  load() {
    return this._store.findRelatedRecords(this.owner, this.name);
  }
}

export class HasOneRelationship  extends Relationship {
  get record() {
    return this._store.findRelatedRecord(this.owner, this.name);
  }

  load() {
    return this._store.findRelatedRecord(this.owner, this.name);
  }
}
