/**
 * MultiDomainOrchestrator Unit Tests
 *
 * Tests the core MultiDomainOrchestrator methods for deployment orchestration
 */

import { jest } from '@jest/globals';

// Mock all dependencies
jest.mock('../src/orchestration/modules/DomainResolver.js');
jest.mock('../src/orchestration/modules/DeploymentCoordinator.js');
jest.mock('../src/orchestration/modules/StateManager.js');
jest.mock('../src/database/database-orchestrator.js');
jest.mock('../src/utils/deployment/secret-generator.js');
jest.mock('../src/utils/deployment/wrangler-config-manager.js');
jest.mock('../src/security/ConfigurationValidator.js');
jest.mock('../src/utils/cloudflare/index.js');

// Import mocked modules
import { DomainResolver } from '../src/orchestration/modules/DomainResolver.js';
import { DeploymentCoordinator } from '../src/orchestration/modules/DeploymentCoordinator.js';
import { StateManager } from '../src/orchestration/modules/StateManager.js';
import { DatabaseOrchestrator } from '../src/database/database-orchestrator.js';
import { EnhancedSecretManager } from '../src/utils/deployment/secret-generator.js';
import { WranglerConfigManager } from '../src/utils/deployment/wrangler-config-manager.js';
import { ConfigurationValidator } from '../src/security/ConfigurationValidator.js';
import { createDatabase } from '../src/utils/cloudflare/index.js';

// Import the MultiDomainOrchestrator class
import { MultiDomainOrchestrator } from '../src/orchestration/multi-domain-orchestrator.js';

describe('MultiDomainOrchestrator Unit Tests', () => {
  let orchestrator;
  let mockDomainResolver;
  let mockDeploymentCoordinator;
  let mockStateManager;
  let mockDatabaseOrchestrator;
  let mockSecretManager;
  let mockWranglerConfigManager;
  let mockConfigurationValidator;

  const mockOptions = {
    domains: ['test.example.com'],
    environment: 'development',
    dryRun: false,
    skipTests: false,
    parallelDeployments: 3,
    servicePath: '/test/service'
  };

  const mockDomain = {
    name: 'test.example.com',
    database: { name: 'test-db' },
    cloudflare: { accountId: 'test-account', token: 'test-token' }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock instances
    mockDomainResolver = {
      resolveDomain: jest.fn().mockResolvedValue(mockDomain),
      validateDomain: jest.fn().mockResolvedValue({ valid: true }),
      validateDomainPrerequisites: jest.fn().mockResolvedValue({ valid: true }),
      resolveMultipleDomains: jest.fn().mockResolvedValue({ 'test.example.com': mockDomain })
    };

    mockDeploymentCoordinator = {
      coordinateDeployment: jest.fn().mockResolvedValue({ success: true }),
      validatePrerequisites: jest.fn().mockResolvedValue({ valid: true }),
      deployPortfolio: jest.fn().mockResolvedValue({ success: true, domains: ['test.example.com'] }),
      deploySingleDomain: jest.fn().mockResolvedValue({ success: true })
    };

    mockStateManager = {
      initializeState: jest.fn().mockResolvedValue(),
      updateState: jest.fn().mockResolvedValue(),
      getState: jest.fn().mockResolvedValue({ status: 'initialized' }),
      initializeDomainStates: jest.fn().mockResolvedValue(),
      updateDomainState: jest.fn().mockResolvedValue(),
      logAuditEvent: jest.fn().mockResolvedValue(),
      portfolioState: {
        orchestrationId: 'test-orchestration-id',
        domainStates: new Map([['test.example.com', { status: 'initialized' }]]),
        rollbackPlan: []
      }
    };

    mockDatabaseOrchestrator = {
      setupDomainDatabase: jest.fn().mockResolvedValue({ success: true }),
      applyDatabaseMigrations: jest.fn().mockResolvedValue({ success: true })
    };

    mockSecretManager = {
      generateSecrets: jest.fn().mockResolvedValue({ success: true }),
      validateSecrets: jest.fn().mockResolvedValue({ valid: true })
    };

    mockWranglerConfigManager = {
      generateConfig: jest.fn().mockResolvedValue({ success: true }),
      validateConfig: jest.fn().mockResolvedValue({ valid: true })
    };

    mockConfigurationValidator = {
      validate: jest.fn().mockResolvedValue({ valid: true })
    };

    // Mock constructors
    DomainResolver.mockImplementation(() => mockDomainResolver);
    DeploymentCoordinator.mockImplementation(() => mockDeploymentCoordinator);
    StateManager.mockImplementation(() => mockStateManager);
    DatabaseOrchestrator.mockImplementation(() => mockDatabaseOrchestrator);
    EnhancedSecretManager.mockImplementation(() => mockSecretManager);
    WranglerConfigManager.mockImplementation(() => mockWranglerConfigManager);
    ConfigurationValidator.mockImplementation(() => mockConfigurationValidator);

    // Mock cloudflare
    createDatabase.mockResolvedValue({ success: true, databaseId: 'test-db-id' });

    // Create orchestrator instance
    orchestrator = new MultiDomainOrchestrator(mockOptions);
  });

  describe('constructor', () => {
    test('should initialize with provided options', () => {
      expect(orchestrator.domains).toEqual(['test.example.com']);
      expect(orchestrator.environment).toBe('development');
      expect(orchestrator.dryRun).toBe(false);
      expect(orchestrator.parallelDeployments).toBe(3);
    });

    test('should initialize modular components', () => {
      expect(DomainResolver).toHaveBeenCalled();
      expect(DeploymentCoordinator).toHaveBeenCalled();
      expect(StateManager).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    test('should initialize orchestrator successfully', async () => {
      await orchestrator.initialize();

      expect(mockStateManager.initializeDomainStates).toHaveBeenCalledWith(mockOptions.domains);
      expect(mockStateManager.logAuditEvent).toHaveBeenCalled();
    });

    test('should handle initialization failure', async () => {
      mockStateManager.initializeDomainStates.mockRejectedValue(new Error('Init failed'));

      await expect(orchestrator.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('deploySingleDomain', () => {
    test('should deploy single domain successfully', async () => {
      mockDeploymentCoordinator.deploySingleDomain.mockResolvedValue({ success: true });

      const result = await orchestrator.deploySingleDomain('test.example.com');

      expect(mockDeploymentCoordinator.deploySingleDomain).toHaveBeenCalled();
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
      mockDomainResolver.resolveDomain.mockResolvedValue(mockDomain);
      mockDeploymentCoordinator.validatePrerequisites.mockResolvedValue({ valid: true });
      mockDatabaseOrchestrator.applyDatabaseMigrations = jest.fn().mockResolvedValue({ success: true });
      mockDeploymentCoordinator.coordinateDeployment.mockResolvedValue({ success: true });

      const result = await orchestrator.deployPortfolio();

      expect(result.success).toBe(true);
      expect(result.domains).toHaveLength(1);
    });
  });

  describe('validateDomainPrerequisites', () => {
    test('should validate prerequisites successfully', async () => {
      const result = await orchestrator.validateDomainPrerequisites(mockDomain);

      expect(mockDomainResolver.validateDomainPrerequisites).toHaveBeenCalledWith(mockDomain);
      expect(result.valid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle deployment errors gracefully', async () => {
      mockDeploymentCoordinator.deploySingleDomain.mockRejectedValue(new Error('Network timeout'));

      await expect(orchestrator.deploySingleDomain('test.example.com'))
        .rejects.toThrow('Network timeout');
    });
  });

  describe('Dry Run Mode', () => {
    test('should skip actual operations in dry run mode', async () => {
      const dryRunOrchestrator = new MultiDomainOrchestrator({ ...mockOptions, dryRun: true });
      mockDeploymentCoordinator.deploySingleDomain.mockResolvedValue({ success: true, dryRun: true });

      const result = await dryRunOrchestrator.deploySingleDomain('test.example.com');

      expect(createDatabase).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});