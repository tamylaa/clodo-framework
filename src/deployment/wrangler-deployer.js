import { spawn } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { WranglerD1Manager } from '../../bin/database/wrangler-d1-manager.js';

/**
 * WranglerDeployer - Executes actual Cloudflare Workers deployments using wrangler CLI
 * Provides integration between Clodo Framework orchestration and wrangler deployment
 * 
 * Now integrated with WranglerD1Manager for comprehensive D1 database operations
 */
export class WranglerDeployer {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.configPath = options.configPath || 'wrangler.toml';
    this.timeout = options.timeout || 300000; // 5 minutes
    this.maxRetries = options.maxRetries || 1;
    this.environment = options.environment || this.detectEnvironment();
    this.serviceInfo = options.serviceInfo || this.discoverServiceInfo();
    
    // Initialize D1 manager for database operations
    this.d1Manager = new WranglerD1Manager({
      cwd: this.cwd,
      timeout: 60000 // 1 minute for D1 operations
    });
  }

  /**
   * Detect deployment environment from various sources
   * @returns {string} Detected environment
   */
  detectEnvironment() {
    // Priority: explicit option > env var > git branch > default
    if (process.env.NODE_ENV) return process.env.NODE_ENV;
    if (process.env.ENVIRONMENT) return process.env.ENVIRONMENT;
    if (process.env.CF_PAGES_BRANCH) return process.env.CF_PAGES_BRANCH;

    // Try to detect from git branch
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: this.cwd })
        .toString().trim();

      if (branch === 'main' || branch === 'master') return 'production';
      if (branch === 'develop' || branch === 'dev') return 'development';
      if (branch.includes('staging')) return 'staging';

      return 'development';
    } catch {
      return 'development';
    }
  }

  /**
   * Discover service information from project files
   * @returns {Object} Service information
   */
  discoverServiceInfo() {
    const info = {
      name: null,
      version: null,
      domain: null,
      accountId: null
    };

    try {
      // Read package.json
      const packagePath = path.join(this.cwd, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        info.name = packageJson.name;
        info.version = packageJson.version;
      }

      // Read environment variables
      info.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      info.domain = process.env.SERVICE_DOMAIN || process.env.DOMAIN;

      // Try to read from wrangler config
      const configPath = path.join(this.cwd, 'wrangler.toml');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const accountMatch = content.match(/account_id\s*=\s*["']([^"']+)["']/);
        if (accountMatch) {
          info.accountId = info.accountId || accountMatch[1];
        }
      }

    } catch (error) {
      // Ignore discovery errors
    }

    return info;
  }

  /**
   * Deploy worker to specified environment with intelligent configuration discovery
   * @param {string} environment - Environment to deploy to (production, staging, development)
   * @param {Object} options - Additional deployment options
   * @returns {Promise<Object>} Deployment result with URL and metadata
   */
  async deploy(environment = 'production', options = {}) {
    const startTime = Date.now();

    try {
      console.log(`   🚀 Executing wrangler deploy --env ${environment}`);

      // Discover deployment configuration intelligently
      const deployConfig = await this.discoverDeploymentConfig(environment);

      // Build wrangler command arguments based on discovered config
      const args = await this.buildWranglerCommand(environment, deployConfig, options);

      console.log(`   📋 Command: npx ${args.join(' ')}`);
      console.log(`   📁 Config: ${deployConfig.configPath}`);
      console.log(`   🌍 Environment: ${environment}`);

      // Execute wrangler command
      const result = await this.executeWranglerCommand(args, {
        cwd: this.cwd,
        timeout: this.timeout
      });

      const duration = Date.now() - startTime;

      if (result.success) {
        // Extract deployment URL with enhanced parsing
        const deploymentUrl = this.extractDeploymentUrl(result.output, deployConfig);

        console.log(`   ✅ Deployment successful in ${duration}ms`);
        console.log(`   🌐 URL: ${deploymentUrl}`);

        return {
          success: true,
          url: deploymentUrl,
          environment,
          duration,
          deploymentId: this.generateDeploymentId(),
          output: result.output,
          config: deployConfig,
          timestamp: new Date().toISOString()
        };
      } else {
        console.error(`   ❌ Deployment failed after ${duration}ms`);
        console.error(`   Error: ${result.error}`);

        throw new Error(`Wrangler deployment failed: ${result.error}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`   ❌ Deployment error after ${duration}ms: ${error.message}`);

      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Execute wrangler command and capture output
   * @param {Array<string>} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command execution result
   */
  async executeWranglerCommand(args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('npx', args, {
        cwd: options.cwd || this.cwd,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
        timeout: options.timeout || this.timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`   ${output.trim()}`);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`   ${output.trim()}`);
      });

      child.on('close', (code) => {
        const success = code === 0;
        resolve({
          success,
          code,
          output: stdout,
          error: stderr,
          fullOutput: stdout + stderr
        });
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute wrangler: ${error.message}`));
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Wrangler command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  /**
   * Extract deployment URL from wrangler output with intelligent parsing
   * @param {string} output - Wrangler command output
   * @param {Object} config - Deployment configuration
   * @returns {string|null} Deployment URL or null if not found
   */
  extractDeploymentUrl(output, config) {
    // Strategy 1: Look for explicit URL patterns in output
    const urlPatterns = [
      /https:\/\/[^\s\n]+/g,
      /Deployed to:\s*(https:\/\/[^\s\n]+)/i,
      /Your worker has been deployed to:\s*(https:\/\/[^\s\n]+)/i,
      /Worker URL:\s*(https:\/\/[^\s\n]+)/i,
      /Available at:\s*(https:\/\/[^\s\n]+)/i
    ];

    for (const pattern of urlPatterns) {
      const matches = output.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const url = match.replace(/^.*?https:\/\//, 'https://').split(/[>\s\n]/)[0];
          if (url.startsWith('https://') && this.isValidDeploymentUrl(url, config)) {
            return url;
          }
        }
      }
    }

    // Strategy 2: Use routes from config if available
    if (config.routes && config.routes.length > 0) {
      for (const route of config.routes) {
        if (route.startsWith('https://')) {
          return route;
        }
      }
    }

    // Strategy 3: Construct URL from worker name
    if (config.workerName) {
      // Check if it's already a full domain
      if (config.workerName.includes('.')) {
        return `https://${config.workerName}`;
      }

      // Construct workers.dev URL
      return `https://${config.workerName}.workers.dev`;
    }

    // Strategy 4: Fallback URL construction from environment and output
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('https://') && (
        line.includes('.workers.dev') ||
        line.includes(config.environment) ||
        line.includes('deployed')
      )) {
        const urlMatch = line.match(/https:\/\/[^\s\n>]+/);
        if (urlMatch) {
          return urlMatch[0];
        }
      }
    }

    return null;
  }

  /**
   * Validate if a URL is a likely deployment URL
   * @param {string} url - URL to validate
   * @param {Object} config - Deployment config
   * @returns {boolean} True if URL appears valid for deployment
   */
  isValidDeploymentUrl(url, config) {
    try {
      const urlObj = new URL(url);

      // Must be HTTPS
      if (urlObj.protocol !== 'https:') return false;

      // Should be workers.dev or custom domain
      const hostname = urlObj.hostname;
      return hostname.includes('.workers.dev') ||
             hostname.includes('.dev') ||
             hostname.includes(config.environment) ||
             (config.workerName && hostname.includes(config.workerName));
    } catch {
      return false;
    }
  }

  /**
   * Generate unique deployment ID
   * @returns {string} Unique deployment identifier
   */
  generateDeploymentId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `deploy-${timestamp}-${random}`;
  }

  /**
   * Intelligently discover deployment configuration for the given environment
   * @param {string} environment - Target environment
   * @returns {Promise<Object>} Discovered configuration
   */
  async discoverDeploymentConfig(environment) {
    const config = {
      configPath: null,
      hasEnvironmentConfig: false,
      workerName: null,
      routes: [],
      environment
    };

    // Strategy 1: Check for environment-specific wrangler.toml
    const envConfigPath = path.join(this.cwd, 'config', 'wrangler.toml');
    if (fs.existsSync(envConfigPath)) {
      config.configPath = 'config/wrangler.toml';
      config.hasEnvironmentConfig = true;

      try {
        // Try to parse basic config info (without TOML dependency)
        const content = fs.readFileSync(envConfigPath, 'utf8');
        config.workerName = this.extractWorkerNameFromConfig(content);
        config.routes = this.extractRoutesFromConfig(content);
      } catch (error) {
        console.warn(`   ⚠️ Could not parse config file: ${error.message}`);
      }
    }

    // Strategy 2: Check for root wrangler.toml
    if (!config.configPath) {
      const rootConfigPath = path.join(this.cwd, 'wrangler.toml');
      if (fs.existsSync(rootConfigPath)) {
        config.configPath = 'wrangler.toml';

        try {
          const content = fs.readFileSync(rootConfigPath, 'utf8');
          config.workerName = this.extractWorkerNameFromConfig(content);
          config.routes = this.extractRoutesFromConfig(content);

          // Check if root config has environment-specific sections
          config.hasEnvironmentConfig = content.includes(`[env.${environment}]`);
        } catch (error) {
          console.warn(`   ⚠️ Could not parse root config: ${error.message}`);
        }
      }
    }

    // Strategy 3: Fallback to package.json for worker name
    if (!config.workerName) {
      try {
        const packagePath = path.join(this.cwd, 'package.json');
        if (fs.existsSync(packagePath)) {
          const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          config.workerName = packageJson.name;
        }
      } catch (error) {
        // Ignore package.json parsing errors
      }
    }

    return config;
  }

  /**
   * Build wrangler command arguments based on discovered configuration
   * @param {string} environment - Target environment
   * @param {Object} config - Discovered configuration
   * @param {Object} options - Additional options
   * @returns {Promise<Array<string>>} Command arguments
   */
  async buildWranglerCommand(environment, config, options = {}) {
    const args = ['wrangler', 'deploy'];

    // Add config path if not default
    if (config.configPath && config.configPath !== 'wrangler.toml') {
      args.push('--config', config.configPath);
    }

    // Add environment flag based on configuration
    if (config.hasEnvironmentConfig) {
      args.push('--env', environment);
    } else if (environment !== 'production') {
      // For non-production without explicit env config, still try
      args.push('--env', environment);
    }

    // Add deployment options
    if (options.dryRun) {
      args.push('--dry-run');
    }

    if (options.legacyAssets) {
      args.push('--legacy-assets');
    }

    // Add environment variables from process.env that might be relevant
    const envVars = this.extractRelevantEnvironmentVars(environment);
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) {
        args.push('--var', `${key}:${value}`);
      }
    });

    // Add any environment-specific overrides from options
    if (options.vars) {
      Object.entries(options.vars).forEach(([key, value]) => {
        args.push('--var', `${key}:${value}`);
      });
    }

    return args;
  }

  /**
   * Extract worker name from wrangler config content (basic parsing)
   * @param {string} content - Config file content
   * @returns {string|null} Worker name or null
   */
  extractWorkerNameFromConfig(content) {
    const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
    return nameMatch ? nameMatch[1] : null;
  }

  /**
   * Extract routes from wrangler config content
   * @param {string} content - Config file content
   * @returns {Array<string>} Routes
   */
  extractRoutesFromConfig(content) {
    const routes = [];
    const routeMatches = content.match(/route\s*=\s*["']([^"']+)["']/g);
    if (routeMatches) {
      routeMatches.forEach(match => {
        const routeMatch = match.match(/route\s*=\s*["']([^"']+)["']/);
        if (routeMatch) {
          routes.push(routeMatch[1]);
        }
      });
    }
    return routes;
  }

  /**
   * Extract relevant environment variables for deployment
   * @param {string} environment - Target environment
   * @returns {Object} Relevant environment variables
   */
  extractRelevantEnvironmentVars(environment) {
    const relevantVars = {};

    // Cloudflare-specific variables
    const cfVars = [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_ZONE_ID',
      'CLOUDFLARE_API_TOKEN',
      'CF_API_TOKEN',
      'CF_ACCOUNT_ID'
    ];

    cfVars.forEach(varName => {
      if (process.env[varName]) {
        relevantVars[varName] = process.env[varName];
      }
    });

    // Service-specific variables
    const serviceVars = [
      'SERVICE_DOMAIN',
      'SERVICE_NAME',
      'NODE_ENV',
      'ENVIRONMENT',
      'LOG_LEVEL',
      'CORS_ORIGINS',
      'DATA_SERVICE_URL',
      'AUTH_SERVICE_URL',
      'CONTENT_STORE_SERVICE_URL',
      'FRONTEND_URL',
      'MAGIC_LINK_EXPIRY_MINUTES',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX',
      'MAX_FILE_SIZE',
      'ALLOWED_FILE_TYPES',
      'SKIP_WEBHOOK_AUTH'
    ];

    serviceVars.forEach(varName => {
      if (process.env[varName]) {
        relevantVars[varName] = process.env[varName];
      }
    });

    // Environment-specific variables
    const envSpecificVars = [
      `${environment.toUpperCase()}_URL`,
      `${environment.toUpperCase()}_DOMAIN`,
      `CF_${environment.toUpperCase()}_TOKEN`
    ];

    envSpecificVars.forEach(varName => {
      if (process.env[varName]) {
        relevantVars[varName] = process.env[varName];
      }
    });

    return relevantVars;
  }

  /**
   * Validate wrangler installation and configuration with intelligent discovery
   * @param {string} environment - Environment to validate for
   * @returns {Promise<Object>} Validation result with detailed configuration info
   */
  async validateWranglerSetup(environment = 'production') {
    try {
      console.log('   🔍 Validating wrangler setup...');

      // Check if wrangler is available
      const versionResult = await this.executeWranglerCommand(['wrangler', '--version']);

      if (!versionResult.success) {
        return {
          valid: false,
          error: 'Wrangler CLI not found or not working',
          details: versionResult.error
        };
      }

      // Discover deployment configuration
      const deployConfig = await this.discoverDeploymentConfig(environment);

      if (!deployConfig.configPath) {
        return {
          valid: false,
          error: 'No wrangler configuration found',
          details: 'Expected wrangler.toml or config/wrangler.toml',
          suggestions: [
            'Run: wrangler init',
            'Create wrangler.toml in project root',
            'Create config/wrangler.toml for environment-specific config'
          ]
        };
      }

      // Validate authentication
      const authResult = await this.executeWranglerCommand(['wrangler', 'whoami']);

      if (!authResult.success) {
        return {
          valid: false,
          error: 'Wrangler authentication failed',
          details: 'You need to login to Cloudflare',
          suggestions: [
            'Run: wrangler auth login',
            'Or set CLOUDFLARE_API_TOKEN environment variable'
          ]
        };
      }

      // Extract account information
      const accountInfo = this.extractAccountInfo(authResult.output);

      // Validate configuration can be parsed
      const configValidation = await this.validateWranglerConfig(deployConfig, environment);

      // Validate D1 database bindings using D1Manager
      const d1Validation = await this.d1Manager.validateD1Bindings(deployConfig);

      const overallValid = configValidation.valid && d1Validation.valid;

      return {
        valid: overallValid,
        version: versionResult.output.trim(),
        config: deployConfig,
        account: accountInfo,
        configValidation,
        d1Validation,
        authenticated: true,
        ready: overallValid
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Extract account information from wrangler whoami output
   * @param {string} output - wrangler whoami output
   * @returns {Object} Account information
   */
  extractAccountInfo(output) {
    const info = {};

    // Extract email
    const emailMatch = output.match(/(\S+@\S+\.\S+)/);
    if (emailMatch) {
      info.email = emailMatch[1];
    }

    // Extract account name/id
    const accountMatch = output.match(/Account:\s*([^\n]+)/i);
    if (accountMatch) {
      info.account = accountMatch[1].trim();
    }

    return info;
  }

  /**
   * Validate wrangler configuration for the given environment
   * @param {Object} config - Deployment configuration
   * @param {string} environment - Target environment
   * @returns {Promise<Object>} Configuration validation result
   */
  async validateWranglerConfig(config, environment) {
    try {
      const args = ['wrangler', 'deploy', '--dry-run'];

      if (config.configPath && config.configPath !== 'wrangler.toml') {
        args.push('--config', config.configPath);
      }

      if (config.hasEnvironmentConfig) {
        args.push('--env', environment);
      }

      const result = await this.executeWranglerCommand(args);

      return {
        valid: result.success,
        error: result.success ? null : result.error,
        warnings: this.extractConfigWarnings(result.output)
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Extract configuration warnings from wrangler output
   * @param {string} output - Wrangler output
   * @returns {Array<string>} Warning messages
   */
  extractConfigWarnings(output) {
    const warnings = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('Warning') || line.includes('warning') ||
          line.includes('WARN') || line.includes('⚠️')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }

  /**
   * Handle D1 binding errors with interactive recovery options (delegated to D1Manager)
   * @param {string} error - Error message
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleD1BindingError(error, context = {}) {
    return await this.d1Manager.handleD1BindingError(error, context);
  }

  /**
   * Validate D1 bindings using D1Manager (delegated)
   */
  async validateD1Bindings(deployConfig) {
    return await this.d1Manager.validateD1Bindings(deployConfig);
  }

  /**
   * Extract D1 bindings using D1Manager (delegated)  
   */
  extractD1Bindings(configContent) {
    return this.d1Manager.extractD1Bindings(configContent);
  }

  /**
   * Check D1 database existence using D1Manager (delegated)
   */
  async checkD1DatabaseExists(nameOrId) {
    return await this.d1Manager.checkD1DatabaseExists(nameOrId);
  }

  /**
   * Secret management methods
   * 
   * NOTE: For secret management operations, use the Cloudflare ops module:
   * 
   * import { deploySecret, listSecrets, deleteSecret } from '../bin/shared/cloudflare/ops.js';
   * 
   * The ops.js module provides:
   * - deploySecret(key, value, env)
   * - listSecrets(env)
   * - deleteSecret(key, env)
   * 
   * With built-in:
   * - Rate limiting
   * - Error recovery
   * - Production monitoring
   * - Retry logic
   * 
   * This avoids code duplication and ensures consistent secret handling across the framework.
   */
}

export default WranglerDeployer;