import Store, { Record, Cache } from 'ember-orbit-store';
import { RecordIdentity } from '@orbit/data';

export default class Relationship {
  readonly owner: Record;
  readonly name: string;

  constructor(owner: Record, name: string) {
    this.owner = owner;
    this.name = name;
  }

  get store(): Store {
    return this.owner.store;
  }

  get cache(): Cache {
    return this.owner.store.cache;
  }
}

export class HasManyRelationship extends Relationship {
  get records() {
    return this.cache.findRelatedRecords(this.owner, this.name) || [];
  }

  get ids() {
    return this.records.map((record: RecordIdentity) => record.id);
  }

  add(record: RecordIdentity) {
    return this.store.addToRelatedRecords(this.owner, this.name, record);
  }

  remove(record: RecordIdentity) {
    return this.store.removeFromRelatedRecords(this.owner, this.name, record);
  }

  replace(records: RecordIdentity[]) {
    return this.store.replaceRelatedRecords(this.owner, this.name, records);
  }

  clear() {
    return this.replace([]);
  }

  load() {
    return this.store.findRelatedRecords(this.owner, this.name);
  }
}

export class HasOneRelationship  extends Relationship {
  get record() {
    return this.cache.findRelatedRecord(this.owner, this.name);
  }

  set(record: RecordIdentity) {
    return this.store.replaceRelatedRecord(this.owner, this.name, record);
  }

  load() {
    return this.store.findRelatedRecord(this.owner, this.name);
  }
}
