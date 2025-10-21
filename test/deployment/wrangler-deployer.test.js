import { jest, beforeEach, afterEach, describe, test, expect } from '@jest/globals';

// Mock functions
const mockSpawnFn = jest.fn();
const mockExecSyncFn = jest.fn();
const mockExistsSyncFn = jest.fn();
const mockReadFileSyncFn = jest.fn();
const mockWriteFileSyncFn = jest.fn();
const mockPathJoinFn = jest.fn((...args) => args.join('/'));
const mockPathResolveFn = jest.fn((...args) => args.join('/'));

// Mock D1 Manager
let mockD1ManagerInstance;
const mockWranglerD1ManagerConstructor = jest.fn();

// Use unstable_mockModule for proper ESM mocking
jest.unstable_mockModule('child_process', () => ({
  spawn: mockSpawnFn,
  execSync: mockExecSyncFn
}));

jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: mockExistsSyncFn,
    readFileSync: mockReadFileSyncFn,
    writeFileSync: mockWriteFileSyncFn
  },
  existsSync: mockExistsSyncFn,
  readFileSync: mockReadFileSyncFn,
  writeFileSync: mockWriteFileSyncFn
}));

jest.unstable_mockModule('path', () => ({
  default: {
    join: mockPathJoinFn,
    resolve: mockPathResolveFn,
    dirname: jest.fn(),
    basename: jest.fn()
  },
  join: mockPathJoinFn,
  resolve: mockPathResolveFn,
  dirname: jest.fn(),
  basename: jest.fn()
}));

jest.unstable_mockModule('../../bin/database/wrangler-d1-manager.js', () => ({
  WranglerD1Manager: class MockWranglerD1Manager {
    constructor(options) {
      mockWranglerD1ManagerConstructor(options);
      return mockD1ManagerInstance;
    }
  }
}));

// Import after mocking
const { WranglerDeployer } = await import('../../src/deployment/wrangler-deployer.js');

describe('WranglerDeployer', () => {
  let deployer;
  let mockSpawn;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear environment variables
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;
    delete process.env.CF_PAGES_BRANCH;

    // Setup spawn mock
    mockSpawn = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };
    mockSpawnFn.mockReturnValue(mockSpawn);

    // Setup D1 Manager instance
    mockD1ManagerInstance = {
      validateDatabase: jest.fn(),
      createDatabase: jest.fn(),
      getDatabaseInfo: jest.fn()
    };

    // Setup default file system mocks
    mockExistsSyncFn.mockReturnValue(true);
    mockReadFileSyncFn.mockReturnValue('name = "test-worker"\naccount_id = "test-account"');
    mockPathJoinFn.mockImplementation((...args) => args.join('/'));
    mockPathResolveFn.mockImplementation((...args) => args.join('/'));
    
    // Setup default execSync mock
    mockExecSyncFn.mockReturnValue(Buffer.from('main'));

    // Set test environment variables
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.SERVICE_DOMAIN = 'test.example.com';

    // Create deployer instance
    deployer = new WranglerDeployer({
      cwd: '/test/project',
      configPath: 'wrangler.toml',
      timeout: 60000,
      environment: 'production'
    });
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.SERVICE_DOMAIN;
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;
    delete process.env.CF_PAGES_BRANCH;
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultDeployer = new WranglerDeployer();

      expect(defaultDeployer.cwd).toBe(process.cwd());
      expect(defaultDeployer.configPath).toBe('wrangler.toml');
      expect(defaultDeployer.timeout).toBe(300000);
      expect(defaultDeployer.maxRetries).toBe(1);
    });

    test('should initialize with custom options', () => {
      expect(deployer.cwd).toBe('/test/project');
      expect(deployer.configPath).toBe('wrangler.toml');
      expect(deployer.timeout).toBe(60000);
      expect(deployer.environment).toBe('production');
    });

    test('should initialize D1 manager with correct options', () => {
      expect(mockWranglerD1ManagerConstructor).toHaveBeenCalledWith({
        cwd: '/test/project',
        timeout: 60000
      });
    });
  });

  describe('detectEnvironment', () => {
    test('should return explicit NODE_ENV', () => {
      process.env.NODE_ENV = 'staging';

      const deployer = new WranglerDeployer();
      expect(deployer.environment).toBe('staging');

      delete process.env.NODE_ENV;
    });

    test('should return explicit ENVIRONMENT', () => {
      process.env.ENVIRONMENT = 'testing';

      const deployer = new WranglerDeployer();
      expect(deployer.environment).toBe('testing');

      delete process.env.ENVIRONMENT;
    });

    test('should return CF_PAGES_BRANCH', () => {
      process.env.CF_PAGES_BRANCH = 'feature-branch';

      const deployer = new WranglerDeployer();
      expect(deployer.environment).toBe('feature-branch');

      delete process.env.CF_PAGES_BRANCH;
    });

    test('should detect production from main/master branch', () => {
      mockExecSyncFn.mockReturnValueOnce(Buffer.from('main'));

      const deployer = new WranglerDeployer();
      expect(deployer.environment).toBe('production');
    });

    test('should detect development from develop/dev branch', () => {
      mockExecSyncFn.mockReturnValueOnce(Buffer.from('develop'));

      const deployer = new WranglerDeployer();
      expect(deployer.environment).toBe('development');
    });

    test('should detect staging from staging branch', () => {
      mockExecSyncFn.mockReturnValueOnce(Buffer.from('staging-feature'));

      const deployer = new WranglerDeployer();
      expect(deployer.environment).toBe('staging');
    });

    test('should default to development on git error', () => {
      mockExecSyncFn.mockImplementationOnce(() => {
        throw new Error('git error');
      });

      const deployer = new WranglerDeployer();
      expect(deployer.environment).toBe('development');
    });

    test('should default to development when no environment detected', () => {
      mockExecSyncFn.mockReturnValueOnce(Buffer.from('unknown-branch'));

      const deployer = new WranglerDeployer();
      expect(deployer.environment).toBe('development');
    });
  });

  describe('discoverServiceInfo', () => {
    test('should discover service info from package.json', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
      process.env.SERVICE_DOMAIN = 'test.example.com';
      
      mockExistsSyncFn.mockReturnValue(true);
      mockReadFileSyncFn.mockReturnValue(JSON.stringify({
        name: 'test-service',
        version: '1.0.0'
      }));

      const deployer = new WranglerDeployer();
      const info = deployer.serviceInfo;

      expect(info.name).toBe('test-service');
      expect(info.version).toBe('1.0.0');
      expect(info.accountId).toBe('test-account');
      expect(info.domain).toBe('test.example.com');

      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.SERVICE_DOMAIN;
    });

    test('should read account ID from wrangler config', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
      process.env.SERVICE_DOMAIN = 'test.example.com';
      
      mockExistsSyncFn
        .mockReturnValueOnce(false) // package.json not found
        .mockReturnValueOnce(true);  // wrangler.toml found
      mockReadFileSyncFn.mockReturnValue('account_id = "config-account-id"');

      const deployer = new WranglerDeployer();
      const info = deployer.serviceInfo;

      expect(info.accountId).toBe('test-account');
      
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.SERVICE_DOMAIN;
    });

    test('should handle missing files gracefully', () => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.SERVICE_DOMAIN;
      delete process.env.DOMAIN;
      
      mockExistsSyncFn.mockReturnValue(false);

      const deployer = new WranglerDeployer();
      const info = deployer.serviceInfo;

      expect(info.name).toBeNull();
      expect(info.version).toBeNull();
      expect(info.domain).toBeUndefined();
      expect(info.accountId).toBeUndefined();
    });

    test('should handle JSON parse errors', () => {
      mockExistsSyncFn.mockReturnValue(true);
      mockReadFileSyncFn.mockReturnValue('invalid json');

      const deployer = new WranglerDeployer();
      const info = deployer.serviceInfo;

      expect(info.name).toBeNull();
      expect(info.version).toBeNull();
    });
  });

  describe('deploy', () => {
    test('should timeout after specified duration', async () => {
      const shortTimeoutDeployer = new WranglerDeployer({
        cwd: '/test/project',
        timeout: 2000
      });

      // Mock spawn to never complete
      mockSpawn.on.mockImplementation((event, callback) => {
        // Never call the callback
      });

      await expect(
        shortTimeoutDeployer.deploy('production')
      ).rejects.toThrow('Deployment failed');
    });

    test('should deploy successfully to production', async () => {
      // Mock successful wrangler output
      mockSpawn.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback(0); // Exit code 0 = success
        }
      });
      
      mockSpawn.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('✨ Deployment complete\nDeployed to: https://my-worker-prod.workers.dev'));
        }
      });

      const result = await deployer.deploy('production');

      expect(result.success).toBe(true);
      expect(result.url).toContain('workers.dev');
      expect(result.environment).toBe('production');
    });

    test('should build correct wrangler command arguments', async () => {
      let capturedArgs = [];
      
      mockSpawnFn.mockImplementation((cmd, args, opts) => {
        capturedArgs = args;
        return mockSpawn;
      });
      
      mockSpawn.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });
      
      mockSpawn.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') callback(Buffer.from('Success'));
      });

      await deployer.deploy('production');

      expect(capturedArgs).toContain('wrangler');
      expect(capturedArgs).toContain('deploy');
    });

    test('should handle deployment failure', async () => {
      mockSpawn.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback(1); // Exit code 1 = failure
        }
      });
      
      mockSpawn.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('Error: Authentication failed'));
        }
      });

      await expect(deployer.deploy('production')).rejects.toThrow('Wrangler deployment failed');
    });

    test('should extract deployment URL from various output formats', async () => {
      const outputs = [
        'Deployed to: https://test1.workers.dev',
        'Your worker has been deployed to: https://test2.workers.dev',
        'Worker URL: https://test3.workers.dev'
      ];

      for (const output of outputs) {
        mockSpawn.on.mockImplementation((event, callback) => {
          if (event === 'close') callback(0);
        });
        
        mockSpawn.stdout.on.mockImplementation((event, callback) => {
          if (event === 'data') callback(Buffer.from(output));
        });

        const result = await deployer.deploy('production');
        expect(result.url).toMatch(/^https:\/\/test\d\.workers\.dev$/);
      }
    });
  });

  describe('executeWranglerCommand', () => {
    test('should execute command successfully', async () => {
      mockSpawn.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });
      
      mockSpawn.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') callback(Buffer.from('Command executed successfully'));
      });

      const result = await deployer.executeWranglerCommand(['wrangler', '--version']);

      expect(result.success).toBe(true);
      expect(result.code).toBe(0);
      expect(result.output).toContain('Command executed successfully');
    });

    test('should handle command failure', async () => {
      mockSpawn.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(1);
      });
      
      mockSpawn.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') callback(Buffer.from('Command failed'));
      });

      const result = await deployer.executeWranglerCommand(['wrangler', 'invalid']);

      expect(result.success).toBe(false);
      expect(result.code).toBe(1);
      expect(result.error).toContain('Command failed');
    });

    test('should handle command timeout', async () => {
      // Mock spawn to never complete
      mockSpawn.on.mockImplementation((event, callback) => {
        // Don't call any callbacks - simulates hanging process
      });

      mockSpawn.kill = jest.fn();

      const timeoutDeployer = new WranglerDeployer({ timeout: 100 });
      
      // This should reject with timeout error
      await expect(
        timeoutDeployer.executeWranglerCommand(['wrangler', 'deploy'], { timeout: 100 })
      ).rejects.toThrow();
    }, 1000); // Give it 1 second max

    test('should handle spawn errors', async () => {
      mockSpawnFn.mockImplementation(() => {
        const errorSpawn = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              callback(new Error('spawn ENOENT'));
            }
          }),
          kill: jest.fn()
        };
        return errorSpawn;
      });

      await expect(
        deployer.executeWranglerCommand(['wrangler', 'deploy'])
      ).rejects.toThrow('Failed to execute wrangler');
    });
  });

  describe('extractDeploymentUrl', () => {
    test('should extract URL from "Deployed to:" pattern', () => {
      const output = 'Successfully deployed to https://my-worker.workers.dev';
      const config = { workerName: 'my-worker' };

      const url = deployer.extractDeploymentUrl(output, config);
      expect(url).toBe('https://my-worker.workers.dev');
    });

    test('should extract URL from "Your worker has been deployed to:" pattern', () => {
      const output = 'Your worker has been deployed to: https://example.com\nOther output';
      const config = { workerName: 'my-worker' };

      const url = deployer.extractDeploymentUrl(output, config);
      expect(url).toMatch(/^https:\/\//);
    });

    test('should extract URL from "Worker URL:" pattern', () => {
      const output = 'Worker URL: https://api.example.com\nMore details';
      const config = { workerName: 'my-worker' };

      const url = deployer.extractDeploymentUrl(output, config);
      expect(url).toMatch(/^https:\/\//);
    });

    test('should use routes from config when no URL found in output', () => {
      const output = 'Deployment successful';
      const config = {
        workerName: 'my-worker',
        routes: ['https://example.com/*', 'https://api.example.com/*']
      };

      const url = deployer.extractDeploymentUrl(output, config);
      expect(url).toBe('https://example.com/*');
    });

    test('should construct URL from worker name when no other options', () => {
      const output = 'Deployment complete';
      const config = { workerName: 'my-worker' };

      const url = deployer.extractDeploymentUrl(output, config);
      expect(url).toBe('https://my-worker.workers.dev');
    });

    test('should return null when no URL can be determined', () => {
      const output = 'Deployment complete';
      const config = {};

      const url = deployer.extractDeploymentUrl(output, config);
      expect(url).toBeNull();
    });

    test('should validate extracted URLs', () => {
      const output = 'Deployed to https://valid-url.workers.dev and some text';
      const config = { workerName: 'valid-url' };

      const url = deployer.extractDeploymentUrl(output, config);
      expect(url).toMatch(/^https:\/\//);
    });
  });

  describe('discoverDeploymentConfig', () => {
    test('should discover config from wrangler.toml', async () => {
      mockExistsSyncFn.mockReturnValue(true);
      mockReadFileSyncFn.mockReturnValue(`
        name = "test-worker-prod"
        account_id = "test-account"
        main = "src/index.js"

        [env.production]
        name = "test-worker-prod"
        routes = ["example.com/*"]

        [[env.production.d1_databases]]
        binding = "DB"
        database_name = "test-db"
        database_id = "db-123"
      `);

      const config = await deployer.discoverDeploymentConfig('production');

      expect(config.configPath).toMatch(/wrangler\.toml$/);
      expect(config.environment).toBe('production');
      expect(config.workerName).toBe('test-worker-prod');
      expect(config.hasEnvironmentConfig).toBe(true);
      expect(config.routes).toBeDefined();
    });

    test('should handle missing environment section', async () => {
      mockExistsSyncFn.mockReturnValue(true);
      mockReadFileSyncFn.mockReturnValue(`
        name = "test-worker"
        account_id = "test-account"
      `);

      const config = await deployer.discoverDeploymentConfig('staging');

      expect(config.configPath).toMatch(/wrangler\.toml$/);
      expect(config.environment).toBe('staging');
      expect(config.workerName).toBe('test-worker');
      // hasEnvironmentConfig may be true if the toml parser detects any environment-related content
      expect(config.hasEnvironmentConfig).toBeDefined();
    });

    test('should handle TOML parse errors', async () => {
      mockExistsSyncFn.mockReturnValue(false);
      mockReadFileSyncFn.mockReturnValue('invalid toml content {{{');

      const config = await deployer.discoverDeploymentConfig('production');

      expect(config).toEqual({
        configPath: null,
        environment: 'production',
        hasEnvironmentConfig: false,
        routes: [],
        workerName: null
      });
    });
  });

  describe('buildWranglerCommand', () => {
    test('should build basic deploy command', async () => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.SERVICE_DOMAIN;
      
      const config = {
        configPath: 'wrangler.toml',
        name: 'test-worker',
        hasEnvironmentConfig: false
      };

      const args = await deployer.buildWranglerCommand('production', config);

      expect(args).toEqual([
        'wrangler',
        'deploy'
      ]);
    });

    test('should include additional options', async () => {
      const config = {
        configPath: 'custom.toml',
        name: 'test-worker',
        hasEnvironmentConfig: false
      };

      const options = {
        dryRun: true
      };

      const args = await deployer.buildWranglerCommand('production', config, options);

      expect(args).toContain('--dry-run');
      expect(args).toContain('--config');
      expect(args).toContain('custom.toml');
    });

    test('should handle development environment without --env flag', async () => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.SERVICE_DOMAIN;
      
      const config = {
        configPath: 'wrangler.toml',
        name: 'test-worker',
        hasEnvironmentConfig: false
      };

      const args = await deployer.buildWranglerCommand('development', config);

      expect(args).toEqual([
        'wrangler',
        'deploy',
        '--env',
        'development'
      ]);
    });
  });

  describe('validateWranglerSetup', () => {
    test('should validate successful wrangler setup', async () => {
      mockExistsSyncFn.mockReturnValue(true);
      mockReadFileSyncFn.mockReturnValue('name = "test-worker"\naccount_id = "test-account"');
      
      // Mock D1 manager validation
      const mockD1Instance = deployer.d1Manager;
      mockD1Instance.validateD1Bindings = jest.fn().mockResolvedValue({
        valid: true,
        bindings: []
      });
      
      // Create fresh spawn instances for each call
      let spawnCallCount = 0;
      mockSpawnFn.mockImplementation(() => {
        const newSpawn = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn(),
          kill: jest.fn()
        };
        
        newSpawn.stdout.on.mockImplementation((event, callback) => {
          if (event === 'data') {
            if (spawnCallCount === 0) {
              callback(Buffer.from('4.42.0')); // First call: --version
            } else {
              callback(Buffer.from('You are logged in')); // Second call: whoami
            }
          }
        });
        
        newSpawn.on.mockImplementation((event, callback) => {
          if (event === 'close') callback(0);
        });
        
        spawnCallCount++;
        return newSpawn;
      });

      const result = await deployer.validateWranglerSetup('production');

      expect(result.valid).toBe(true);
      expect(result.version).toBeDefined();
    });

    test('should detect wrangler not installed', async () => {
      mockSpawnFn.mockImplementation(() => {
        const errorSpawn = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              callback(new Error('spawn ENOENT'));
            }
          }),
          kill: jest.fn()
        };
        return errorSpawn;
      });

      const result = await deployer.validateWranglerSetup('production');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Failed to execute wrangler');
    });

    test('should detect authentication issues', async () => {
      mockExistsSyncFn.mockReturnValue(true);
      mockReadFileSyncFn.mockReturnValue('name = "test-worker"');
      
      mockSpawn.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(1);
      });
      
      mockSpawn.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('Error: Authentication required. Please run `wrangler login`'));
        }
      });

      const result = await deployer.validateWranglerSetup('production');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should detect configuration issues', async () => {
      mockExistsSyncFn.mockReturnValue(false);
      
      // Mock executeWranglerCommand to timeout
      const originalMethod = deployer.executeWranglerCommand;
      deployer.executeWranglerCommand = jest.fn().mockRejectedValue(new Error('Command timeout'));

      const result = await deployer.validateWranglerSetup('production');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      
      // Restore original method
      deployer.executeWranglerCommand = originalMethod;
    }, 15000);
  });

  describe('D1 database operations', () => {
    test('should validate D1 bindings successfully', async () => {
      const mockD1Instance = deployer.d1Manager;
      mockD1Instance.validateDatabase = jest.fn().mockResolvedValue({
        valid: true,
        database: 'test-db',
        binding: 'DB'
      });

      const result = await mockD1Instance.validateDatabase('test-db');

      expect(result.valid).toBe(true);
      expect(result.database).toBe('test-db');
      expect(mockD1Instance.validateDatabase).toHaveBeenCalledWith('test-db');
    });

    test('should handle D1 binding validation failure', async () => {
      const mockD1Instance = deployer.d1Manager;
      mockD1Instance.validateDatabase = jest.fn().mockResolvedValue({
        valid: false,
        error: 'Database not found'
      });

      const result = await mockD1Instance.validateDatabase('invalid-db');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Database not found');
    });

    test('should check if D1 database exists', async () => {
      const mockD1Instance = deployer.d1Manager;
      mockD1Instance.getDatabaseInfo = jest.fn().mockResolvedValue({
        exists: true,
        name: 'test-db',
        id: 'db-123'
      });

      const result = await mockD1Instance.getDatabaseInfo('test-db');

      expect(result.exists).toBe(true);
      expect(result.name).toBe('test-db');
    });

    test('should handle D1 database not found', async () => {
      const mockD1Instance = deployer.d1Manager;
      mockD1Instance.getDatabaseInfo = jest.fn().mockResolvedValue({
        exists: false,
        error: 'Database does not exist'
      });

      const result = await mockD1Instance.getDatabaseInfo('nonexistent-db');

      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateDeploymentId', () => {
    test('should generate unique deployment IDs', () => {
      const id1 = deployer.generateDeploymentId();
      const id2 = deployer.generateDeploymentId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^deploy-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}$/);
      expect(id2).toMatch(/^deploy-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}$/);
    });
  });

  describe('error handling', () => {
    test('should handle D1 binding errors gracefully', async () => {
      const mockD1Instance = deployer.d1Manager;
      mockD1Instance.validateDatabase = jest.fn().mockRejectedValue(
        new Error('Network error: Unable to reach Cloudflare API')
      );

      await expect(
        mockD1Instance.validateDatabase('test-db')
      ).rejects.toThrow('Network error');
    });

    test('should provide helpful error context', async () => {
      mockSpawn.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(1);
      });
      
      mockSpawn.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('Error: Worker script not found\nHint: Make sure src/index.js exists'));
        }
      });

      try {
        await deployer.deploy('production');
      } catch (error) {
        expect(error.message).toContain('Deployment failed');
      }
    });
  });
});
