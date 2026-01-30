import baseConfig from './jest.config.js';

// Create a full test config that removes the `clodo-dev-site` ignore so the
// nightly job (or a maintainer) can run the full frontend/integration suites.

const fullIgnore = (baseConfig.testPathIgnorePatterns || []).filter(p => !/clodo-dev-site/.test(p));

export default {
  ...baseConfig,
  testPathIgnorePatterns: fullIgnore
};
