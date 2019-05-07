import OrbitStore from '@orbit/store';

export function initialize(application) {
  let orbitConfig = {};
  let config = application.resolveRegistration('config:environment') || {};
  config.orbit = config.orbit || {};
  orbitConfig.models = config.orbit.models || {};
  application.register('ember-orbit-store:config', orbitConfig, {
    instantiate: false
  });

  // Customize pluralization rules
  if (
    application.__registry__ &&
    application.__registry__.resolver &&
    application.__registry__.resolver.pluralizedTypes
  ) {
    application.__registry__.resolver.pluralizedTypes.source = 'sources';
    application.__registry__.resolver.pluralizedTypes.strategy = 'strategies';
  }

  // Store source (which is injected in store service)
  application.register('source:store', {
    create(injections = {}) {
      return new OrbitStore(injections);
    }
  });
  application.inject('service:store', 'source', 'source:store');

  // Injections to all sources
  application.inject('source', 'schema', 'service:schema');
  application.inject('source', 'keyMap', 'service:keyMap');
}

export default {
  name: 'ember-orbit-store',
  initialize
};
