import { notifyPropertyChange } from '@ember/object';
import { RecordIdentity } from '@orbit/data';
import { Dict, deepGet } from '@orbit/utils';
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

    this.store.eachAttribute(this.type, (name: string) => {
      Object.defineProperty(this, name, {
        get: () => lazyLoadRecordData(this, name)
      });
    });
    this.store.eachRelationship(this.type, (name: string) => {
      Object.defineProperty(this, name, {
        get: () => lazyLoadRecordData(this, name)
      });
    });

    Object.freeze(this);
  }

  update(attributes: Dict<any>) {
    return this.store.updateRecord(this, attributes);
  }

  destroy() {
    return this.store.removeRecord(this);
  }

  hasOne(name: string) {
    const model = this.store.schema.getModel(this.type);
    const kind = deepGet(model, ['relationships', name, 'type']);
    if (kind && kind === 'hasOne') {
      return new HasOneRelationship(this, name);
    }
    return undefined;
  }

  hasMany(name: string) {
    const model = this.store.schema.getModel(this.type);
    const kind = deepGet(model, ['relationships', name, 'type']);
    if (kind && kind === 'hasMany') {
      return new HasManyRelationship(this, name);
    }
    return undefined;
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
    if (properties.length === 0) {
      const cache = recordDataCache.get(this);
      if (cache) {
        properties = Object.keys(cache);
      }
    }

    for (let property of properties) {
      this.notifyChange(property);
    }
  }
}

const recordDataCache = new WeakMap();

function lazyLoadRecordData(record: Record, name: string): any {
  let cache = recordDataCache.get(record);
  if (!cache) {
    cache = {};
    recordDataCache.set(record, cache);
  }
  if (!cache[name]) {
    if (record.store.schema.hasAttribute(record.type, name)) {
      cache[name] = record.store.cache.readAttribute(record, name);
    } else if (record.store.schema.hasRelationship(record.type, name)) {
      const relationship = record.relationship(name);
      if (relationship instanceof HasManyRelationship) {
        cache[name] = relationship.records;
      } else if (relationship instanceof HasOneRelationship) {
        cache[name] = relationship.record;
      }
    }
  }
  return cache[name];
}
