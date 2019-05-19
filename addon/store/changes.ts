import { RecordOperation, RecordIdentity, Record as OrbitRecord, cloneRecordIdentity } from '@orbit/data';
import { Cache as MemoryCache } from '@orbit/store';
import Observable from 'zen-observable';

export default function changes(cache: MemoryCache, identity?: RecordIdentity) {
  return new Observable<ChangeSet>(obs => {
    const patchCallbackFn = (operation: RecordOperation) => {
      if (!obs.closed) {
        const changeSet = changeSetForOperation(operation);
        if (identity) {
          if (isEqual(identity, changeSet.identity)) {
            if (changeSet.removed === true) {
              obs.complete();
            } else if (changeSet.properties.length) {
              obs.next(changeSet);
            }
          }
        } else {
          obs.next(changeSet);
        }
      }
    };
    const resetCallbackFn = () => {
      obs.next({ event: 'reset' });
    };

    cache.on('patch', patchCallbackFn);
    cache.on('reset', resetCallbackFn);

    return () => {
      cache.off('patch', patchCallbackFn);
      cache.off('reset', resetCallbackFn);
    };
  });
}

interface PatchChangeSet {
  event: 'patch';
  identity: RecordIdentity;
  properties: string[];
  removed: boolean;
}

interface ResetChangeSet {
  event: 'reset';
}

type ChangeSet = PatchChangeSet | ResetChangeSet;

function isEqual(identity: RecordIdentity, otherIdentity: RecordIdentity) {
  return identity.type === otherIdentity.type && identity.id === otherIdentity.id;
}

function changeSetForOperation(operation: RecordOperation): PatchChangeSet {
  const record = operation.record;
  const changeSet: PatchChangeSet = {
    event: 'patch',
    identity: cloneRecordIdentity(record),
    properties: [],
    removed: false
  };

  switch (operation.op) {
  case 'updateRecord':
    changeSet.properties = recordProperties(operation.record)
    break;
  case 'removeRecord':
    changeSet.removed = true;
    break;
  case 'replaceAttribute':
    changeSet.properties = [operation.attribute];
    break;
  case 'replaceKey':
    changeSet.properties = [operation.key];
    break;
  case 'addToRelatedRecords':
  case 'removeFromRelatedRecords':
  case 'replaceRelatedRecords':
  case 'replaceRelatedRecord':
    changeSet.properties = [operation.relationship];
    break;
  }

  return Object.freeze(changeSet);
}

function recordProperties(record: OrbitRecord) {
  const properties = [];
  const { attributes, keys, relationships } = record;

  for (let namespace of [attributes, keys, relationships]) {
    if (namespace) {
      for (let property of Object.keys(namespace)) {
        if (namespace.hasOwnProperty(property)) {
          properties.push(property);
        }
      }
    }
  }

  return properties;
}
