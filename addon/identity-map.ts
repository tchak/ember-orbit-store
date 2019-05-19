
import { RecordIdentity, serializeRecordIdentity, deserializeRecordIdentity } from '@orbit/data';
import MemorySource from '@orbit/store';

import { RecordModel } from './record-data';

export default class IdentityMapFactory {
  get(source: MemorySource) {
    let identityMap = identityMapBySource.get(source);
    if (!identityMap) {
      identityMap = new IdentityMap();
      identityMapBySource.set(source, identityMap);
    }
    return identityMap;
  }
}

const identityMapBySource = new WeakMap();

export class IdentityMap implements Map<RecordIdentity, RecordModel> {
  private readonly _map: Map<string, RecordModel>;

  constructor() {
    this._map = new Map();
  }

  get(identity: RecordIdentity) {
    const identifier = serializeRecordIdentity(identity);
    return this._map.get(identifier);
  }

  set(identity: RecordIdentity, record: RecordModel) {
    const identifier = serializeRecordIdentity(identity);
    this._map.set(identifier, record);
    return this;
  }

  has(identity: RecordIdentity) {
    const identifier = serializeRecordIdentity(identity);
    return this._map.has(identifier);
  }

  delete(identity: RecordIdentity) {
    const identifier = serializeRecordIdentity(identity);
    this._map.delete(identifier);
    return true;
  }

  entries() {
    return Array.from(this._map)
      .map(([identifier, record]): [RecordIdentity, RecordModel] => [deserializeRecordIdentity(identifier), record])[Symbol.iterator]();
  }

  keys() {
    return Array.from(this).map(([identity]) => identity)[Symbol.iterator]();
  }

  values() {
    return this._map.values();
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  clear() {
    this._map.clear();
  }

  forEach(callbackFn: (record: RecordModel, identity: RecordIdentity, map: IdentityMap) => void, thisArg?: any) {
    for (let [identity, record] of this) {
      callbackFn.call(thisArg, record, identity, this);
    }
  }

  get size() {
    return this._map.size;
  }

  get [Symbol.toStringTag]() {
    return 'IdentityMap';
  }
}
