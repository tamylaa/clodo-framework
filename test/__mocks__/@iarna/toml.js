const mockParse = jest.fn(() => ({}));
const mockStringify = jest.fn(() => 'mocked toml content');

const toml = {
  parse: mockParse,
  stringify: mockStringify
};

export default toml;