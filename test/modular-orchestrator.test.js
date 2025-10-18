import { describe, test, expect, beforeEach } from '@jest/globals';
import { MultiDomainOrchestrator } from '../src/orchestration/multi-domain-orchestrator.js';

describe('Modular MultiDomainOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new MultiDomainOrchestrator({
      domains: ['example.com', 'test.dev'],
      environment: 'staging',
      parallelDeployments: 2,
      dryRun: true,
      skipTests: false
    });
  });

  test('should initialize modular orchestrator correctly', () => {
    expect(orchestrator).toBeDefined();
    expect(orchestrator.domainResolver).toBeDefined();
    expect(orchestrator.deploymentCoordinator).toBeDefined();
    expect(orchestrator.stateManager).toBeDefined();
    expect(orchestrator.environment).toBe('staging');
  });

  test('should have modular components with correct methods', () => {
    // Test DomainResolver
    expect(typeof orchestrator.domainResolver.validateDomainPrerequisites).toBe('function');
    
    // Test DeploymentCoordinator
    expect(typeof orchestrator.deploymentCoordinator.deploySingleDomain).toBe('function');
    expect(typeof orchestrator.deploymentCoordinator.deployPortfolio).toBe('function');
    
    // Test StateManager
    expect(typeof orchestrator.stateManager.getDomainState).toBe('function');
    expect(typeof orchestrator.stateManager.updateDomainState).toBe('function');
  });

  test('should handle single domain deployment', async () => {
    // Initialize first to set up domain states
    await orchestrator.initialize();
    const result = await orchestrator.deploySingleDomain('example.com');
    expect(result).toBeDefined();
    expect(result.domain).toBe('example.com');
    expect(result.success).toBe(true);
  });

  test('should handle portfolio deployment', async () => {
    const portfolioResult = await orchestrator.deployPortfolio();
    expect(portfolioResult).toBeDefined();
    expect(portfolioResult.summary).toBeDefined();
    expect(portfolioResult.summary.successRate).toBeDefined();
  });

  test('should validate domain prerequisites', async () => {
    const validation = await orchestrator.validateDomainPrerequisites('test.example.com');
    expect(validation).toBeDefined();
    expect(typeof validation.valid).toBe('boolean');
  });

  test('should get domain state via stateManager', () => {
    const state = orchestrator.stateManager.getDomainState('example.com');
    expect(state).toBeDefined();
  });
});
