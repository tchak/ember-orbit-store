
import { RecordIdentity, serializeRecordIdentity, deserializeRecordIdentity } from '@orbit/data';

export class RecordIdentitySerializer implements IdentitySerializer<RecordIdentity> {
  serialize(identity: RecordIdentity) {
    return serializeRecordIdentity(identity);
  }

  deserialize(identifier: string) {
    return deserializeRecordIdentity(identifier);
  }
}

export interface IdentityMapSettings<Identity> {
  serializer: IdentitySerializer<Identity>;
}

export interface IdentitySerializer<Identity> {
  serialize(identity: Identity): string;
  deserialize(identifier: string): Identity;
}

export default class IdentityMapFactory<Identity, Model> {
  private serializer: IdentitySerializer<Identity>;

  constructor(settings: IdentityMapSettings<Identity>) {
    this.serializer = settings.serializer;
  }

  get<Source extends object>(source: Source) {
    let identityMap = identityMapBySource.get(source);
    if (!identityMap) {
      identityMap = new IdentityMap<Identity, Model>({ serializer: this.serializer });
      identityMapBySource.set(source, identityMap);
    }
    return identityMap;
  }
}

const identityMapBySource = new WeakMap();

export class IdentityMap<Identity, Model> implements Map<Identity, Model> {
  private serializer: IdentitySerializer<Identity>;
  private readonly _map: Map<string, Model>;

  constructor(settings: IdentityMapSettings<Identity>) {
    this.serializer = settings.serializer;
    this._map = new Map();
  }

  get(identity: Identity) {
    const identifier = this.serializer.serialize(identity);
    return this._map.get(identifier);
  }

  set(identity: Identity, record: Model) {
    const identifier = this.serializer.serialize(identity);
    this._map.set(identifier, record);
    return this;
  }

  has(identity: Identity) {
    const identifier = this.serializer.serialize(identity);
    return this._map.has(identifier);
  }

  delete(identity: Identity) {
    const identifier = this.serializer.serialize(identity);
    this._map.delete(identifier);
    return true;
  }

  entries() {
    return Array.from(this._map)
      .map(([identifier, record]): [Identity, Model] => [this.serializer.deserialize(identifier), record])[Symbol.iterator]();
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

  forEach(callbackFn: (record: Model, identity: Identity, map: IdentityMap<Identity, Model>) => void, thisArg?: any) {
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
