import { RecordIdentity } from '@orbit/data';
import { getRecordData } from '../record-data';

import Model from './model';

export class Relationship {
  readonly name: string;
  readonly owner: Model;

  constructor(owner: Model, name: string) {
    this.name = name;
    this.owner = owner;
  }
}

export class HasOneRelationship  extends Relationship {
  get value() {
    return getRecordData(this.owner).getHasOne(this.name);
  }

  set(record: RecordIdentity) {
    return getRecordData(this.owner).setHasOne(name, record);
  }

  load() {
    return getRecordData(this.owner).loadHasOne(name);
  }
}

export class HasManyRelationship extends Relationship {
  get value() {
    return getRecordData(this.owner).getHasMany(this.name);
  }

  get ids() {
    return this.value.map((record: RecordIdentity) => record.id);
  }

  load() {
    return getRecordData(this.owner).loadHasMany(name);
  }

  add(name: string, record: RecordIdentity) {
    return getRecordData(this.owner).addToHasMany(name, record);
  }

  remove(name: string, record: RecordIdentity) {
    return getRecordData(this.owner).removeFromHasMany(name, record);
  }

  replace(records: RecordIdentity[]) {
    return getRecordData(this.owner).setHasMany(name, records);
  }
}
