export const createDomainConfigSchema = jest.fn(() => ({}));
export const validateDomainConfig = jest.fn(() => ({ isValid: true }));
export const createDomainRegistry = jest.fn(() => ({
  get: jest.fn((name) => ({ name, domain: `${name}.com` })),
  list: jest.fn(() => []),
  validateAll: jest.fn(),
  add: jest.fn(),
  remove: jest.fn()
}));