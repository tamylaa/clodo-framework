const mockResolve = jest.fn();
const mockDirname = jest.fn();

const path = {
  resolve: mockResolve,
  dirname: mockDirname
};

export default path;