import { notifyPropertyChange } from '@ember/object';
import makeFunctionalModifier from 'ember-functional-modifiers';
import { RecordIdentity } from '@orbit/data';

import Store, { Model, LiveQueryArray } from 'ember-orbit-store';

type RecordOrArray = Model | LiveQueryArray;

export default makeFunctionalModifier(
  { services: ['store'] },
  (store: Store, _: Element, [recordOrArray]: RecordOrArray[]) => {
    const subscription = watch(store, recordOrArray);
    return () => subscription.unsubscribe();
  }
);

function watch(store: Store, recordOrArray: RecordOrArray) {
  return store.changes(getIdentity(recordOrArray)).subscribe(changeSet => {
    if (recordOrArray instanceof LiveQueryArray) {
      recordOrArray.notifyArrayChange();
      notifyPropertyChange(recordOrArray, '[]');
    } else if (changeSet.event === 'patch') {
      for (let property of changeSet.properties) {
        recordOrArray.notifyPropertyChange(property);
        notifyPropertyChange(recordOrArray, property);
      }
    }
  });
}

function getIdentity(recordOrArray: RecordOrArray) {
  if (recordOrArray instanceof LiveQueryArray) {
    return undefined;
  } else if (recordOrArray instanceof Model) {
    return { type: recordOrArray.type, id: recordOrArray.id } as RecordIdentity;
  }
  throw new Error();
}
