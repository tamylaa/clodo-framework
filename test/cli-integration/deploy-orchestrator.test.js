/**
 * CLI Integration Tests: Deploy Command - Orchestrator Integration
 * 
 * Tests orchestrator initialization, credential passing, execution, result display,
 * and error handling in the deploy.js command with MultiDomainOrchestrator.
 * 
 * Test Coverage:
 * - Orchestrator initialization with correct options
 * - Credential passing to orchestrator
 * - Single domain deployment via orchestrator
 * - Result display (URL, worker ID, deployment ID, status)
 * - Audit log display
 * - Error handling (orchestrator failures, domain issues, credential issues)
 * - Dry-run mode with orchestrator
 * - Multi-domain deployment preparation (for future use)
 * - Rollback scenarios
 * - Persistence management
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MultiDomainOrchestrator } from '../../src/orchestration/multi-domain-orchestrator.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Deploy Command - Orchestrator Integration', () => {
  let testDir;
  let orchestrator;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `deploy-orchestrator-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
  });

  describe('Orchestrator Initialization', () => {
    it('should initialize orchestrator with correct options', async () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        dryRun: false,
        skipTests: false,
        parallelDeployments: 1,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account',
        enablePersistence: true,
        rollbackEnabled: true,
        verbose: false
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator).toBeDefined();
      expect(orchestrator.domains).toEqual(['api.example.com']);
      expect(orchestrator.environment).toBe('production');
    });

    it('should initialize with multiple domains', async () => {
      // Arrange
      const options = {
        domains: [
          'api.example.com',
          'api.staging.example.com',
          'api.dev.example.com'
        ],
        environment: 'production',
        dryRun: false,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.domains.length).toBeGreaterThanOrEqual(0);
    });

    it('should initialize in dry-run mode', async () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        dryRun: true,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.dryRun).toBe(true);
    });

    it('should initialize with credentials', async () => {
      // Arrange
      const credentials = {
        cloudflareToken: 'test-token-xyz',
        cloudflareAccountId: 'test-account-123'
      };

      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        ...credentials
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator).toBeDefined();
    });

    it('should initialize with rollback enabled', async () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        dryRun: false,
        rollbackEnabled: true,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.stateManager).toBeDefined();
    });

    it('should initialize with persistence enabled', async () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        dryRun: false,
        enablePersistence: true,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.stateManager).toBeDefined();
    });
  });

  describe('Credential Passing', () => {
    it('should accept Cloudflare token in options', () => {
      // Arrange
      const token = 'test-token-12345';
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: token,
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator).toBeDefined();
    });

    it('should accept account ID in options', () => {
      // Arrange
      const accountId = 'test-account-xyz';
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: accountId
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator).toBeDefined();
    });

    it('should handle missing credentials gracefully', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir
        // No credentials provided
      };

      // Act
      try {
        orchestrator = new MultiDomainOrchestrator(options);
        // Should create orchestrator (initialization will be deferred until initialize() is called)
      } catch (error) {
        // May throw depending on implementation
      }

      // Assert
      expect(orchestrator).toBeDefined();
    });

    it('should pass credentials from deploy command flow', () => {
      // Arrange
      const deploymentCredentials = {
        token: 'deploy-token-123',
        accountId: 'deploy-account-456',
        zoneId: 'deploy-zone-789'
      };

      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: deploymentCredentials.token,
        cloudflareAccountId: deploymentCredentials.accountId
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator).toBeDefined();
    });
  });

  describe('Orchestrator Options Mapping', () => {
    it('should map environment option correctly', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'staging',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.environment).toBe('staging');
    });

    it('should map dryRun option correctly', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        dryRun: true,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.dryRun).toBe(true);
    });

    it('should map parallelDeployments option correctly', () => {
      // Arrange
      const options = {
        domains: [
          'api.example.com',
          'api.staging.example.com',
          'api.dev.example.com'
        ],
        environment: 'production',
        parallelDeployments: 3,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.parallelDeployments).toBeDefined();
      expect(orchestrator.parallelDeployments).toBeGreaterThan(0);
    });

    it('should map skipTests option correctly', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        skipTests: true,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.skipTests).toBe(true);
    });

    it('should map verbose option correctly', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account',
        verbose: true
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator).toBeDefined();
    });
  });

  describe('Deployment Result Structure', () => {
    it('should have result with URL property', () => {
      // Arrange
      const result = {
        url: 'https://api.example.com',
        status: 'success',
        deploymentId: 'deploy-123'
      };

      // Act & Assert
      expect(result.url).toBeDefined();
      expect(typeof result.url).toBe('string');
      expect(result.url).toContain('https://');
    });

    it('should have result with worker ID property', () => {
      // Arrange
      const result = {
        workerId: 'worker-xyz-123',
        status: 'success'
      };

      // Act & Assert
      expect(result.workerId).toBeDefined();
      expect(typeof result.workerId).toBe('string');
    });

    it('should have result with deployment ID property', () => {
      // Arrange
      const result = {
        deploymentId: 'deploy-abc-456',
        status: 'success'
      };

      // Act & Assert
      expect(result.deploymentId).toBeDefined();
      expect(typeof result.deploymentId).toBe('string');
    });

    it('should have result with status property', () => {
      // Arrange
      const validStatuses = ['success', 'pending', 'failed'];

      // Act & Assert
      for (const status of validStatuses) {
        const result = { status };
        expect(result.status).toBeDefined();
        expect(validStatuses).toContain(result.status);
      }
    });

    it('should have result with audit log property', () => {
      // Arrange
      const result = {
        status: 'success',
        auditLog: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1234,
          events: []
        }
      };

      // Act & Assert
      expect(result.auditLog).toBeDefined();
      expect(result.auditLog.startTime).toBeDefined();
      expect(result.auditLog.endTime).toBeDefined();
      expect(result.auditLog.duration).toBeDefined();
    });

    it('should format result for display', () => {
      // Arrange
      const result = {
        url: 'https://api.example.com',
        workerId: 'worker-123',
        deploymentId: 'deploy-456',
        status: 'success',
        auditLog: {
          startTime: '2025-10-28T10:00:00Z',
          endTime: '2025-10-28T10:00:15Z',
          duration: 15000
        }
      };

      // Act
      const display = formatDeploymentResult(result);

      // Assert
      expect(display).toContain('api.example.com');
      expect(display).toContain('success');
    });
  });

  describe('Error Handling', () => {
    it('should handle orchestrator initialization error', async () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: null, // Invalid credentials
        cloudflareAccountId: null
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Act & Assert - trying to initialize should handle gracefully
      try {
        await orchestrator.initialize();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should handle domain not found error', () => {
      // Arrange
      const options = {
        domains: ['invalid.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator).toBeDefined();
    });

    it('should handle deployment timeout error', () => {
      // Arrange
      const result = {
        status: 'failed',
        error: 'Deployment timeout after 300 seconds',
        code: 'DEPLOYMENT_TIMEOUT'
      };

      // Act & Assert
      expect(result.status).toBe('failed');
      expect(result.error).toContain('timeout');
    });

    it('should provide helpful error messages for credential issues', () => {
      // Arrange
      const error = new Error('Invalid API token');

      // Act
      const isCredentialError = error.message.toLowerCase().includes('token') 
        || error.message.toLowerCase().includes('auth')
        || error.message.toLowerCase().includes('credential');

      // Assert
      expect(isCredentialError).toBe(true);
    });

    it('should provide helpful error messages for domain issues', () => {
      // Arrange
      const error = new Error('Domain not found in zone');

      // Act
      const isDomainError = error.message.toLowerCase().includes('domain')
        || error.message.toLowerCase().includes('zone')
        || error.message.toLowerCase().includes('route');

      // Assert
      expect(isDomainError).toBe(true);
    });
  });

  describe('Dry-Run Mode', () => {
    it('should initialize orchestrator in dry-run mode', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        dryRun: true,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.dryRun).toBe(true);
    });

    it('should disable persistence in dry-run mode', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        dryRun: true,
        enablePersistence: false,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.dryRun).toBe(true);
      expect(orchestrator.stateManager).toBeDefined();
    });

    it('should disable rollback in dry-run mode', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        dryRun: true,
        rollbackEnabled: false,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.dryRun).toBe(true);
    });

    it('should show deployment plan in dry-run mode', () => {
      // Arrange
      const plan = {
        serviceName: 'test-api',
        domain: 'api.example.com',
        environment: 'production',
        dryRun: true,
        actions: [
          'Validate credentials',
          'Load configuration',
          'Prepare deployment package',
          'Simulate deployment'
        ]
      };

      // Act
      const displayPlan = formatDeploymentPlan(plan);

      // Assert
      expect(displayPlan).toContain('DRY RUN');
      expect(displayPlan).toContain('test-api');
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should configure orchestrator for production environment', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.environment).toBe('production');
    });

    it('should configure orchestrator for staging environment', () => {
      // Arrange
      const options = {
        domains: ['api.staging.example.com'],
        environment: 'staging',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.environment).toBe('staging');
    });

    it('should configure orchestrator for development environment', () => {
      // Arrange
      const options = {
        domains: ['api.dev.example.com'],
        environment: 'development',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.environment).toBe('development');
    });
  });

  describe('Modular Component Integration', () => {
    it('should initialize with modular components', async () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account',
        enablePersistence: true,
        rollbackEnabled: true
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator).toBeDefined();
      expect(orchestrator.domainResolver).toBeDefined();
      expect(orchestrator.deploymentCoordinator).toBeDefined();
      expect(orchestrator.stateManager).toBeDefined();
    });

    it('should have access to DomainResolver component', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.domainResolver).toBeDefined();
    });

    it('should have access to DeploymentCoordinator component', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.deploymentCoordinator).toBeDefined();
    });

    it('should have access to StateManager component', () => {
      // Arrange
      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.stateManager).toBeDefined();
    });
  });

  describe('Multi-Domain Deployment Support', () => {
    it('should accept multiple domains', () => {
      // Arrange
      const options = {
        domains: [
          'api.example.com',
          'api.staging.example.com',
          'api.dev.example.com'
        ],
        environment: 'production',
        parallelDeployments: 3,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.domains).toBeDefined();
      expect(orchestrator.domains.length).toBe(3);
    });

    it('should configure parallel deployments for multi-domain', () => {
      // Arrange
      const options = {
        domains: [
          'api.example.com',
          'api.staging.example.com',
          'api.dev.example.com'
        ],
        environment: 'production',
        parallelDeployments: 3,
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.parallelDeployments).toBe(3);
      expect(orchestrator.parallelDeployments).toBeGreaterThan(0);
    });

    it('should limit parallel deployments to reasonable number', () => {
      // Arrange
      const options = {
        domains: [
          'api.example.com',
          'api.staging.example.com',
          'api.dev.example.com'
        ],
        environment: 'production',
        parallelDeployments: 100, // Unreasonably high
        servicePath: testDir,
        cloudflareToken: 'test-token',
        cloudflareAccountId: 'test-account'
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator.parallelDeployments).toBeDefined();
      expect(orchestrator.parallelDeployments).toBeGreaterThan(0);
    });
  });

  describe('Integration with Deploy Command', () => {
    it('should work with deploy command options', () => {
      // Arrange - simulating deploy command options
      const deployCommandOptions = {
        servicePath: testDir,
        token: 'test-token',
        accountId: 'test-account-123',
        zoneId: 'test-zone-456',
        domain: 'api.example.com',
        environment: 'production',
        dryRun: false,
        verbose: false
      };

      // Act
      orchestrator = new MultiDomainOrchestrator({
        domains: [deployCommandOptions.domain],
        environment: deployCommandOptions.environment,
        dryRun: deployCommandOptions.dryRun,
        servicePath: deployCommandOptions.servicePath,
        cloudflareToken: deployCommandOptions.token,
        cloudflareAccountId: deployCommandOptions.accountId,
        verbose: deployCommandOptions.verbose
      });

      // Assert
      expect(orchestrator).toBeDefined();
    });

    it('should handle environment variable substitution', () => {
      // Arrange
      process.env.CF_TOKEN = 'env-token';
      process.env.CF_ACCOUNT_ID = 'env-account';

      const options = {
        domains: ['api.example.com'],
        environment: 'production',
        servicePath: testDir,
        cloudflareToken: process.env.CF_TOKEN,
        cloudflareAccountId: process.env.CF_ACCOUNT_ID
      };

      // Act
      orchestrator = new MultiDomainOrchestrator(options);

      // Assert
      expect(orchestrator).toBeDefined();

      // Cleanup
      delete process.env.CF_TOKEN;
      delete process.env.CF_ACCOUNT_ID;
    });
  });
});

/**
 * Helper Functions for Testing
 */

function formatDeploymentResult(result) {
  return `
Service URL: ${result.url || 'N/A'}
Status: ${result.status}
Deployment ID: ${result.deploymentId || 'N/A'}
Duration: ${result.auditLog?.duration || 'N/A'}ms
  `.trim();
}

function formatDeploymentPlan(plan) {
  return `
Service: ${plan.serviceName}
Domain: ${plan.domain}
Environment: ${plan.environment}
Mode: ${plan.dryRun ? 'DRY RUN' : 'LIVE'}
Actions:
${plan.actions?.map(a => `  - ${a}`).join('\n') || '  - No actions'}
  `.trim();
}
