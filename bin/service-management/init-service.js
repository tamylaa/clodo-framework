#!/usr/bin/env node

/**
 * Lego Framework - Service Initializer
 *
 * Initializes a new service with auto-generated configurations,
 * eliminating the need for manual wrangler.toml and domains.js setup.
 *
 * This solves the workflow order problem by making configuration
 * generation the first step, not a prerequisite.
 */

import { program } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FRAMEWORK_ROOT = resolve(__dirname, '..');
const TEMPLATES_DIR = join(FRAMEWORK_ROOT, 'templates');
const SERVICE_TYPES = ['generic', 'data-service', 'auth-service', 'content-service', 'api-gateway'];

class ServiceInitializer {
  constructor() {
    this.setupCLI();
  }

  setupCLI() {
    program
      .name('init-service')
      .description('Initialize a Lego Framework service with auto-generated configurations')
      .version('1.0.0')
      .argument('<service-name>', 'Name of the service to initialize')
      .option('-t, --type <type>', 'Service type', 'generic')
      .option('-d, --domains <domains>', 'Comma-separated list of domains (can include account info)')
      .option('-e, --env <environment>', 'Target environment', 'development')
      .option('--api-token <token>', 'Cloudflare API token for domain discovery')
      .option('--account-id <id>', 'Default Cloudflare account ID')
      .option('--zone-id <id>', 'Default Cloudflare zone ID')
      .option('-o, --output <path>', 'Output directory (services will be created in a services/ subdirectory)', process.cwd())
      .option('-f, --force', 'Overwrite existing service directory')
      .option('--dry-run', 'Show what would be created without creating files')
      .option('--multi-domain', 'Generate configurations for multiple domains')
      .action((serviceName, options) => {
        this.initializeService(serviceName, options);
      });

    program.on('--help', () => {
      console.log('\nExamples:');
      console.log('  init-service my-api --type api-gateway --domains "api.example.com,staging.example.com"');
      console.log('  init-service data-service --type data-service --api-token $CF_TOKEN');
      console.log('  init-service my-service --env production --account-id $CF_ACCOUNT_ID');
      console.log('\nServices are created in: ./services/{service-name}/');
      console.log('\nEnvironment Variables:');
      console.log('  CLOUDFLARE_API_TOKEN    - API token for domain discovery');
      console.log('  CLOUDFLARE_ACCOUNT_ID   - Account ID for configurations');
      console.log('  CLOUDFLARE_ZONE_ID      - Zone ID for domain configurations');
    });
  }

  async initializeService(serviceName, options) {
    try {
      console.log('🚀 Lego Framework - Service Initializer');
      console.log('=' .repeat(50));

      // Validate inputs
      this.validateInputs(serviceName, options);

      // Discover domains if API token provided
      const domainInfo = await this.discoverDomains(options, serviceName);

      // Generate configurations
      const configs = this.generateConfigurations(serviceName, options, domainInfo);

      if (options.dryRun) {
        this.showDryRun(configs);
        return;
      }

      // Create service structure
      this.createServiceStructure(serviceName, options, configs);

      // Validate setup
      this.validateSetup(serviceName, options);

      console.log('\n✅ Service initialized successfully!');
      console.log('\n📝 Next steps:');
      console.log(`   cd services/${serviceName}`);
      console.log('   npm install');
      console.log('   npm run dev    # Start development server');
      console.log('   npm run deploy # Deploy to Cloudflare');

    } catch (error) {
      console.error('\n❌ Initialization failed:', error.message);
      process.exit(1);
    }
  }

  validateInputs(serviceName, options) {
    // Validate service name
    if (!/^[a-z0-9-]+$/.test(serviceName)) {
      throw new Error('Service name must contain only lowercase letters, numbers, and hyphens');
    }
    if (serviceName.length < 3 || serviceName.length > 50) {
      throw new Error('Service name must be between 3 and 50 characters');
    }

    // Validate service type
    if (!SERVICE_TYPES.includes(options.type)) {
      throw new Error(`Invalid service type. Must be one of: ${SERVICE_TYPES.join(', ')}`);
    }

    // Check if service directory exists
    const servicesDir = join(options.output, 'services');
    const serviceDir = join(servicesDir, serviceName);
    if (existsSync(serviceDir) && !options.force) {
      throw new Error(`Service directory already exists: ${serviceDir}. Use --force to overwrite.`);
    }
  }

  async discoverDomains(options, serviceName) {
    const domainInfo = {
      domains: [],
      defaultAccountId: options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID,
      defaultZoneId: options.zoneId || process.env.CLOUDFLARE_ZONE_ID,
      apiToken: options.apiToken || process.env.CLOUDFLARE_API_TOKEN
    };

    // Parse domains from command line - support format: domain[:accountId[:zoneId]]
    if (options.domains) {
      const domainSpecs = options.domains.split(',').map(d => d.trim());
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

    // If API token provided and no domains specified, try to discover
    if (domainInfo.apiToken && !options.domains) {
      console.log('🔍 Discovering domains from Cloudflare...');
      try {
        // Mock discovery for now - would integrate with real API
        domainInfo.domains = [
          {
            domain: `${options.env === 'production' ? '' : options.env + '-'}api.example.com`,
            accountId: domainInfo.defaultAccountId,
            zoneId: domainInfo.defaultZoneId,
            name: `${serviceName}-api`
          }
        ];
        console.log(`   Found domain: ${domainInfo.domains[0].domain}`);
      } catch (error) {
        console.warn('⚠️  Domain discovery failed, using defaults:', error.message);
        domainInfo.domains = [{
          domain: `api.example.com`,
          accountId: domainInfo.defaultAccountId,
          zoneId: domainInfo.defaultZoneId,
          name: `${options.serviceName}-api`
        }];
      }
    }

    // Ensure we have at least one domain
    if (domainInfo.domains.length === 0) {
      domainInfo.domains = [{
        domain: `api.example.com`,
        accountId: domainInfo.defaultAccountId,
        zoneId: domainInfo.defaultZoneId,
        name: `${serviceName}-api`
      }];
    }

    return domainInfo;
  }

  generateConfigurations(serviceName, options, domainInfo) {
    console.log('🔧 Generating configurations...');

    const configs = {};

    // Generate wrangler.toml
    configs.wrangler = this.generateWranglerConfig(serviceName, options, domainInfo);

    // Generate domains.js
    configs.domains = this.generateDomainsConfig(serviceName, options, domainInfo);

    // Generate package.json
    configs.package = this.generatePackageConfig(serviceName, options);

    return configs;
  }

  generateWranglerConfig(serviceName, options, domainInfo) {
    const env = options.env;

    // For multiple domains, generate separate wrangler files
    if (domainInfo.domains.length > 1) {
      const wranglerConfigs = {};
      domainInfo.domains.forEach(domainConfig => {
        const configName = `wrangler.${domainConfig.name}.toml`;
        wranglerConfigs[configName] = this.generateSingleWranglerConfig(
          domainConfig.name,
          env,
          options,
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
        options,
        domainInfo.domains[0],
        serviceName
      )
    };
  }

  generateSingleWranglerConfig(name, env, options, domainConfig, serviceName) {
    const isProduction = env === 'production';

    let config = `name = "${name}"
main = "src/worker/index.js"
compatibility_date = "${new Date().toISOString().split('T')[0]}"

`;

    if (!isProduction) {
      config += `[env.${env}]
name = "${name}"

`;
    }

    config += `[env.production]
name = "${name.replace(`-${env}`, '')}-production"

`;

    // Add D1 databases for data services
    if (options.type === 'data-service') {
      config += `# Database bindings
[[d1_databases]]
binding = "${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_DB"
database_name = "${name}-db"

`;
    }

    // Environment variables
    config += `# Environment variables
[vars]
DOMAIN_NAME = "${domainConfig.domain}"
ENVIRONMENT = "${env}"
SERVICE_NAME = "${serviceName}"
SERVICE_TYPE = "${options.type}"
DOMAIN_CONFIG = "${domainConfig.name}"

`;

    // Add service-specific environment variables
    if (options.type === 'auth-service') {
      config += `JWT_SECRET = "change-in-production"
AUTH_PROVIDERS = "google,github"
`;
    } else if (options.type === 'api-gateway') {
      config += `RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW_MS = "60000"
ENABLE_CORS = "true"
`;
    }

    return config;
  }

  generateDomainsConfig(serviceName, options, domainInfo) {
    let config = `import { createDomainConfigSchema } from '@tamyla/lego-framework';

/**
 * Domain configurations for ${serviceName}
 *
 * Auto-generated by Lego Framework Service Initializer
 * Generated on: ${new Date().toISOString()}
 *
 * This service supports multiple domains with domain-specific configurations
 */

export const domains = {
`;

    domainInfo.domains.forEach((domainConfig, index) => {
      const isLast = index === domainInfo.domains.length - 1;
      config += this.generateSingleDomainConfig(serviceName, options, domainConfig, isLast);
    });

    config += `};

/**
 * Get domain configuration by domain name
 */
export function getDomainConfig(domainName) {
  // Try exact match first
  if (domains[domainName]) {
    return domains[domainName];
  }

  // Try to find by domain (for runtime domain detection)
  for (const [key, config] of Object.entries(domains)) {
    if (config.domains.production === domainName ||
        config.domains.staging === domainName ||
        config.domains.development === domainName) {
      return config;
    }
  }

  // Fallback to first domain
  const firstDomain = Object.keys(domains)[0];
  console.warn(\`Domain \${domainName} not found, using \${firstDomain}\`);
  return domains[firstDomain];
}

/**
 * Get all available domains
 */
export function getAvailableDomains() {
  return Object.keys(domains);
}

/**
 * Get domain configuration for current environment
 */
export function getCurrentDomainConfig() {
  // This would be determined by the request hostname in the worker
  // For now, return the first domain
  const firstDomain = Object.keys(domains)[0];
  return domains[firstDomain];
}
`;

    return config;
  }

  generateSingleDomainConfig(serviceName, options, domainConfig, isLast) {
    const env = options.env;

    let config = `  '${domainConfig.name}': {
    ...createDomainConfigSchema(),
    name: '${domainConfig.name}',
    displayName: '${this.toTitleCase(domainConfig.name.replace(/-/g, ' '))}',
    accountId: '${domainConfig.accountId || 'YOUR_CLOUDFLARE_ACCOUNT_ID'}',
    zoneId: '${domainConfig.zoneId || 'YOUR_CLOUDFLARE_ZONE_ID'}',
    domains: {
      production: '${domainConfig.domain}',
      staging: 'staging-${domainConfig.domain}',
      development: 'dev-${domainConfig.domain}'
    },
    services: [
      '${serviceName}'
    ],
`;

    // Add service-specific databases
    if (options.type === 'data-service') {
      config += `
    databases: [
      {
        name: '${domainConfig.name}-db',
        type: 'd1'
      }
    ],`;
    }

    // Add features based on service type
    config += `
    features: {
      // Core features (always enabled)
      logging: true,
      monitoring: true,
      errorReporting: true,
`;

    // Service-specific features
    if (options.type === 'data-service') {
      config += `
      // Data service features
      authentication: true,
      authorization: true,
      fileStorage: false,
      search: true,
      filtering: true,
      pagination: true,
`;
    } else if (options.type === 'auth-service') {
      config += `
      // Auth service features
      authentication: true,
      authorization: true,
      userProfiles: true,
      emailNotifications: true,
      magicLinkAuth: true,
`;
    } else if (options.type === 'api-gateway') {
      config += `
      // API Gateway features
      authentication: false,
      authorization: false,
      rateLimiting: true,
      caching: true,
      monitoring: true,
`;
    } else if (options.type === 'content-service') {
      config += `
      // Content service features
      fileStorage: true,
      search: true,
      filtering: true,
      pagination: true,
      caching: true,
`;
    }

    config += `
      // Domain-specific customizations
      domainCustomizations: true,
    },
    settings: {
      environment: '${env}',
      logLevel: 'info',
      corsOrigins: ['https://${domainConfig.domain}'], // Domain-specific CORS
      rateLimitRequests: 100,
      rateLimitWindowMs: 60000,
      enableMetrics: true,
      metricsEndpoint: '/metrics',
      domainName: '${domainConfig.domain}'
    }
  }`;

    if (!isLast) {
      config += ',';
    }
    config += '\n';

    return config;
  }

  generatePackageConfig(serviceName, options) {
    const config = {
      name: serviceName,
      version: '1.0.0',
      description: `${this.toTitleCase(serviceName.replace(/-/g, ' '))} - ${options.type} service`,
      type: 'module',
      main: 'src/worker/index.js',
      scripts: {
        build: 'babel src/ --out-dir dist/',
        dev: 'wrangler dev',
        deploy: 'wrangler deploy',
        test: 'jest',
        lint: 'eslint src',
        'lint:fix': 'eslint src --fix'
      },
      dependencies: {
        '@tamyla/lego-framework': 'file:../'
      },
      devDependencies: {
        wrangler: '^3.0.0',
        jest: '^29.0.0',
        eslint: '^8.0.0',
        '@babel/cli': '^7.0.0',
        '@babel/core': '^7.0.0',
        '@babel/preset-env': '^7.0.0'
      },
      keywords: [
        'cloudflare',
        'workers',
        'lego-framework',
        options.type
      ],
      author: 'Generated by Lego Framework',
      license: 'MIT'
    };

    return JSON.stringify(config, null, 2);
  }

  showDryRun(configs) {
    console.log('\n📋 DRY RUN - Would create the following files:');
    console.log('\n📄 wrangler.toml:');
    console.log(configs.wrangler);
    console.log('\n📄 src/config/domains.js:');
    console.log(configs.domains);
    console.log('\n📄 package.json:');
    console.log(configs.package);
  }

  createServiceStructure(serviceName, options, configs) {
    const servicesDir = join(options.output, 'services');
    const serviceDir = join(servicesDir, serviceName);

    console.log(`📁 Creating service structure in: ${serviceDir}`);

    // Create directories
    const dirs = [
      serviceDir,
      join(serviceDir, 'src'),
      join(serviceDir, 'src', 'worker'),
      join(serviceDir, 'src', 'config'),
      join(serviceDir, 'tests'),
      join(serviceDir, 'docs')
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    // Write wrangler configurations (could be single file or multiple)
    if (typeof configs.wrangler === 'string') {
      // Single wrangler.toml
      writeFileSync(join(serviceDir, 'wrangler.toml'), configs.wrangler);
    } else {
      // Multiple wrangler files
      for (const [filename, content] of Object.entries(configs.wrangler)) {
        writeFileSync(join(serviceDir, filename), content);
      }
    }

    // Write other configuration files
    writeFileSync(join(serviceDir, 'package.json'), configs.package);
    writeFileSync(join(serviceDir, 'src', 'config', 'domains.js'), configs.domains);

    // Create basic worker file
    this.createWorkerFile(serviceName, options, serviceDir);

    // Create README
    this.createReadmeFile(serviceName, options, serviceDir);

    console.log('✅ Configuration files created');
  }

  createWorkerFile(serviceName, options, serviceDir) {
    const workerContent = `import { initializeService, createFeatureGuard, COMMON_FEATURES } from '@tamyla/lego-framework';
import { domains, getDomainConfig } from '../config/domains.js';

/**
 * ${this.toTitleCase(serviceName.replace(/-/g, ' '))} - ${options.type} service
 *
 * Auto-generated by Lego Framework Service Initializer
 * Generated on: ${new Date().toISOString()}
 *
 * Supports multiple domains with domain-specific configurations
 */

export default {
  async fetch(request, env, ctx) {
    try {
      // Get domain configuration based on request hostname
      const hostname = new URL(request.url).hostname;
      const domainConfig = getDomainConfig(hostname);

      // Initialize service with domain-specific configuration
      const service = initializeService(env, { [domainConfig.name]: domainConfig });

      // Log request (if logging is enabled)
      if (service.features.includes(COMMON_FEATURES.LOGGING)) {
        console.log(\`\${request.method} \${request.url} - \${hostname} (\${service.environment}) [\${domainConfig.name}]\`);
      }

      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: '${serviceName}',
          version: '1.0.0',
          type: '${options.type}',
          domain: hostname,
          domainConfig: domainConfig.name,
          features: service.features,
          environment: service.environment,
          timestamp: new Date().toISOString()
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
      }

      // Domain info endpoint
      if (url.pathname === '/domain') {
        return new Response(JSON.stringify({
          hostname: hostname,
          domainConfig: domainConfig.name,
          accountId: domainConfig.accountId,
          zoneId: domainConfig.zoneId,
          corsOrigins: domainConfig.settings.corsOrigins,
          rateLimit: {
            requests: domainConfig.settings.rateLimitRequests,
            windowMs: domainConfig.settings.rateLimitWindowMs
          }
        }), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      // Service-specific endpoints
      ${this.getServiceSpecificEndpoints(options.type)}

      // Default response
      return new Response(JSON.stringify({
        message: '${serviceName} service running',
        type: '${options.type}',
        domain: hostname,
        domainConfig: domainConfig.name,
        endpoints: ['/health', '/domain'${this.getServiceEndpoints(options.type)}]
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });

    } catch (error) {
      console.error('Service error:', error);
      return new Response(JSON.stringify({
        error: error.message,
        status: 'error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
};
`;

    writeFileSync(join(serviceDir, 'src', 'worker', 'index.js'), workerContent);
  }

  getServiceSpecificEndpoints(serviceType) {
    const endpoints = {
      'data-service': `
      // Data service endpoints
      if (url.pathname.startsWith('/api/data')) {
        // Handle data operations
        return new Response(JSON.stringify({
          message: 'Data service endpoint',
          path: url.pathname
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }`,
      'auth-service': `
      // Auth service endpoints
      if (url.pathname.startsWith('/auth')) {
        // Handle authentication operations
        return new Response(JSON.stringify({
          message: 'Auth service endpoint',
          path: url.pathname
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }`,
      'api-gateway': `
      // API Gateway endpoints
      if (url.pathname.startsWith('/api/')) {
        // Route to appropriate services
        return new Response(JSON.stringify({
          message: 'API Gateway routing',
          path: url.pathname
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }`,
      'content-service': `
      // Content service endpoints
      if (url.pathname.startsWith('/content')) {
        // Handle content operations
        return new Response(JSON.stringify({
          message: 'Content service endpoint',
          path: url.pathname
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }`,
      'generic': `
      // Generic service endpoints
      if (url.pathname.startsWith('/api/generic')) {
        // Handle generic operations
        return new Response(JSON.stringify({
          message: 'Generic service endpoint',
          path: url.pathname
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }`
    };

    return endpoints[serviceType] || endpoints['generic'];
  }

  // Duplicate method removed - keeping the more comprehensive version below

  getServiceEndpoints(serviceType) {
    switch (serviceType) {
      case 'data-service':
        return ', \'/api/data\'';
      case 'auth-service':
        return ', \'/auth/login\'';
      default:
        return '';
    }
  }

  createReadmeFile(serviceName, options, serviceDir) {
    const readme = `# ${this.toTitleCase(serviceName.replace(/-/g, ' '))}

${options.type} service built with Lego Framework.

## Setup

This service was auto-initialized with the following configuration:

- **Service Type**: ${options.type}
- **Environment**: ${options.env}
- **Framework**: Lego Framework

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deployment

\`\`\`bash
npm run deploy
\`\`\`

## Configuration

### wrangler.toml
Contains Cloudflare Workers configuration with environment-specific settings.

### src/config/domains.js
Contains domain-specific configuration and feature flags.

## Environment Variables

Set these in your Cloudflare Workers environment or wrangler.toml:

- \`CLOUDFLARE_ACCOUNT_ID\` - Your Cloudflare account ID
- \`CLOUDFLARE_ZONE_ID\` - Your Cloudflare zone ID

## Development

\`\`\`bash
# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
\`\`\`

## API Endpoints

- \`GET /health\` - Health check endpoint
${this.getApiDocs(options.type)}

---

*Generated by Lego Framework Service Initializer on ${new Date().toISOString()}*
`;

    writeFileSync(join(serviceDir, 'README.md'), readme);
  }

  getApiDocs(serviceType) {
    switch (serviceType) {
      case 'data-service':
        return '- `GET/POST/PUT/DELETE /api/data` - Data operations';
      case 'auth-service':
        return '- `POST /auth/login` - User authentication\n- `POST /auth/logout` - User logout\n- `GET /auth/profile` - User profile';
      case 'api-gateway':
        return '- `/*` - API Gateway routes (configure in domains.js)';
      case 'content-service':
        return '- `GET /content/*` - Content delivery\n- `POST /content/upload` - Content upload';
      default:
        return '- Service-specific endpoints (configure as needed)';
    }
  }

  validateSetup(serviceName, options) {
    const servicesDir = join(options.output, 'services');
    const serviceDir = join(servicesDir, serviceName);

    console.log('🔍 Validating setup...');

    const requiredFiles = [
      'package.json',
      'src/worker/index.js',
      'src/config/domains.js',
      'README.md'
    ];

    // Check for wrangler files - either single or multiple
    const wranglerFiles = readdirSync(serviceDir).filter(file => file.startsWith('wrangler.') && file.endsWith('.toml'));
    if (wranglerFiles.length === 0 && !existsSync(join(serviceDir, 'wrangler.toml'))) {
      throw new Error('No wrangler configuration files found');
    }

    for (const file of requiredFiles) {
      const filePath = join(serviceDir, file);
      if (!existsSync(filePath)) {
        throw new Error(`Required file not created: ${file}`);
      }
    }

    console.log('✅ All required files created successfully');
  }

  toTitleCase(str) {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  run() {
    program.parse();
  }
}

// Run the initializer
const initializer = new ServiceInitializer();
initializer.run();