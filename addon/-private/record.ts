import { RecordIdentity } from '@orbit/data';
import { Dict } from '@orbit/utils';

import Store from './store';
import { HasOneRelationship, HasManyRelationship } from './relationship';
import { notifyPropertyChange } from './property';

export default class Record implements RecordIdentity {
  [attribute: string]: any;

  readonly id: string;
  readonly type: string;
  readonly store: Store;

  constructor(type: string, id: string, store: Store) {
    this.type = type;
    this.id = id;
    this.store = store;
  }

  update(attributes: Dict<any>) {
    return this.store.updateRecord(this, attributes);
  }

  destroy() {
    return this.store.removeRecord(this);
  }

  hasOne(name: string) {
    return new HasOneRelationship(this, name);
  }

  hasMany(name: string) {
    return new HasManyRelationship(this, name);
  }

  isEqual(record: RecordIdentity) {
    return this.id === record.id && this.type === record.type;
  }

  notifyPropertyChanges(properties: string[]): void {
    if (properties.length) {
      for (let property of properties) {
        notifyPropertyChange(this, property);
      }
    } else {
      this.store.eachAttribute(this.type, (name: string) => {
        notifyPropertyChange(this, name);
      });
      this.store.eachRelationship(this.type, (name: string) => {
        notifyPropertyChange(this, name);
      });
    }
  }
}


