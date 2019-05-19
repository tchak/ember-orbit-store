import MemorySource from '@orbit/store';
import { deepGet } from '@orbit/utils';
import { RecordIdentity, cloneRecordIdentity, AttributeDefinition, RelationshipDefinition } from '@orbit/data';
import { QueryResultData } from '@orbit/record-cache';

export interface RecordModel {
  id: string
}

export interface RecordManager {
  lookup(result: QueryResultData): RecordModel | RecordModel[] | null;
  evict(identity: RecordIdentity): void;
}

const hasOwnProperty = Object.prototype.hasOwnProperty;
const recordDataCache = new WeakMap();

export function getRecordData(owner: RecordModel): RecordData {
  return recordDataCache.get(owner);
}

export function setRecordData(owner: RecordModel, recordData: RecordData) {
  recordDataCache.set(owner, recordData);
}

export interface RecordDataSettings {
  identity: RecordIdentity;
  source: MemorySource;
  manager: RecordManager;
}

export default class RecordData {
  identity: RecordIdentity;

  private source: MemorySource;
  private manager: RecordManager;
  private data: Record<string, any>;

  constructor(settings: RecordDataSettings) {
    this.identity = cloneRecordIdentity(settings.identity);
    this.source = settings.source;
    this.manager = settings.manager;
    this.data = Object.create(null);
  }

  get schema() {
    return this.source.schema.getModel(this.identity.type);
  }

  hasAttribute(name: string) {
    return this.source.schema.hasAttribute(this.identity.type, name);
  }

  eachAttribute(callbackFn: (name: string, attribute: AttributeDefinition) => void) {
    const attributes = this.schema.attributes || {};
    for (let attribute in attributes) {
      callbackFn(attribute, attributes[attribute]);
    }
  }

  eachRelationship(callbackFn: (name: string, relationship: RelationshipDefinition) => void) {
    const relationships = this.schema.relationships || {};
    for (let relationship in relationships) {
      callbackFn(relationship, relationships[relationship]);
    }
  }

  getAttribute(name: string): any {
    if (!hasOwnProperty.call(this.data, name)) {
      const data = this.source.cache.getRecordSync(this.identity);
      this.data[name] = data && deepGet(data, ['attributes', name]);
    }
    return this.data[name];
  }

  setAttribute(name: string, value: unknown) {
    this.source.update(t => t.replaceAttribute(this.identity, name, value));
    this.data[name] = value;
  }

  getHasMany(name: string) {
    if (!hasOwnProperty.call(this.data, name)) {
      const result = this.source.cache.query(q => q.findRelatedRecords(this.identity, name));
      this.data[name] = this.manager.lookup(result);
    }
    return this.data[name];
  }

  getHasOne(name: string) {
    if (!hasOwnProperty.call(this.data, name)) {
      const result = this.source.cache.query(q => q.findRelatedRecord(this.identity, name));
      this.data[name] = this.manager.lookup(result);
    }
    return this.data[name];
  }

  async loadHasMany(name: string) {
    const result = await this.source.query(q => q.findRelatedRecords(this.identity, name));
    return this.manager.lookup(result);
  }

  async addToHasMany(name: string, record: RecordIdentity) {
    await this.source.update(t => t.addToRelatedRecords(this.identity, name, record));
  }

  async removeFromHasMany(name: string, record: RecordIdentity) {
    await this.source.update(t => t.removeFromRelatedRecords(this.identity, name, record));
  }

  async setHasMany(name: string, records: RecordIdentity[]) {
    await this.source.update(t => t.replaceRelatedRecords(this.identity, name, records));
  }

  async loadHasOne(name: string) {
    const result = await this.source.query(q => q.findRelatedRecord(this.identity, name));
    return this.manager.lookup(result);
  }

  async setHasOne(name: string, record: RecordIdentity) {
    await this.source.update(t => t.replaceRelatedRecord(this.identity, name, record));
  }

  async deleteRecord() {
    await this.source.update(t => t.removeRecord(this.identity));
    this.unloadRecord();
  }

  unloadRecord() {
    this.manager.evict(this.identity);
  }

  invalidate(name: string) {
    delete this.data[name];
  }

  async sync() {
    await this.source.requestQueue.process();
    await this.source.syncQueue.process();
  }
}
