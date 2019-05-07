import { notifyPropertyChange as emberNotifyPropertyChange } from '@ember/object';
import Record from './record';

const recordData = new WeakMap();

export function defineProperty(record: Record, name: string, callback: () => void) {
  Object.defineProperty(record, name, {
    get: () => lazyLoadRecordData(record, name, callback)
  });
}

export function notifyPropertyChange(record: Record, name: string) {
  const cache = recordData.get(record);
  if (cache) {
    delete cache[name];
  }
  emberNotifyPropertyChange(record, name);
}

function lazyLoadRecordData(record: Record, name: string, load: () => any): any {
  let cache = recordData.get(record);
  if (!cache) {
    cache = {};
    recordData.set(record, cache);
  }
  if (!cache[name]) {
    cache[name] = load();
  }
  console.log(cache);
  return cache[name];
}
