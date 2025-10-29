export const MultiDomainOrchestrator = jest.fn().mockImplementation(() => ({
  initialize: jest.fn().mockResolvedValue(),
  executeDeployment: jest.fn().mockResolvedValue({ success: true })
}));