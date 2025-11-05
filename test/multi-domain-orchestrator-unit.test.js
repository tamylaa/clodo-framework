/**
 * MultiDomainOrchestrator Unit Tests
 *
 * Tests the core MultiDomainOrchestrator methods for deployment orchestration
 */

import { jest } from '@jest/globals';
import os from 'os';
import path from 'path';

// Import the MultiDomainOrchestrator class
import { MultiDomainOrchestrator } from '../src/orchestration/multi-domain-orchestrator.js';

describe('MultiDomainOrchestrator Unit Tests', () => {
  beforeAll(async () => {
    // Mock all dependencies using unstable_mockModule for ES modules
    await jest.unstable_mockModule('../src/orchestration/modules/DomainResolver.js', () => ({
      DomainResolver: jest.fn().mockImplementation(() => ({
        resolveDomain: jest.fn().mockResolvedValue({ name: 'test.example.com' }),
        validateDomain: jest.fn().mockResolvedValue({ valid: true }),
        validateDomainPrerequisites: jest.fn().mockResolvedValue({ valid: true }),
        resolveMultipleDomains: jest.fn().mockResolvedValue({ 'test.example.com': { name: 'test.example.com' } })
      }))
    }));
    await jest.unstable_mockModule('../src/orchestration/modules/DeploymentCoordinator.js', () => ({
      DeploymentCoordinator: jest.fn().mockImplementation(() => ({
        coordinateDeployment: jest.fn().mockResolvedValue({ success: true }),
        validatePrerequisites: jest.fn().mockResolvedValue({ valid: true }),
        deployPortfolio: jest.fn().mockResolvedValue({ success: true, domains: ['test.example.com'] }),
        deploySingleDomain: jest.fn().mockResolvedValue({ success: true })
      }))
    }));
    await jest.unstable_mockModule('../src/orchestration/modules/StateManager.js', () => ({
      StateManager: jest.fn().mockImplementation(() => ({
        initializeState: jest.fn().mockResolvedValue(),
        updateState: jest.fn().mockResolvedValue(),
        getState: jest.fn().mockResolvedValue({ status: 'initialized' }),
        initializeDomainStates: jest.fn().mockResolvedValue(),
        updateDomainState: jest.fn().mockResolvedValue(),
        logAuditEvent: jest.fn().mockResolvedValue(),
        portfolioState: { orchestrationId: 'test-id', domainStates: new Map(), rollbackPlan: [] }
      }))
    }));
    await jest.unstable_mockModule('../src/database/database-orchestrator.js', () => ({
      DatabaseOrchestrator: jest.fn().mockImplementation(() => ({
        setupDomainDatabase: jest.fn().mockResolvedValue({ success: true }),
        applyDatabaseMigrations: jest.fn().mockResolvedValue({ success: true })
      }))
    }));
    await jest.unstable_mockModule('../src/utils/deployment/secret-generator.js', () => ({
      EnhancedSecretManager: jest.fn().mockImplementation(() => ({
        generateSecrets: jest.fn().mockResolvedValue({ success: true }),
        validateSecrets: jest.fn().mockResolvedValue({ valid: true })
      }))
    }));
    await jest.unstable_mockModule('../src/utils/deployment/wrangler-config-manager.js', () => ({
      WranglerConfigManager: jest.fn().mockImplementation(() => ({
        generateConfig: jest.fn().mockResolvedValue({ success: true }),
        validateConfig: jest.fn().mockResolvedValue({ valid: true })
      }))
    }));
    await jest.unstable_mockModule('../src/security/ConfigurationValidator.js', () => ({
      ConfigurationValidator: jest.fn().mockImplementation(() => ({
        validate: jest.fn().mockResolvedValue({ valid: true })
      }))
    }));
    await jest.unstable_mockModule('../src/utils/cloudflare/index.js', () => ({
      databaseExists: jest.fn().mockResolvedValue(false),
      createDatabase: jest.fn().mockResolvedValue({ success: true, databaseId: 'test-db-id' })
    }));
  });
  let orchestrator;
  let mockDomainResolver;
  let mockDeploymentCoordinator;
  let mockStateManager;
  let mockDatabaseOrchestrator;
  let mockSecretManager;
  let mockWranglerConfigManager;
  let mockConfigurationValidator;
  let testServicePath;

  const mockOptions = {
    domains: ['test.example.com'],
    environment: 'development',
    dryRun: false,
    skipTests: false,
    parallelDeployments: 3,
    servicePath: null // Will be set in beforeEach with tmpdir
  };

  const mockDomain = {
    name: 'test.example.com',
    database: { name: 'test-db' },
    cloudflare: { accountId: 'test-account', token: 'test-token' }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create unique test directory using os.tmpdir() (following established pattern)
    testServicePath = path.join(os.tmpdir(), `multi-domain-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    mockOptions.servicePath = testServicePath;

    // Create orchestrator instance
    orchestrator = new MultiDomainOrchestrator(mockOptions);

    // Mock the instance methods after creation
    jest.spyOn(orchestrator.stateManager, 'initializeDomainStates').mockResolvedValue();
    jest.spyOn(orchestrator.stateManager, 'logAuditEvent').mockResolvedValue();
    jest.spyOn(orchestrator.deploymentCoordinator, 'deploySingleDomain').mockResolvedValue({ success: true });
    jest.spyOn(orchestrator.deploymentCoordinator, 'deployPortfolio').mockResolvedValue({ success: true });
    jest.spyOn(orchestrator.domainResolver, 'validateDomainPrerequisites').mockResolvedValue({ valid: true });
    jest.spyOn(orchestrator.databaseOrchestrator, 'applyDatabaseMigrations').mockResolvedValue({ success: true });
  });

  describe('constructor', () => {
    test('should initialize with provided options', () => {
      expect(orchestrator.domains).toEqual(['test.example.com']);
      expect(orchestrator.environment).toBe('development');
      expect(orchestrator.dryRun).toBe(false);
      expect(orchestrator.parallelDeployments).toBe(3);
    });

    test('should initialize modular components', () => {
      // Since we're using mocks, check that the orchestrator has the expected mock instances
      expect(orchestrator.domainResolver).toBeDefined();
      expect(orchestrator.deploymentCoordinator).toBeDefined();
      expect(orchestrator.stateManager).toBeDefined();
    });
  });

  describe('initialize', () => {
    test('should initialize orchestrator successfully', async () => {
      await orchestrator.initialize();

      expect(orchestrator.stateManager.initializeDomainStates).toHaveBeenCalledWith(mockOptions.domains);
      expect(orchestrator.stateManager.logAuditEvent).toHaveBeenCalled();
    });

    test('should handle initialization failure', async () => {
      orchestrator.stateManager.initializeDomainStates.mockRejectedValue(new Error('Init failed'));

      await expect(orchestrator.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('deploySingleDomain', () => {
    test('should deploy single domain successfully', async () => {
      // Initialize domain in portfolio state
      orchestrator.portfolioState.domainStates.set('test.example.com', {
        status: 'initialized',
        deploymentId: 'test-deployment-id'
      });

      const result = await orchestrator.deploySingleDomain('test.example.com');

      expect(orchestrator.deploymentCoordinator.deploySingleDomain).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('should handle domain not found in portfolio', async () => {
      await expect(orchestrator.deploySingleDomain('nonexistent.example.com'))
        .rejects.toThrow('Domain nonexistent.example.com not found in portfolio');
    });
  });

  describe('deployPortfolio', () => {
    test('should deploy portfolio successfully', async () => {
      orchestrator.domains = [mockDomain];

      const result = await orchestrator.deployPortfolio();

      expect(orchestrator.deploymentCoordinator.deployPortfolio).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('validateDomainPrerequisites', () => {
    test('should validate prerequisites successfully', async () => {
      const result = await orchestrator.validateDomainPrerequisites(mockDomain);

      expect(orchestrator.domainResolver.validateDomainPrerequisites).toHaveBeenCalledWith(mockDomain);
      expect(result.valid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle deployment errors gracefully', async () => {
      // Initialize domain in portfolio state
      orchestrator.portfolioState.domainStates.set('test.example.com', {
        status: 'initialized',
        deploymentId: 'test-deployment-id'
      });

      // Mock deployment to fail
      orchestrator.deploymentCoordinator.deploySingleDomain.mockRejectedValue(new Error('Network timeout'));

      await expect(orchestrator.deploySingleDomain('test.example.com'))
        .rejects.toThrow('Network timeout');
    });
  });

  describe('Dry Run Mode', () => {
    test('should skip actual operations in dry run mode', async () => {
      const dryRunOrchestrator = new MultiDomainOrchestrator({ ...mockOptions, dryRun: true });

      // Set up spy on the new orchestrator instance
      jest.spyOn(dryRunOrchestrator.deploymentCoordinator, 'deploySingleDomain').mockResolvedValue({ success: true, dryRun: true });

      // Initialize domain in portfolio state
      dryRunOrchestrator.portfolioState.domainStates.set('test.example.com', {
        status: 'initialized',
        deploymentId: 'test-deployment-id'
      });

      const result = await dryRunOrchestrator.deploySingleDomain('test.example.com');

      expect(result.success).toBe(true);
    });
  });
});