import MemorySource from '@orbit/store';
import { clone } from '@orbit/utils';
import { QueryOrExpression, buildQuery, RecordIdentity, Record as OrbitRecord } from '@orbit/data';
import { QueryResultData } from '@orbit/record-cache';
import RecordData, { setRecordData } from '../record-data';

import Cache from './cache';
import changes from './changes';
import normalizeRecordProperties from './normalize-record-properties';

type ModelFactory<Model extends object> = new (recordData: RecordData<Model>) => Model;
type IdentityMap<Model extends object> = Map<RecordIdentity, Model>;
type IdentityMapFactory<Model extends object> = {
  get(source: MemorySource): IdentityMap<Model>;
};

export interface StoreSettings<Model extends object> {
  source: MemorySource;
  identityMap?: IdentityMapFactory<Model>;
  ModelClass?: ModelFactory<Model>;
}

export default class Store<Model extends object> {
  readonly source: MemorySource;
  readonly cache: Cache<Model>;

  private readonly settings: StoreSettings<Model>;
  private readonly identityMap?: IdentityMap<Model>;

  constructor(settings: StoreSettings<Model>) {
    this.source = settings.source;
    this.settings = settings;
    this.identityMap = settings.identityMap ? settings.identityMap.get(this.source) : undefined;
    this.cache = new Cache({
      cache: this.source.cache,
      manager: this.manager
    });
  }

  private get manager() {
    return {
      lookup: this.lookup.bind(this),
      evict: this.evict.bind(this)
    };
  }

  destroy() {
    this.cache.destroy();
    if (this.identityMap) {
      this.identityMap.clear();
    }
  }

  recordDataFor(identity: RecordIdentity) {
    return new RecordData<Model>({
      identity,
      source: this.source,
      manager: this.manager
    });
  }

  async addRecord(properties: Record<string, unknown>) {
    const record = normalizeRecordProperties(this.source.schema, properties);
    record.id = record.id || this.source.schema.generateId();

    await this.source.update(t => t.addRecord(record));

    const result = this.source.cache.query(q => q.findRecord(record));
    return this.lookup(result);
  }

  findRecord(identity: RecordIdentity) {
    return this.query(q => q.findRecord(identity));
  }

  findRecords(type: string) {
    return this.query(q => q.findRecords(type));
  }

  async query(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this.source.queryBuilder
    );

    const result = await this.source.query(query);
    return this.lookup(result);
  }

  async liveQuery(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    const query = buildQuery(
      queryOrExpression,
      options,
      id,
      this.source.queryBuilder
    );

    await this.query(query);
    return this.cache.liveQuery(query);
  }

  fork() {
    return new Store({
      ...this.settings,
      source: this.source.fork()
    });
  }

  merge(store: Store<Model>) {
    return this.source.merge(store.source);
  }

  changes(identity?: RecordIdentity) {
    return changes(this.source.cache, identity);
  }

  async sync() {
    await this.source.requestQueue.process();
    await this.source.syncQueue.process();
  }

  protected lookup(result: QueryResultData) {
    if (isNull(result)) {
      return null;
    } else if (isRecord(result)) {
      return this.lookupOne(result);
    }
    return this.lookupMany(result);
  }

  protected evict(identity: RecordIdentity) {
    if (this.identityMap) {
      this.identityMap.delete(identity);
    }
  }

  private lookupOne(identity: RecordIdentity): Model {
    let record;

    if (this.identityMap) {
      record = this.identityMap.get(identity);
    }

    if (!record) {
      if (this.settings.ModelClass) {
        const recordData = this.recordDataFor(identity);
        record = new this.settings.ModelClass(recordData);
        setRecordData(record, recordData);
      } else {
        record = clone(this.source.cache.getRecordSync(identity)) as Model;
      }

      if (this.identityMap && record) {
        this.identityMap.set(identity, record);
      }
    }

    return record;
  }

  private lookupMany(identities: RecordIdentity[]) {
    return identities.map(identity => this.lookupOne(identity));
  }
}

function isNull(result: QueryResultData): result is null {
  return result == null;
}

function isRecord(result: QueryResultData): result is OrbitRecord {
  return !Array.isArray(result);
}
