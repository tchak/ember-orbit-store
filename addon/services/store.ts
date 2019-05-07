import Store from 'ember-orbit-store';

export default {
  create(injections: Record<string, any> = {}) {
    return new Store(injections.source);
  }
}
