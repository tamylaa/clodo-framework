const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn(() => false);
const mockMkdirSync = jest.fn();
const mockReaddirSync = jest.fn(() => []);
const mockStatSync = jest.fn(() => ({ isDirectory: () => true }));

const fs = {
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync
};

export default fs;
