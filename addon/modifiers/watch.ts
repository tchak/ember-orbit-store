import makeFunctionalModifier from 'ember-functional-modifiers';
import Store, { Record } from 'ember-orbit-store';

export default makeFunctionalModifier(
  { services: ['store'] },
  (store: Store, _: Element, [record]: Record[]) => {
    const subscription = store.watch(record);
    return () => subscription.unsubscribe();
  }
);
