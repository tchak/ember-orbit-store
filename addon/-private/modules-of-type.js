export default function modulesOfType(prefix, type) {
  // eslint-disable-next-line no-useless-escape
  const regex = new RegExp('^' + prefix + '\/' + type + '\/?\/');
  const moduleNames = Object.keys(self.requirejs._eak_seen);
  const found = [];

  for (let moduleName of moduleNames) {
    let matches = regex.exec(moduleName);
    if (matches && matches.length === 1) {
      // eslint-disable-next-line no-useless-escape
      let name = moduleName.match(/[^\/]+\/?$/)[0];
      found.push(name);
    }
  }

  return found;
}
