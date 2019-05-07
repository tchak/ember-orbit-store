import Coordinator from '@orbit/coordinator';
import { getOwner } from '@ember/application';

import modulesOfType from '../-private/modules-of-type';

export default {
  create(injections: Record<string, any> = {}) {
    const owner = getOwner(injections);

    let sourceNames;
    if (injections.sourceNames) {
      sourceNames = injections.sourceNames;
      delete injections.sourceNames;
    } else {
      sourceNames = modulesOfType(owner.base.modulePrefix, 'sources');
      sourceNames.push('store');
    }

    let strategyNames;
    if (injections.strategyNames) {
      strategyNames = injections.strategyNames;
      delete injections.strategyNames;
    } else {
      strategyNames = modulesOfType(owner.base.modulePrefix, 'strategies');
    }

    injections.sources = sourceNames.map((name: string) => owner.lookup(`source:${name}`));
    injections.strategies = strategyNames.map((name: string) => owner.lookup(`strategy:${name}`));

    return new Coordinator(injections);
  }
}


