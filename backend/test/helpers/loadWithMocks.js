function loadWithMocks(targetPath, mocks = {}) {
  const resolvedTarget = require.resolve(targetPath);
  const originals = new Map();

  delete require.cache[resolvedTarget];

  Object.entries(mocks).forEach(([dependencyPath, exports]) => {
    const resolvedDependency = require.resolve(dependencyPath);
    originals.set(resolvedDependency, require.cache[resolvedDependency]);
    require.cache[resolvedDependency] = {
      id: resolvedDependency,
      filename: resolvedDependency,
      loaded: true,
      exports
    };
  });

  const loadedModule = require(resolvedTarget);

  return {
    module: loadedModule,
    restore() {
      delete require.cache[resolvedTarget];

      originals.forEach((entry, resolvedDependency) => {
        if (entry) {
          require.cache[resolvedDependency] = entry;
        } else {
          delete require.cache[resolvedDependency];
        }
      });
    }
  };
}

module.exports = { loadWithMocks };
