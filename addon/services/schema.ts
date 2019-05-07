import { getOwner } from '@ember/application';
import { Schema } from '@orbit/data';
import { clone } from '@orbit/utils';

export default {
  create(injections: Record<string, any> = {}) {
    if (!injections.models) {
      const app = getOwner(injections);
      let orbitConfig = app.lookup('ember-orbit-store:config');
      const models: Record<string, any> = {};
      const modelNames = injections.modelNames || Object.keys(orbitConfig.models);

      for (let modelName of modelNames) {
        models[modelName] = clone(orbitConfig.models[modelName]);
      }

      injections.models = models;
    }

    return new Schema(injections);
  }
}
