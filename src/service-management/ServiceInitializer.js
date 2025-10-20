/**
 * Clodo Framework - Service Initializer
 * Programmatic API for initializing services with configurations
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get framework root - handle both ES module and CommonJS environments
const getFrameworkRoot = () => {
  try {
    // Try ES module approach
    const filename = fileURLToPath(import.meta.url);
    const dirname_ = dirname(filename);
    return resolve(dirname_, '..', '..');
  } catch (error) {
    // Fallback for test environments - use current working directory
    return process.cwd();
  }
};

const FRAMEWORK_ROOT = getFrameworkRoot();
const TEMPLATES_DIR = join(FRAMEWORK_ROOT, 'templates');
const SERVICE_TYPES = ['generic', 'data-service', 'auth-service', 'content-service', 'api-gateway'];

export class ServiceInitializer {
  constructor(options = {}) {
    this.frameworkRoot = options.frameworkRoot || FRAMEWORK_ROOT;
    this.templatesDir = options.templatesDir || TEMPLATES_DIR;
    this.serviceTypes = options.serviceTypes || SERVICE_TYPES;
  }

  /**
   * Validate service name according to framework conventions
   * @param {string} name - Service name to validate
   * @throws {Error} If validation fails
   */
  validateServiceName(name) {
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new Error('Service name must contain only lowercase letters, numbers, and hyphens');
    }
    if (name.length < 3 || name.length > 50) {
      throw new Error('Service name must be between 3 and 50 characters');
    }
  }

  /**
   * Validate service type
   * @param {string} type - Service type to validate
   * @throws {Error} If type is invalid
   */
  validateServiceType(type) {
    if (!this.serviceTypes.includes(type)) {
      throw new Error(`Invalid service type. Must be one of: ${this.serviceTypes.join(', ')}`);
    }
  }

  /**
   * Initialize a service with auto-generated configurations
   * @param {string} serviceName - Name of the service to initialize
   * @param {Object} options - Initialization options
   * @param {string} options.type - Service type (default: 'generic')
   * @param {string} options.domains - Comma-separated list of domains
   * @param {string} options.env - Target environment (default: 'development')
   * @param {string} options.apiToken - Cloudflare API token
   * @param {string} options.accountId - Cloudflare account ID
   * @param {string} options.zoneId - Cloudflare zone ID
   * @param {string} options.output - Output directory (default: current directory)
   * @param {boolean} options.force - Overwrite existing directory (default: false)
   * @param {boolean} options.dryRun - Show what would be created without creating files (default: false)
   * @returns {Object} Initialization result
   */
  async initializeService(serviceName, options = {}) {
    const config = {
      type: 'generic',
      domains: '',
      env: 'development',
      output: process.cwd(),
      force: false,
      dryRun: false,
      ...options
    };

    try {
      // Validate inputs
      this.validateServiceName(serviceName);
      this.validateServiceType(config.type);

      // Parse domain information
      const domainInfo = this.parseDomainInfo(config, serviceName);

      // Generate configurations
      const configs = this.generateConfigurations(serviceName, config, domainInfo);

      if (config.dryRun) {
        return {
          success: true,
          dryRun: true,
          serviceName,
          configs
        };
      }

      // Create service structure
      this.createServiceStructure(serviceName, config, configs);

      return {
        success: true,
        serviceName,
        serviceType: config.type,
        serviceDir: join(config.output, 'services', serviceName),
        configs: Object.keys(configs),
        domainInfo
      };

    } catch (error) {
      return {
        success: false,
        serviceName,
        error: error.message
      };
    }
  }

  /**
   * Parse domain information from options
   * @param {Object} config - Configuration options
   * @param {string} serviceName - Service name
   * @returns {Object} Domain information
   */
  parseDomainInfo(config, serviceName) {
    const domainInfo = {
      domains: [],
      defaultAccountId: config.accountId || process.env.CLOUDFLARE_ACCOUNT_ID,
      defaultZoneId: config.zoneId || process.env.CLOUDFLARE_ZONE_ID,
      apiToken: config.apiToken || process.env.CLOUDFLARE_API_TOKEN
    };

    // Parse domains from command line - support format: domain[:accountId[:zoneId]]
    if (config.domains) {
      const domainSpecs = config.domains.split(',').map(d => d.trim());
      domainInfo.domains = domainSpecs.map(spec => {
        const parts = spec.split(':');
        return {
          domain: parts[0],
          accountId: parts[1] || domainInfo.defaultAccountId,
          zoneId: parts[2] || domainInfo.defaultZoneId,
          name: `${serviceName}-${parts[0].replace(/[^a-zA-Z0-9]/g, '-')}`
        };
      });
    }

    // If no domains specified, create a default one
    if (domainInfo.domains.length === 0) {
      domainInfo.domains.push({
        domain: `${serviceName}.example.com`,
        accountId: domainInfo.defaultAccountId,
        zoneId: domainInfo.defaultZoneId,
        name: `${serviceName}-default`
      });
    }

    return domainInfo;
  }

  /**
   * Generate all configurations for the service
   * @param {string} serviceName - Service name
   * @param {Object} config - Configuration options
   * @param {Object} domainInfo - Domain information
   * @returns {Object} Generated configurations
   */
  generateConfigurations(serviceName, config, domainInfo) {
    const configs = {};

    // Generate wrangler.toml
    Object.assign(configs, this.generateWranglerConfig(serviceName, config, domainInfo));

    // Generate domains.js
    configs['src/config/domains.js'] = this.generateDomainsConfig(serviceName, config, domainInfo);

    // Generate package.json
    configs['package.json'] = this.generatePackageJson(serviceName, config);

    // Generate README.md
    configs['README.md'] = this.generateReadme(serviceName, config, domainInfo);

    return configs;
  }

  /**
   * Generate Wrangler configuration
   * @param {string} serviceName - Service name
   * @param {Object} config - Configuration options
   * @param {Object} domainInfo - Domain information
   * @returns {Object} Wrangler configurations
   */
  generateWranglerConfig(serviceName, config, domainInfo) {
    const env = config.env;

    // For multiple domains, generate separate wrangler files
    if (domainInfo.domains.length > 1) {
      const wranglerConfigs = {};
      domainInfo.domains.forEach(domainConfig => {
        const configName = `wrangler.${domainConfig.name}.toml`;
        wranglerConfigs[configName] = this.generateSingleWranglerConfig(
          domainConfig.name,
          env,
          config,
          domainConfig,
          serviceName
        );
      });
      return wranglerConfigs;
    }

    // For single domain, generate single wrangler.toml
    return {
      'wrangler.toml': this.generateSingleWranglerConfig(
        `${serviceName}-${env}`,
        env,
        config,
        domainInfo.domains[0],
        serviceName
      )
    };
  }

  /**
   * Generate single Wrangler configuration
   * @param {string} name - Configuration name
   * @param {string} env - Environment
   * @param {Object} config - Configuration options
   * @param {Object} domainConfig - Domain configuration
   * @param {string} serviceName - Service name
   * @returns {string} Wrangler TOML content
   */
  generateSingleWranglerConfig(name, env, config, domainConfig, serviceName) {
    const isProduction = env === 'production';

    let wranglerConfig = `name = "${name}"
main = "src/worker/index.js"
compatibility_date = "${new Date().toISOString().split('T')[0]}"

`;

    if (!isProduction) {
      wranglerConfig += `[env.${env}]
name = "${name}"

`;
    }

    wranglerConfig += `[env.production]
name = "${name.replace(`-${env}`, '')}-production"

`;

    // Add D1 databases for data services
    if (config.type === 'data-service') {
      wranglerConfig += `# Database bindings
[[d1_databases]]
binding = "${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_DB"
database_name = "${name}-db"

`;
    }

    // Environment variables
    wranglerConfig += `# Environment variables
[vars]
DOMAIN_NAME = "${domainConfig.domain}"
ENVIRONMENT = "${env}"
SERVICE_NAME = "${serviceName}"
SERVICE_TYPE = "${config.type}"
DOMAIN_CONFIG = "${domainConfig.name}"

`;

    // Add service-specific environment variables
    if (config.type === 'auth-service') {
      wranglerConfig += `JWT_SECRET = "change-in-production"
AUTH_PROVIDERS = "google,github"
`;
    } else if (config.type === 'api-gateway') {
      wranglerConfig += `RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW_MS = "60000"
ENABLE_CORS = "true"
`;
    }

    return wranglerConfig;
  }

  /**
   * Generate domains configuration
   * @param {string} serviceName - Service name
   * @param {Object} config - Configuration options
   * @param {Object} domainInfo - Domain information
   * @returns {string} Domains configuration content
   */
  generateDomainsConfig(serviceName, config, domainInfo) {
    let domainsConfig = `import { createDomainConfigSchema } from '@tamyla/clodo-framework';

/**
 * Domain configurations for ${serviceName}
 *
 * Auto-generated by Clodo Framework Service Initializer
 * Generated on: ${new Date().toISOString()}
 *
 * This service supports multiple domains with domain-specific configurations
 */

export const domains = [
`;

    domainInfo.domains.forEach((domain, index) => {
      domainsConfig += `  {
    name: '${domain.name}',
    domain: '${domain.domain}',
    accountId: '${domain.accountId || 'your-account-id'}',
    zoneId: '${domain.zoneId || 'your-zone-id'}',
    environment: '${config.env}',
    ssl: true,
    cors: ${config.type === 'api-gateway' ? 'true' : 'false'}
  }`;

      if (index < domainInfo.domains.length - 1) {
        domainsConfig += ',';
      }
      domainsConfig += '\n';
    });

    domainsConfig += `];

export const domainConfigSchema = createDomainConfigSchema();
`;

    return domainsConfig;
  }

  /**
   * Generate package.json for the service
   * @param {string} serviceName - Service name
   * @param {Object} config - Configuration options
   * @returns {string} Package.json content
   */
  generatePackageJson(serviceName, config) {
    const packageJson = {
      name: serviceName,
      version: '1.0.0',
      description: `${config.type} service created with Clodo Framework`,
      type: 'module',
      main: 'dist/index.js',
      scripts: {
        build: 'babel src --out-dir dist --copy-files',
        dev: 'wrangler dev',
        deploy: 'wrangler deploy',
        test: 'jest',
        setup: 'node setup.js'
      },
      dependencies: {
        '@tamyla/clodo-framework': '^3.0.5'
      },
      devDependencies: {
        '@babel/cli': '^7.0.0',
        '@babel/core': '^7.0.0',
        '@babel/preset-env': '^7.0.0',
        'jest': '^29.0.0',
        'wrangler': '^3.0.0'
      },
      keywords: ['cloudflare', 'workers', 'clodo-framework', config.type],
      author: 'Generated by Clodo Framework',
      license: 'MIT'
    };

    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Generate README for the service
   * @param {string} serviceName - Service name
   * @param {Object} config - Configuration options
   * @param {Object} domainInfo - Domain information
   * @returns {string} README content
   */
  generateReadme(serviceName, config, domainInfo) {
    return `# ${serviceName}

${config.type} service created with Clodo Framework.

## Setup

\`\`\`bash
npm install
npm run setup
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Deployment

\`\`\`bash
npm run deploy
\`\`\`

## Domains

${domainInfo.domains.map(d => `- ${d.domain}`).join('\n')}

## Environment

- **Environment**: ${config.env}
- **Type**: ${config.type}
- **Generated**: ${new Date().toISOString()}
`;
  }

  /**
   * Create the service directory structure and write configurations
   * @param {string} serviceName - Service name
   * @param {Object} config - Configuration options
   * @param {Object} configs - Generated configurations
   */
  createServiceStructure(serviceName, config, configs) {
    const servicesDir = join(config.output, 'services');
    const serviceDir = join(servicesDir, serviceName);

    // Create directories
    mkdirSync(servicesDir, { recursive: true });
    mkdirSync(serviceDir, { recursive: true });
    mkdirSync(join(serviceDir, 'src', 'config'), { recursive: true });
    mkdirSync(join(serviceDir, 'src', 'worker'), { recursive: true });

    // Write configuration files
    for (const [filePath, content] of Object.entries(configs)) {
      const fullPath = join(serviceDir, filePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, 'utf8');
    }

    // Create basic worker file
    const workerContent = `import { ClodoWorker } from '@tamyla/clodo-framework/worker';
import { domains } from './config/domains.js';

export default {
  async fetch(request, env, ctx) {
    const worker = new ClodoWorker({
      domains,
      environment: env
    });

    return worker.handleRequest(request, env, ctx);
  }
};
`;
    writeFileSync(join(serviceDir, 'src', 'worker', 'index.js'), workerContent, 'utf8');
  }

  /**
   * Get available service types
   * @returns {string[]} Array of available service types
   */
  getServiceTypes() {
    return [...this.serviceTypes];
  }
}

// Convenience function for quick service initialization
export async function initializeService(serviceName, options = {}) {
  const initializer = new ServiceInitializer();
  return await initializer.initializeService(serviceName, options);
}