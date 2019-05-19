import { deepGet } from '@orbit/utils';
import RecordData, { getRecordData } from '../record-data';

import { HasOneRelationship, HasManyRelationship } from './relationships';

export default class Model {
  [attribute: string]: unknown;

  get id(): string {
    return getRecordData(this).identity.id;
  }

  get type() {
    return getRecordData(this).identity.type;
  }

  constructor(recordData: RecordData<Model>) {
    recordData.eachAttribute(name => {
      Object.defineProperty(this, name, {
        get: () => recordData.getAttribute(name)
      });
    });

    recordData.eachRelationship((name, relationship) => {
      if (relationship.type === 'hasMany') {
        Object.defineProperty(this, name, {
          get: () => recordData.getHasMany(name)
        });
      } else {
        Object.defineProperty(this, name, {
          get: () => recordData.getHasOne(name)
        });
      }
    });

    Object.freeze(this);
  }

  hasOne(name: string) {
    const { schema } = getRecordData(this);
    const kind = deepGet(schema, ['relationships', name, 'type']);
    if (kind === 'hasOne') {
      return new HasOneRelationship(this, name);
    }
    throw new Error();
  }

  hasMany(name: string) {
    const { schema } = getRecordData(this);
    const kind = deepGet(schema, ['relationships', name, 'type']);
    if (kind === 'hasMany') {
      return new HasManyRelationship(this, name);
    }
    throw new Error();
  }

  update(properties: Record<string, unknown>) {
    const recordData = getRecordData(this);
    for (let property of Object.keys(properties)) {
      recordData.setAttribute(property, properties[property]);
    }
    return recordData.sync().then(() => this);
  }

  notifyPropertyChange(name: string) {
    getRecordData(this).invalidate(name);
  }
}
