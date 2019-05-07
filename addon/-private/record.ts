import { notifyPropertyChange } from '@ember/object';
import { RecordIdentity, RelationshipDefinition } from '@orbit/data';
import { Dict } from '@orbit/utils';
import Store, { HasOneRelationship, HasManyRelationship } from 'ember-orbit-store';

export default class Record implements RecordIdentity {
  [attribute: string]: any;

  readonly id: string;
  readonly type: string;
  readonly store: Store;

  constructor(type: string, id: string, store: Store) {
    this.type = type;
    this.id = id;
    this.store = store;

    store.eachAttribute(type, (name: string) => {
      defineProperty(this, name, () => this.readAttribute(name));
    });

    store.eachRelationship(type, (name: string, { type }: RelationshipDefinition) => {
      if (type === 'hasMany') {
        defineProperty(this, name, () => this.hasMany(name).records);
      } else {
        defineProperty(this, name, () => this.hasOne(name).record);
      }
    });
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

  readAttribute(name: string) {
    return this.store.cache.readAttribute(this, name);
  }

  isEqual(record: RecordIdentity) {
    return this.id === record.id && this.type === record.type;
  }

  notifyChange(name: string) {
    const cache = recordDataCache.get(this);
    if (cache) {
      delete cache[name];
    }
    notifyPropertyChange(this, name);
  }

  notifyChanges(properties: string[]): void {
    if (properties.length) {
      for (let property of properties) {
        this.notifyChange(property);
      }
    } else {
      this.store.eachAttribute(this.type, (name: string) => {
        this.notifyChange(name);
      });
      this.store.eachRelationship(this.type, (name: string) => {
        this.notifyChange(name);
      });
    }
  }
}

const recordDataCache = new WeakMap();

function defineProperty(record: Record, name: string, callback: () => void) {
  Object.defineProperty(record, name, {
    get: () => lazyLoadRecordData(record, name, callback)
  });
}

function lazyLoadRecordData(record: Record, name: string, load: () => any): any {
  let cache = recordDataCache.get(record);
  if (!cache) {
    cache = {};
    recordDataCache.set(record, cache);
  }
  if (!cache[name]) {
    cache[name] = load();
  }
  return cache[name];
}
