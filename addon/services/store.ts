import Store, { StoreSettings, Model } from 'ember-orbit-store';

export default {
  create(injections: Record<string, any> = {}) {
    injections.ModelClass = Model;
    return new Store(injections as StoreSettings<Model>);
  }
}
