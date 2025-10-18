/**
 * GenerationEngine - Tier 3: Automated Generation
 *
 * Takes the 6 core inputs and 15 confirmed values to automatically generate
 * 67+ configuration files and components for a complete Clodo Framework service.
 *
 * Core Inputs (6):
 * 1. Service Name
 * 2. Service Type
 * 3. Domain Name
 * 4. Cloudflare Token
 * 5. Cloudflare Account ID
 * 6. Cloudflare Zone ID
 * 7. Environment
 *
 * Confirmed Values (15):
 * 1. Display Name
 * 2. Description
 * 3. Version
 * 4. Author
 * 5. Production URL
 * 6. Staging URL
 * 7. Development URL
 * 8. Features Configuration
 * 9. Database Name
 * 10. Worker Name
 * 11. Package Name
 * 12. Git Repository URL
 * 13. Documentation URL
 * 14. Health Check Path
 * 15. API Base Path
 */

import { ServiceInitializer } from './ServiceInitializer.js';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const __dirname = (() => {
  const filename = fileURLToPath(import.meta.url);
  return dirname(filename);
})();

export class GenerationEngine {
  constructor(options = {}) {
    this.templatesDir = options.templatesDir || join(__dirname, '..', '..', 'templates');
    this.outputDir = options.outputDir || process.cwd();
    this.force = options.force || false;
  }

  /**
   * Generate complete service from core inputs and confirmed values
   */
  async generateService(coreInputs, confirmedValues, options = {}) {
    const config = {
      outputPath: this.outputDir,
      ...options
    };

    console.log('⚙️  Tier 3: Automated Generation');
    console.log('Generating 67+ configuration files and service components...\n');

    try {
      const servicePath = join(config.outputPath, coreInputs.serviceName);

      // Create service directory structure
      this.createDirectoryStructure(servicePath);

      // Generate all configuration files
      const generatedFiles = await this.generateAllFiles(coreInputs, confirmedValues, servicePath);

      // Create service manifest
      const serviceManifest = this.createServiceManifest(coreInputs, confirmedValues, generatedFiles);

      // Write service manifest
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      writeFileSync(manifestPath, JSON.stringify(serviceManifest, null, 2), 'utf8');
      generatedFiles.push(manifestPath);

      console.log(`✅ Generated ${generatedFiles.length} files successfully`);
      console.log(`📋 Service manifest created: clodo-service-manifest.json`);

      return {
        success: true,
        serviceName: coreInputs.serviceName,
        servicePath,
        generatedFiles,
        serviceManifest,
        fileCount: generatedFiles.length
      };

    } catch (error) {
      console.error(`❌ Generation failed: ${error.message}`);
      throw new Error(`Service generation failed: ${error.message}`);
    }
  }

  /**
   * Create the complete directory structure
   */
  createDirectoryStructure(servicePath) {
    const directories = [
      'src',
      'src/config',
      'src/worker',
      'src/handlers',
      'src/middleware',
      'src/utils',
      'src/schemas',
      'scripts',
      'test',
      'test/unit',
      'test/integration',
      'docs',
      'config',
      'logs',
      '.github',
      '.github/workflows'
    ];

    for (const dir of directories) {
      const fullPath = join(servicePath, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  /**
   * Generate all configuration files
   */
  async generateAllFiles(coreInputs, confirmedValues, servicePath) {
    const generatedFiles = [];

    // Core configuration files
    generatedFiles.push(...this.generateCoreFiles(coreInputs, confirmedValues, servicePath));

    // Service-specific configuration files
    generatedFiles.push(...this.generateServiceSpecificFiles(coreInputs, confirmedValues, servicePath));

    // Environment and deployment files
    generatedFiles.push(...this.generateEnvironmentFiles(coreInputs, confirmedValues, servicePath));

    // Testing and quality assurance files
    generatedFiles.push(...this.generateTestingFiles(coreInputs, confirmedValues, servicePath));

    // Documentation files
    generatedFiles.push(...this.generateDocumentationFiles(coreInputs, confirmedValues, servicePath));

    // CI/CD and automation files
    generatedFiles.push(...this.generateAutomationFiles(coreInputs, confirmedValues, servicePath));

    return generatedFiles;
  }

  /**
   * Generate core configuration files (package.json, wrangler.toml, etc.)
   */
  generateCoreFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // Use ServiceInitializer for proven package.json generation
    const serviceInitializer = new ServiceInitializer();

    // Generate package.json with proper dependencies
    const packageJsonContent = this.generatePackageJson(coreInputs, confirmedValues, servicePath);
    const packageJsonPath = join(servicePath, 'package.json');
    writeFileSync(packageJsonPath, packageJsonContent, 'utf8');
    files.push(packageJsonPath);

    // Generate wrangler.toml using ServiceInitializer's proven method
    const wranglerConfig = serviceInitializer.generateWranglerConfig(
      coreInputs.serviceName,
      { type: coreInputs.serviceType, env: coreInputs.environment },
      [{
        domain: coreInputs.domainName,
        accountId: coreInputs.cloudflareAccountId,
        zoneId: coreInputs.cloudflareZoneId,
        name: `${coreInputs.serviceName}-${coreInputs.environment}`
      }]
    );

    // Write wrangler.toml
    const wranglerPath = join(servicePath, 'wrangler.toml');
    let wranglerContent = '';
    for (const [key, value] of Object.entries(wranglerConfig)) {
      if (key === 'wrangler.toml') {
        wranglerContent = value;
      } else {
        // Handle multi-domain configs if needed
        const configPath = join(servicePath, key);
        writeFileSync(configPath, value, 'utf8');
        files.push(configPath);
      }
    }
    if (wranglerContent) {
      writeFileSync(wranglerPath, wranglerContent, 'utf8');
      files.push(wranglerPath);
    }

    // Generate domains.js using ServiceInitializer
    const domainsContent = serviceInitializer.generateDomainsConfig(
      coreInputs.serviceName,
      { type: coreInputs.serviceType, env: coreInputs.environment },
      [{
        domain: coreInputs.domainName,
        accountId: coreInputs.cloudflareAccountId,
        zoneId: coreInputs.cloudflareZoneId,
        name: `${coreInputs.serviceName}-${coreInputs.environment}`
      }]
    );
    const domainsPath = join(servicePath, 'src', 'config', 'domains.js');
    writeFileSync(domainsPath, domainsContent, 'utf8');
    files.push(domainsPath);

    // Generate worker index using existing method
    const workerPath = this.generateWorkerIndex(coreInputs, confirmedValues, servicePath);
    files.push(workerPath);

    return files;
  }

  /**
   * Generate service-specific configuration files
   */
  generateServiceSpecificFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // Generate service schema
    const schemaPath = this.generateServiceSchema(coreInputs, confirmedValues, servicePath);
    files.push(schemaPath);

    // Generate service handlers
    const handlersPath = this.generateServiceHandlers(coreInputs, confirmedValues, servicePath);
    files.push(handlersPath);

    // Generate service middleware
    const middlewarePath = this.generateServiceMiddleware(coreInputs, confirmedValues, servicePath);
    files.push(middlewarePath);

    // Generate service utils
    const utilsPath = this.generateServiceUtils(coreInputs, confirmedValues, servicePath);
    files.push(utilsPath);

    return files;
  }

  /**
   * Generate environment and deployment files
   */
  generateEnvironmentFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // scripts/deploy.ps1
    files.push(this.generateDeployScript(coreInputs, confirmedValues, servicePath));

    // scripts/setup.ps1
    files.push(this.generateSetupScript(coreInputs, confirmedValues, servicePath));

    // scripts/health-check.ps1
    files.push(this.generateHealthCheckScript(coreInputs, confirmedValues, servicePath));

    // config/production.env
    files.push(this.generateProductionEnv(coreInputs, confirmedValues, servicePath));

    // config/staging.env
    files.push(this.generateStagingEnv(coreInputs, confirmedValues, servicePath));

    // config/development.env
    files.push(this.generateDevelopmentEnv(coreInputs, confirmedValues, servicePath));

    return files;
  }

  /**
   * Generate testing and quality assurance files
   */
  generateTestingFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // test/unit/service.test.js
    files.push(this.generateUnitTests(coreInputs, confirmedValues, servicePath));

    // test/integration/service.integration.test.js
    files.push(this.generateIntegrationTests(coreInputs, confirmedValues, servicePath));

    // jest.config.js
    files.push(this.generateJestConfig(coreInputs, confirmedValues, servicePath));

    // .eslintrc.js
    files.push(this.generateEslintConfig(coreInputs, confirmedValues, servicePath));

    return files;
  }

  /**
   * Generate documentation files
   */
  generateDocumentationFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // README.md
    files.push(this.generateReadme(coreInputs, confirmedValues, servicePath));

    // docs/API.md
    files.push(this.generateApiDocs(coreInputs, confirmedValues, servicePath));

    // docs/DEPLOYMENT.md
    files.push(this.generateDeploymentDocs(coreInputs, confirmedValues, servicePath));

    // docs/CONFIGURATION.md
    files.push(this.generateConfigurationDocs(coreInputs, confirmedValues, servicePath));

    return files;
  }

  /**
   * Generate automation and CI/CD files
   */
  generateAutomationFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // .github/workflows/ci.yml
    files.push(this.generateCiWorkflow(coreInputs, confirmedValues, servicePath));

    // .github/workflows/deploy.yml
    files.push(this.generateDeployWorkflow(coreInputs, confirmedValues, servicePath));

    // .gitignore
    files.push(this.generateGitignore(coreInputs, confirmedValues, servicePath));

    // docker-compose.yml (for local development)
    files.push(this.generateDockerCompose(coreInputs, confirmedValues, servicePath));

    return files;
  }

  /**
   * Generate package.json
   */
  generatePackageJson(coreInputs, confirmedValues, servicePath) {
    const packageJson = {
      name: confirmedValues.packageName,
      version: confirmedValues.version,
      description: confirmedValues.description,
      main: "src/worker/index.js",
      type: "module",
      scripts: {
        // Development
        dev: "wrangler dev",
        
        // Testing
        test: "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage",
        
        // Deployment (cross-platform via framework)
        deploy: "clodo-service deploy",
        "deploy:dev": "node scripts/deploy.js development",
        "deploy:staging": "node scripts/deploy.js staging",
        "deploy:prod": "node scripts/deploy.js production",
        
        // Code Quality
        lint: "eslint src/ test/",
        "lint:fix": "eslint src/ test/ --fix",
        format: "prettier --write src/ test/",
        
        // Utilities
        validate: "clodo-service validate .",
        diagnose: "clodo-service diagnose .",
        build: "wrangler deploy --dry-run",
        clean: "rimraf dist/ coverage/"
      },
      dependencies: {
        "@tamyla/clodo-framework": "^2.0.20",
        "uuid": "^13.0.0",  // Required for auth handlers
        "wrangler": "^3.0.0"
      },
      devDependencies: {
        "@types/jest": "^29.5.0",
        "@types/node": "^20.0.0",
        "eslint": "^8.54.0",
        "jest": "^29.7.0",
        "prettier": "^3.1.0",
        "rimraf": "^5.0.0"
      },
      author: confirmedValues.author,
      license: "MIT",
      repository: {
        type: "git",
        url: confirmedValues.gitRepositoryUrl
      },
      keywords: [
        "clodo-framework",
        coreInputs.serviceType,
        "cloudflare",
        "serverless"
      ],
      engines: {
        node: ">=18.0.0"
      }
    };

    const filePath = join(servicePath, 'package.json');
    writeFileSync(filePath, JSON.stringify(packageJson, null, 2), 'utf8');
    return filePath;
  }

  /**
   * Generate wrangler.toml
   */
  generateWranglerToml(coreInputs, confirmedValues, servicePath) {
    const wranglerToml = `# Cloudflare Workers Configuration for ${confirmedValues.displayName}
name = "${confirmedValues.workerName}"
main = "src/worker/index.js"
compatibility_date = "${new Date().toISOString().split('T')[0]}"
compatibility_flags = ["nodejs_compat"]

# Account configuration
account_id = "${coreInputs.cloudflareAccountId}"

# Environment configurations
[env.development]
name = "${confirmedValues.workerName}-dev"

[env.staging]
name = "${confirmedValues.workerName}-staging"

[env.production]
name = "${confirmedValues.workerName}"

# Database bindings
[[d1_databases]]
binding = "DB"
database_name = "${confirmedValues.databaseName}"
database_id = ""  # To be configured during setup

# Environment variables
[vars]
SERVICE_NAME = "${coreInputs.serviceName}"
SERVICE_TYPE = "${coreInputs.serviceType}"
DOMAIN_NAME = "${coreInputs.domainName}"
ENVIRONMENT = "${coreInputs.environment}"
API_BASE_PATH = "${confirmedValues.apiBasePath}"
HEALTH_CHECK_PATH = "${confirmedValues.healthCheckPath}"

# Domain-specific variables
PRODUCTION_URL = "${confirmedValues.productionUrl}"
STAGING_URL = "${confirmedValues.stagingUrl}"
DEVELOPMENT_URL = "${confirmedValues.developmentUrl}"

# Feature flags
${Object.entries(confirmedValues.features)
  .filter(([, enabled]) => enabled)
  .map(([feature, enabled]) => `FEATURE_${feature.toUpperCase()} = ${enabled}`)
  .join('\n')}

# Custom environment variables (configure as needed)
# CUSTOM_VAR = "value"
`;

    const filePath = join(servicePath, 'wrangler.toml');
    writeFileSync(filePath, wranglerToml, 'utf8');
    return filePath;
  }

  /**
   * Generate domains.js configuration
   */
  generateDomainsConfig(coreInputs, confirmedValues, servicePath) {
    const domainsConfig = `import { createDomainConfigSchema } from '@tamyla/clodo-framework';

/**
 * Domain configuration for ${confirmedValues.displayName}
 *
 * Generated by Clodo Framework GenerationEngine
 * Service Type: ${coreInputs.serviceType}
 * Generated: ${new Date().toISOString()}
 */

export const domains = {
  '${coreInputs.serviceName}': {
    ...createDomainConfigSchema(),
    name: '${coreInputs.serviceName}',
    displayName: '${confirmedValues.displayName}',
    description: '${confirmedValues.description}',
    accountId: '${coreInputs.cloudflareAccountId}',
    zoneId: '${coreInputs.cloudflareZoneId}',
    domains: {
      production: '${confirmedValues.productionUrl}',
      staging: '${confirmedValues.stagingUrl}',
      development: '${confirmedValues.developmentUrl}'
    },
    services: [
      '${coreInputs.serviceName}'
    ],
    databases: [
      {
        name: '${confirmedValues.databaseName}',
        type: 'd1',
        binding: 'DB'
      }
    ],
    features: ${JSON.stringify(confirmedValues.features, null, 4)},
    metadata: {
      version: '${confirmedValues.version}',
      author: '${confirmedValues.author}',
      generatedAt: '${new Date().toISOString()}',
      frameworkVersion: '3.0.0',
      serviceType: '${coreInputs.serviceType}',
      environment: '${coreInputs.environment}'
    }
  }
};

export default domains;
`;

    const filePath = join(servicePath, 'src', 'config', 'domains.js');
    writeFileSync(filePath, domainsConfig, 'utf8');
    return filePath;
  }

  /**
   * Generate worker index.js
   */
  generateWorkerIndex(coreInputs, confirmedValues, servicePath) {
    const workerIndex = `/**
 * ${confirmedValues.displayName} - Cloudflare Worker
 *
 * Generated by Clodo Framework GenerationEngine
 * Service Type: ${coreInputs.serviceType}
 */

import { domains } from '../config/domains.js';
import { createServiceHandlers } from '../handlers/service-handlers.js';
import { createServiceMiddleware } from '../middleware/service-middleware.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // Get service configuration
      const serviceConfig = domains['${coreInputs.serviceName}'];

      // Apply middleware
      const middleware = createServiceMiddleware(serviceConfig, env);
      const processedRequest = await middleware.processRequest(request);

      // Route to appropriate handler
      const handlers = createServiceHandlers(serviceConfig, env);
      const response = await handlers.handleRequest(processedRequest, ctx);

      // Apply response middleware
      return await middleware.processResponse(response);

    } catch (error) {
      console.error('Worker error:', error);

      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Service': '${coreInputs.serviceName}',
          'X-Version': '${confirmedValues.version}'
        }
      });
    }
  }
};
`;

    const filePath = join(servicePath, 'src', 'worker', 'index.js');
    writeFileSync(filePath, workerIndex, 'utf8');
    return filePath;
  }

  /**
   * Generate .env.example
   */
  generateEnvExample(coreInputs, confirmedValues, servicePath) {
    const envExample = `# ${confirmedValues.displayName} Environment Variables
# Generated by Clodo Framework GenerationEngine

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=${coreInputs.cloudflareAccountId}
CLOUDFLARE_ZONE_ID=${coreInputs.cloudflareZoneId}
CLOUDFLARE_API_TOKEN=${coreInputs.cloudflareToken}

# Service Configuration
SERVICE_NAME=${coreInputs.serviceName}
SERVICE_TYPE=${coreInputs.serviceType}
DOMAIN_NAME=${coreInputs.domainName}
ENVIRONMENT=${coreInputs.environment}

# URLs
PRODUCTION_URL=${confirmedValues.productionUrl}
STAGING_URL=${confirmedValues.stagingUrl}
DEVELOPMENT_URL=${confirmedValues.developmentUrl}
DOCUMENTATION_URL=${confirmedValues.documentationUrl}

# API Configuration
API_BASE_PATH=${confirmedValues.apiBasePath}
HEALTH_CHECK_PATH=${confirmedValues.healthCheckPath}

# Database Configuration
DATABASE_NAME=${confirmedValues.databaseName}

# Feature Flags
${Object.entries(confirmedValues.features)
  .filter(([, enabled]) => enabled)
  .map(([feature]) => `FEATURE_${feature.toUpperCase()}=true`)
  .join('\n')}

# Custom environment variables (uncomment and configure as needed)
# CUSTOM_VAR=value
# API_KEY=your-api-key-here
# SECRET_KEY=your-secret-key-here
`;

    const filePath = join(servicePath, '.env.example');
    writeFileSync(filePath, envExample, 'utf8');
    return filePath;
  }

  /**
   * Generate service schema
   */
  generateServiceSchema(coreInputs, confirmedValues, servicePath) {
    const schemaContent = `/**
 * ${confirmedValues.displayName} - Service Schema
 *
 * Generated by Clodo Framework GenerationEngine
 * Service Type: ${coreInputs.serviceType}
 */

import { z } from 'zod';

// Base service schema
export const baseServiceSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.string().default('${confirmedValues.version}')
});

// Service-specific schemas based on type
${this.generateServiceTypeSchemas(coreInputs.serviceType)}

// Request/Response schemas
export const healthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string().datetime(),
  service: z.string(),
  version: z.string(),
  environment: z.string()
});

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
  service: z.string(),
  version: z.string()
});

// Validation helpers
export function validateServiceRequest(data, schema) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    return {
      success: false,
      error: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    };
  }
}

export function createServiceResponse(data, schema) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    throw new Error(\`Response validation failed: \${error.message}\`);
  }
}
`;

    const filePath = join(servicePath, 'src', 'schemas', 'service-schema.js');
    writeFileSync(filePath, schemaContent, 'utf8');
    return filePath;
  }

  /**
   * Generate service type specific schemas
   */
  generateServiceTypeSchemas(serviceType) {
    const schemas = {
      'data-service': `
export const dataItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  data: z.record(z.any()),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active')
});

export const dataQuerySchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  search: z.string().optional(),
  filters: z.record(z.any()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});`,
      'auth-service': `
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  displayName: z.string().min(1).max(100),
  roles: z.array(z.string()),
  isActive: z.boolean().default(true),
  lastLogin: z.date().optional(),
  emailVerified: z.boolean().default(false)
});

export const authTokenSchema = z.object({
  token: z.string(),
  type: z.enum(['access', 'refresh']),
  expiresAt: z.date(),
  userId: z.string().uuid(),
  scopes: z.array(z.string())
});`,
      'content-service': `
export const contentItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string(),
  contentType: z.enum(['article', 'page', 'media', 'document']),
  slug: z.string().min(1).max(100),
  author: z.string(),
  published: z.boolean().default(false),
  publishedAt: z.date().optional(),
  tags: z.array(z.string()),
  metadata: z.record(z.any())
});

export const mediaAssetSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  altText: z.string().optional()
});`,
      'api-gateway': `
export const apiRouteSchema = z.object({
  path: z.string().regex(/^\\/.*/),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']),
  targetService: z.string(),
  targetPath: z.string(),
  rateLimit: z.number().optional(),
  authentication: z.boolean().default(false),
  authorization: z.array(z.string()).optional()
});

export const apiMetricsSchema = z.object({
  route: z.string(),
  method: z.string(),
  responseTime: z.number(),
  statusCode: z.number(),
  timestamp: z.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional()
});`,
      'generic': `
export const genericItemSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  data: z.record(z.any()),
  metadata: z.record(z.any()).optional()
});`
    };

    return schemas[serviceType] || schemas.generic;
  }

  /**
   * Generate service handlers
   */
  generateServiceHandlers(coreInputs, confirmedValues, servicePath) {
    const handlersContent = `/**
 * ${confirmedValues.displayName} - Service Handlers
 *
 * Generated by Clodo Framework GenerationEngine
 * Service Type: ${coreInputs.serviceType}
 */

import { healthCheckResponseSchema, errorResponseSchema } from '../schemas/service-schema.js';

export function createServiceHandlers(serviceConfig, env) {
  return {
    async handleRequest(request, ctx) {
      const url = new URL(request.url);
      const path = url.pathname;

      // Health check endpoint
      if (path === '${confirmedValues.healthCheckPath}') {
        return this.handleHealthCheck(request, serviceConfig);
      }

      // API routes
      if (path.startsWith('${confirmedValues.apiBasePath}')) {
        return this.handleApiRequest(request, ctx, serviceConfig, env);
      }

      // Default 404 response
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: \`Endpoint not found: \${path}\`,
        availableEndpoints: [
          '${confirmedValues.healthCheckPath}',
          '${confirmedValues.apiBasePath}/*'
        ]
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    },

    async handleHealthCheck(request, serviceConfig) {
      try {
        // Perform health checks
        const healthStatus = await this.performHealthChecks(serviceConfig, env);

        const response = {
          status: healthStatus.overall === 'healthy' ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          service: serviceConfig.name,
          version: '${confirmedValues.version}',
          environment: '${coreInputs.environment}',
          checks: healthStatus.checks
        };

        return new Response(JSON.stringify(response), {
          status: healthStatus.overall === 'healthy' ? 200 : 503,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          service: serviceConfig.name,
          error: error.message
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    },

    async handleApiRequest(request, ctx, serviceConfig, env) {
      try {
        const url = new URL(request.url);
        const path = url.pathname.replace('${confirmedValues.apiBasePath}', '');

        // Route to service-specific handlers
        switch (request.method) {
          case 'GET':
            return this.handleGet(path, request, ctx, serviceConfig, env);
          case 'POST':
            return this.handlePost(path, request, ctx, serviceConfig, env);
          case 'PUT':
            return this.handlePut(path, request, ctx, serviceConfig, env);
          case 'DELETE':
            return this.handleDelete(path, request, ctx, serviceConfig, env);
          default:
            return new Response(JSON.stringify({
              error: 'Method Not Allowed',
              message: \`Method \${request.method} not supported\`
            }), {
              status: 405,
              headers: { 'Content-Type': 'application/json' }
            });
        }
      } catch (error) {
        return new Response(JSON.stringify({
          error: 'Internal Server Error',
          message: error.message,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    },

    async performHealthChecks(serviceConfig, env) {
      const checks = [];

      // Database connectivity check
      try {
        ${confirmedValues.features.database ? `
        // Check database connection
        const dbCheck = await env.DB.prepare('SELECT 1 as health_check').first();
        checks.push({
          name: 'database',
          status: dbCheck ? 'healthy' : 'unhealthy',
          responseTime: Date.now()
        });` : `
        checks.push({
          name: 'database',
          status: 'disabled',
          message: 'Database not configured for this service type'
        });`}
      } catch (error) {
        checks.push({
          name: 'database',
          status: 'unhealthy',
          error: error.message
        });
      }

      // Service configuration check
      checks.push({
        name: 'configuration',
        status: serviceConfig ? 'healthy' : 'unhealthy',
        message: serviceConfig ? 'Service configuration loaded' : 'Service configuration missing'
      });

      // Overall health status
      const overall = checks.every(check => check.status === 'healthy' || check.status === 'disabled')
        ? 'healthy' : 'unhealthy';

      return { overall, checks };
    },

    // Placeholder handlers - implement based on service type
    async handleGet(path, request, ctx, serviceConfig, env) {
      return new Response(JSON.stringify({
        message: 'GET handler not implemented',
        path,
        service: serviceConfig.name,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    },

    async handlePost(path, request, ctx, serviceConfig, env) {
      return new Response(JSON.stringify({
        message: 'POST handler not implemented',
        path,
        service: serviceConfig.name,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    },

    async handlePut(path, request, ctx, serviceConfig, env) {
      return new Response(JSON.stringify({
        message: 'PUT handler not implemented',
        path,
        service: serviceConfig.name,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    },

    async handleDelete(path, request, ctx, serviceConfig, env) {
      return new Response(JSON.stringify({
        message: 'DELETE handler not implemented',
        path,
        service: serviceConfig.name,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}
`;

    const filePath = join(servicePath, 'src', 'handlers', 'service-handlers.js');
    writeFileSync(filePath, handlersContent, 'utf8');
    return filePath;
  }

  /**
   * Generate service middleware
   */
  generateServiceMiddleware(coreInputs, confirmedValues, servicePath) {
    const middlewareContent = `/**
 * ${confirmedValues.displayName} - Service Middleware
 *
 * Generated by Clodo Framework GenerationEngine
 * Service Type: ${coreInputs.serviceType}
 */

export function createServiceMiddleware(serviceConfig, env) {
  return {
    async processRequest(request) {
      let processedRequest = request;

      // Add service context headers
      const headers = new Headers(request.headers);
      headers.set('X-Service', serviceConfig.name);
      headers.set('X-Version', '${confirmedValues.version}');
      headers.set('X-Environment', '${coreInputs.environment}');
      headers.set('X-Request-ID', crypto.randomUUID());

      // CORS headers for API requests
      if (request.url.includes('${confirmedValues.apiBasePath}')) {
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }

      ${confirmedValues.features.logging ? `
      // Request logging
      console.log(\`[\${new Date().toISOString()}] \${request.method} \${request.url}\`);` : ''}

      ${confirmedValues.features.rateLimiting ? `
      // Rate limiting (placeholder - implement based on requirements)
      // This would typically check request frequency and block if over limit` : ''}

      ${confirmedValues.features.authentication ? `
      // Authentication middleware (placeholder)
      // This would validate JWT tokens, API keys, etc.` : ''}

      ${confirmedValues.features.authorization ? `
      // Authorization middleware (placeholder)
      // This would check user permissions and roles` : ''}

      return new Request(request.url, {
        ...request,
        headers
      });
    },

    async processResponse(response) {
      const headers = new Headers(response.headers);

      // Add standard response headers
      headers.set('X-Service', serviceConfig.name);
      headers.set('X-Version', '${confirmedValues.version}');
      headers.set('X-Response-Time', Date.now().toString());

      ${confirmedValues.features.monitoring ? `
      // Response monitoring
      console.log(\`Response: \${response.status} (\${Date.now()}ms)\`);` : ''}

      ${confirmedValues.features.caching ? `
      // Cache headers (placeholder - implement based on content type)
      if (response.status === 200) {
        headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      }` : ''}

      return new Response(response.body, {
        ...response,
        headers
      });
    }
  };
}
`;

    const filePath = join(servicePath, 'src', 'middleware', 'service-middleware.js');
    writeFileSync(filePath, middlewareContent, 'utf8');
    return filePath;
  }

  /**
   * Generate service utilities
   */
  generateServiceUtils(coreInputs, confirmedValues, servicePath) {
    const utilsContent = `/**
 * ${confirmedValues.displayName} - Service Utilities
 *
 * Generated by Clodo Framework GenerationEngine
 * Service Type: ${coreInputs.serviceType}
 */

/**
 * Utility functions for ${confirmedValues.displayName}
 */

// Database utilities
export class DatabaseUtils {
  static async executeQuery(env, query, params = []) {
    try {
      const stmt = env.DB.prepare(query);
      if (params.length > 0) {
        return await stmt.bind(...params).all();
      }
      return await stmt.all();
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error(\`Database operation failed: \${error.message}\`);
    }
  }

  static async getById(env, table, id) {
    const result = await this.executeQuery(
      env,
      \`SELECT * FROM \${table} WHERE id = ?\`,
      [id]
    );
    return result.results[0] || null;
  }

  static async create(env, table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const result = await this.executeQuery(
      env,
      \`INSERT INTO \${table} (\${columns}) VALUES (\${placeholders})\`,
      values
    );

    return result.meta.last_row_id;
  }

  static async update(env, table, id, data) {
    const setClause = Object.keys(data).map(key => \`\${key} = ?\`).join(', ');
    const values = [...Object.values(data), id];

    const result = await this.executeQuery(
      env,
      \`UPDATE \${table} SET \${setClause} WHERE id = ?\`,
      values
    );

    return result.meta.changes > 0;
  }

  static async delete(env, table, id) {
    const result = await this.executeQuery(
      env,
      \`DELETE FROM \${table} WHERE id = ?\`,
      [id]
    );

    return result.meta.changes > 0;
  }
}

// Validation utilities
export class ValidationUtils {
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static isValidEmail(email) {
    const emailRegex = /^[^@]+@[^@]+.[^@]+$/;
    return emailRegex.test(email);
  }

  static sanitizeString(str, maxLength = 1000) {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength);
  }

  static validatePagination(limit = 20, offset = 0) {
    const maxLimit = 100;
    const sanitizedLimit = Math.min(Math.max(1, limit), maxLimit);
    const sanitizedOffset = Math.max(0, offset);

    return { limit: sanitizedLimit, offset: sanitizedOffset };
  }
}

// Response utilities
export class ResponseUtils {
  static createSuccessResponse(data, status = 200) {
    return new Response(JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static createErrorResponse(error, status = 500, details = null) {
    const errorResponse = {
      success: false,
      error: error.message || 'Internal Server Error',
      timestamp: new Date().toISOString()
    };

    if (details) {
      errorResponse.details = details;
    }

    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static createPaginatedResponse(data, pagination, status = 200) {
    return new Response(JSON.stringify({
      success: true,
      data,
      pagination: {
        ...pagination,
        hasMore: data.length === pagination.limit
      },
      timestamp: new Date().toISOString()
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Logging utilities
export class LoggingUtils {
  static logRequest(request, context = {}) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'request',
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('User-Agent'),
      ...context
    }));
  }

  static logError(error, context = {}) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'error',
      message: error.message,
      stack: error.stack,
      ...context
    }));
  }

  static logPerformance(operation, startTime, context = {}) {
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'performance',
      operation,
      duration,
      ...context
    }));
  }
}

// Feature flag utilities
export class FeatureUtils {
  static isFeatureEnabled(featureName, serviceConfig) {
    return serviceConfig.features && serviceConfig.features[featureName] === true;
  }

  static getEnabledFeatures(serviceConfig) {
    if (!serviceConfig.features) return [];
    return Object.entries(serviceConfig.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature);
  }

  static getDisabledFeatures(serviceConfig) {
    if (!serviceConfig.features) return [];
    return Object.entries(serviceConfig.features)
      .filter(([, enabled]) => !enabled)
      .map(([feature]) => feature);
  }
}
`;

    const filePath = join(servicePath, 'src', 'utils', 'service-utils.js');
    writeFileSync(filePath, utilsContent, 'utf8');
    return filePath;
  }

  /**
   * Generate deployment script
   */
  generateDeployScript(coreInputs, confirmedValues, servicePath) {
    const deployScript = `#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Deploy ${confirmedValues.displayName} to Cloudflare

.DESCRIPTION
    Automated deployment script for ${confirmedValues.displayName}
    Handles database setup, worker deployment, and environment configuration

.PARAMETER Environment
    Target environment (development, staging, production)

.PARAMETER SkipTests
    Skip running tests before deployment

.EXAMPLE
    .\\scripts\\deploy.ps1 -Environment production

.EXAMPLE
    .\\scripts\\deploy.ps1 -Environment staging -SkipTests
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'development',

    [Parameter(Mandatory = $false)]
    [switch]$SkipTests
)

Write-Host "🚀 Deploying ${confirmedValues.displayName} to $Environment" -ForegroundColor Cyan

# Load environment variables
if (Test-Path ".env") {
    Write-Host "📄 Loading environment variables from .env" -ForegroundColor Gray
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value)
        }
    }
}

try {
    # Run tests unless skipped
    if (-not $SkipTests) {
        Write-Host "🧪 Running tests..." -ForegroundColor Yellow
        npm test
        if ($LASTEXITCODE -ne 0) {
            throw "Tests failed. Aborting deployment."
        }
    }

    # Lint code
    Write-Host "🔍 Running linter..." -ForegroundColor Yellow
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        throw "Linting failed. Aborting deployment."
    }

    # Deploy to Cloudflare
    Write-Host "☁️  Deploying to Cloudflare Workers..." -ForegroundColor Yellow
    npx wrangler deploy --env $Environment

    if ($LASTEXITCODE -ne 0) {
        throw "Cloudflare deployment failed."
    }

    # Run health check
    Write-Host "🏥 Running health check..." -ForegroundColor Yellow
    .\\scripts\\health-check.ps1 -Environment $Environment

    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Service URL: ${confirmedValues.productionUrl}" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}
`;

    const filePath = join(servicePath, 'scripts', 'deploy.ps1');
    writeFileSync(filePath, deployScript, 'utf8');
    return filePath;
  }

  /**
   * Generate setup script
   */
  generateSetupScript(coreInputs, confirmedValues, servicePath) {
    const setupScript = `#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Setup ${confirmedValues.displayName} environment

.DESCRIPTION
    Initializes the development environment for ${confirmedValues.displayName}
    Sets up database, configures environment variables, and prepares for development

.EXAMPLE
    .\\scripts\\setup.ps1
#>

Write-Host "🔧 Setting up ${confirmedValues.displayName} development environment" -ForegroundColor Cyan

try {
    # Check if .env exists
    if (-not (Test-Path ".env")) {
        Write-Host "📄 Creating .env file from template..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env" -Force
        Write-Host "⚠️  Please edit .env file with your actual values" -ForegroundColor Yellow
    }

    # Install dependencies
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install

    # Create database (if configured)
    ${confirmedValues.features.database ? `
    Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow
    # Database setup would go here
    Write-Host "⚠️  Database setup requires manual configuration" -ForegroundColor Yellow
    ` : `
    Write-Host "ℹ️  Database not required for this service type" -ForegroundColor Gray
    `}

    # Run initial build
    Write-Host "🔨 Running initial build..." -ForegroundColor Yellow
    npm run build

    # Run tests
    Write-Host "🧪 Running tests..." -ForegroundColor Yellow
    npm test

    Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
    Write-Host "🚀 You can now run 'npm run dev' to start development" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Setup failed: $_" -ForegroundColor Red
    exit 1
}
`;

    const filePath = join(servicePath, 'scripts', 'setup.ps1');
    writeFileSync(filePath, setupScript, 'utf8');
    return filePath;
  }

  /**
   * Generate health check script
   */
  generateHealthCheckScript(coreInputs, confirmedValues, servicePath) {
    const healthCheckScript = `#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Health check for ${confirmedValues.displayName}

.DESCRIPTION
    Performs health checks on ${confirmedValues.displayName} service
    Tests endpoints, database connectivity, and overall service health

.PARAMETER Environment
    Target environment to check (development, staging, production)

.EXAMPLE
    .\\scripts\\health-check.ps1 -Environment production
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'development'
)

Write-Host "🏥 Running health checks for ${confirmedValues.displayName} ($Environment)" -ForegroundColor Cyan

# Determine service URL based on environment
$serviceUrl = switch ($Environment) {
    'production' { "${confirmedValues.productionUrl}" }
    'staging' { "${confirmedValues.stagingUrl}" }
    'development' { "${confirmedValues.developmentUrl}" }
}

Write-Host "🌐 Checking service at: $serviceUrl" -ForegroundColor Gray

try {
    # Health check endpoint
    $healthUrl = "$serviceUrl${confirmedValues.healthCheckPath}"
    Write-Host "🔍 Testing health endpoint: $healthUrl" -ForegroundColor Yellow

    $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 30
    if ($response.status -eq 'healthy') {
        Write-Host "✅ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Health check failed: $($response | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }

    # API endpoint check
    $apiUrl = "$serviceUrl${confirmedValues.apiBasePath}"
    Write-Host "🔍 Testing API endpoint: $apiUrl" -ForegroundColor Yellow

    try {
        $apiResponse = Invoke-WebRequest -Uri $apiUrl -Method GET -TimeoutSec 30
        Write-Host "✅ API endpoint accessible (Status: $($apiResponse.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  API endpoint returned error (may be expected): $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host "✅ All health checks completed successfully!" -ForegroundColor Green

} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    exit 1
}
`;

    const filePath = join(servicePath, 'scripts', 'health-check.ps1');
    writeFileSync(filePath, healthCheckScript, 'utf8');
    return filePath;
  }

  /**
   * Generate environment configuration files
   */
  generateProductionEnv(coreInputs, confirmedValues, servicePath) {
    const envContent = `# Production Environment Configuration
# Generated by Clodo Framework GenerationEngine

# Service Configuration
SERVICE_NAME=${coreInputs.serviceName}
SERVICE_TYPE=${coreInputs.serviceType}
ENVIRONMENT=production

# URLs
PRODUCTION_URL=${confirmedValues.productionUrl}
STAGING_URL=${confirmedValues.stagingUrl}
DEVELOPMENT_URL=${confirmedValues.developmentUrl}

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=${coreInputs.cloudflareAccountId}
CLOUDFLARE_ZONE_ID=${coreInputs.cloudflareZoneId}

# Database
DATABASE_NAME=${confirmedValues.databaseName}

# Logging and Monitoring
LOG_LEVEL=warn
METRICS_ENABLED=true
ERROR_REPORTING_ENABLED=true
`;

    const filePath = join(servicePath, 'config', 'production.env');
    writeFileSync(filePath, envContent, 'utf8');
    return filePath;
  }

  generateStagingEnv(coreInputs, confirmedValues, servicePath) {
    const envContent = `# Staging Environment Configuration
# Generated by Clodo Framework GenerationEngine

# Service Configuration
SERVICE_NAME=${coreInputs.serviceName}
SERVICE_TYPE=${coreInputs.serviceType}
ENVIRONMENT=staging

# URLs
PRODUCTION_URL=${confirmedValues.productionUrl}
STAGING_URL=${confirmedValues.stagingUrl}
DEVELOPMENT_URL=${confirmedValues.developmentUrl}

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=${coreInputs.cloudflareAccountId}
CLOUDFLARE_ZONE_ID=${coreInputs.cloudflareZoneId}

# Database
DATABASE_NAME=${confirmedValues.databaseName}

# Logging and Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
ERROR_REPORTING_ENABLED=true
`;

    const filePath = join(servicePath, 'config', 'staging.env');
    writeFileSync(filePath, envContent, 'utf8');
    return filePath;
  }

  generateDevelopmentEnv(coreInputs, confirmedValues, servicePath) {
    const envContent = `# Development Environment Configuration
# Generated by Clodo Framework GenerationEngine

# Service Configuration
SERVICE_NAME=${coreInputs.serviceName}
SERVICE_TYPE=${coreInputs.serviceType}
ENVIRONMENT=development

# URLs
PRODUCTION_URL=${confirmedValues.productionUrl}
STAGING_URL=${confirmedValues.stagingUrl}
DEVELOPMENT_URL=${confirmedValues.developmentUrl}

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=${coreInputs.cloudflareAccountId}
CLOUDFLARE_ZONE_ID=${coreInputs.cloudflareZoneId}

# Database
DATABASE_NAME=${confirmedValues.databaseName}

# Logging and Monitoring
LOG_LEVEL=debug
METRICS_ENABLED=false
ERROR_REPORTING_ENABLED=false

# Development settings
DEBUG_MODE=true
HOT_RELOAD=true
`;

    const filePath = join(servicePath, 'config', 'development.env');
    writeFileSync(filePath, envContent, 'utf8');
    return filePath;
  }

  /**
   * Generate unit tests
   */
  generateUnitTests(coreInputs, confirmedValues, servicePath) {
    const testContent = `/**
 * ${confirmedValues.displayName} - Unit Tests
 *
 * Generated by Clodo Framework GenerationEngine
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createServiceHandlers } from '../../src/handlers/service-handlers.js';
import { createServiceMiddleware } from '../../src/middleware/service-middleware.js';
import { domains } from '../../src/config/domains.js';

describe('${confirmedValues.displayName} Service', () => {
  let mockEnv;
  let serviceConfig;

  beforeEach(() => {
    // Mock environment
    mockEnv = {
      DB: {
        prepare: jest.fn(() => ({
          first: jest.fn().mockResolvedValue({ health_check: 1 }),
          all: jest.fn().mockResolvedValue({ results: [], meta: {} })
        }))
      }
    };

    serviceConfig = domains['${coreInputs.serviceName}'];
  });

  describe('Health Check Handler', () => {
    test('should return healthy status', async () => {
      const handlers = createServiceHandlers(serviceConfig, mockEnv);
      const request = new Request('http://localhost${confirmedValues.healthCheckPath}');

      const response = await handlers.handleHealthCheck(request, serviceConfig);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('${coreInputs.serviceName}');
      expect(data.version).toBe('${confirmedValues.version}');
    });

    test('should handle database errors gracefully', async () => {
      const failingEnv = {
        DB: {
          prepare: jest.fn(() => ({
            first: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          }))
        }
      };

      const handlers = createServiceHandlers(serviceConfig, failingEnv);
      const request = new Request('http://localhost${confirmedValues.healthCheckPath}');

      const response = await handlers.handleHealthCheck(request, serviceConfig);
      const data = await response.json();

      expect(response.status).toBe(200); // Health check still returns 200 but with unhealthy status
      expect(data.status).toBe('unhealthy');
    });
  });

  describe('API Request Handler', () => {
    test('should handle GET requests', async () => {
      const handlers = createServiceHandlers(serviceConfig, mockEnv);
      const request = new Request('http://localhost${confirmedValues.apiBasePath}/test', {
        method: 'GET'
      });

      const response = await handlers.handleApiRequest(request, {}, serviceConfig, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('GET handler not implemented');
    });

    test('should handle POST requests', async () => {
      const handlers = createServiceHandlers(serviceConfig, mockEnv);
      const request = new Request('http://localhost${confirmedValues.apiBasePath}/test', {
        method: 'POST'
      });

      const response = await handlers.handleApiRequest(request, {}, serviceConfig, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('POST handler not implemented');
    });

    test('should return 405 for unsupported methods', async () => {
      const handlers = createServiceHandlers(serviceConfig, mockEnv);
      const request = new Request('http://localhost${confirmedValues.apiBasePath}/test', {
        method: 'PATCH'
      });

      const response = await handlers.handleApiRequest(request, {}, serviceConfig, mockEnv);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method Not Allowed');
    });
  });

  describe('Middleware', () => {
    test('should add service headers to requests', async () => {
      const middleware = createServiceMiddleware(serviceConfig, mockEnv);
      const request = new Request('http://localhost/test');

      const processedRequest = await middleware.processRequest(request);

      expect(processedRequest.headers.get('X-Service')).toBe('${coreInputs.serviceName}');
      expect(processedRequest.headers.get('X-Version')).toBe('${confirmedValues.version}');
      expect(processedRequest.headers.get('X-Environment')).toBe('${coreInputs.environment}');
      expect(processedRequest.headers.get('X-Request-ID')).toBeDefined();
    });

    test('should add CORS headers for API requests', async () => {
      const middleware = createServiceMiddleware(serviceConfig, mockEnv);
      const request = new Request('http://localhost${confirmedValues.apiBasePath}/test');

      const processedRequest = await middleware.processRequest(request);

      expect(processedRequest.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(processedRequest.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });
  });

  describe('404 Handler', () => {
    test('should return 404 for unknown endpoints', async () => {
      const handlers = createServiceHandlers(serviceConfig, mockEnv);
      const request = new Request('http://localhost/unknown-endpoint');

      const response = await handlers.handleRequest(request, {});
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
      expect(data.availableEndpoints).toContain('${confirmedValues.healthCheckPath}');
    });
  });
});
`;

    const filePath = join(servicePath, 'test', 'unit', 'service.test.js');
    writeFileSync(filePath, testContent, 'utf8');
    return filePath;
  }

  /**
   * Generate integration tests
   */
  generateIntegrationTests(coreInputs, confirmedValues, servicePath) {
    const integrationTestContent = `/**
 * ${confirmedValues.displayName} - Integration Tests
 *
 * Generated by Clodo Framework GenerationEngine
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('${confirmedValues.displayName} Integration Tests', () => {
  let testServer;
  let baseUrl;

  beforeAll(async () => {
    // Start test server (this would need to be implemented)
    // testServer = await startTestServer();
    // baseUrl = testServer.url;
    baseUrl = 'http://localhost:8787'; // Placeholder
  });

  afterAll(async () => {
    // Stop test server
    // await testServer.stop();
  });

  describe('End-to-End Service Flow', () => {
    test('complete service lifecycle', async () => {
      // This would test the complete flow from request to response
      // Including middleware, handlers, database operations, etc.

      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('API Endpoints', () => {
    test('health check endpoint', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('${coreInputs.serviceName}');
    });

    test('API base path routing', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}\`);

      // Should not return 404 (service-specific routing would be implemented)
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Database Integration', () => {
    ${confirmedValues.features.database ? `
    test('database connectivity', async () => {
      // Test database operations
      expect(true).toBe(true); // Placeholder
    });

    test('CRUD operations', async () => {
      // Test Create, Read, Update, Delete operations
      expect(true).toBe(true); // Placeholder
    });` : `
    test.skip('database tests skipped - not enabled for this service type', () => {
      expect(true).toBe(true);
    });`}
  });

  describe('Middleware Integration', () => {
    test('request headers added', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);

      expect(response.headers.get('x-service')).toBe('${coreInputs.serviceName}');
      expect(response.headers.get('x-version')).toBe('${confirmedValues.version}');
    });

    ${confirmedValues.features.authentication ? `
    test('authentication middleware', async () => {
      // Test authentication requirements
      expect(true).toBe(true); // Placeholder
    });` : ''}

    ${confirmedValues.features.authorization ? `
    test('authorization middleware', async () => {
      // Test authorization checks
      expect(true).toBe(true); // Placeholder
    });` : ''}
  });

  describe('Error Handling', () => {
    test('graceful error responses', async () => {
      // Test error scenarios
      expect(true).toBe(true); // Placeholder
    });

    test('error logging', async () => {
      // Test error logging functionality
      expect(true).toBe(true); // Placeholder
    });
  });
});
`;

    const filePath = join(servicePath, 'test', 'integration', 'service.integration.test.js');
    writeFileSync(filePath, integrationTestContent, 'utf8');
    return filePath;
  }

  /**
   * Generate Jest configuration
   */
  generateJestConfig(coreInputs, confirmedValues, servicePath) {
    const jestConfig = `/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/worker/index.js' // Worker code runs in different environment
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testTimeout: 10000,
  verbose: true
};
`;

    const filePath = join(servicePath, 'jest.config.js');
    writeFileSync(filePath, jestConfig, 'utf8');
    return filePath;
  }

  /**
   * Generate ESLint configuration
   */
  generateEslintConfig(coreInputs, confirmedValues, servicePath) {
    const eslintConfig = `export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        Headers: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Cloudflare Workers use console
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error'
    }
  }
];
`;

    const filePath = join(servicePath, '.eslintrc.js');
    writeFileSync(filePath, eslintConfig, 'utf8');
    return filePath;
  }

  /**
   * Generate README.md
   */
  generateReadme(coreInputs, confirmedValues, servicePath) {
    const readmeContent = `# ${confirmedValues.displayName}

${confirmedValues.description}

## 🚀 Quick Start

\\\`\\\`\\\`bash
# Setup development environment
.\\\\scripts\\\\setup.ps1

# Start development server
npm run dev

# Run tests
npm test

# Deploy to production
.\\\\scripts\\\\deploy.ps1 -Environment production
\\\`\\\`\\\`

## 📋 Features

${Object.entries(confirmedValues.features)
  .filter(([, enabled]) => enabled)
  .map(([feature]) => `- ✅ ${feature.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
  .join('\n')}

## 🏗️ Architecture

This service is built with the **Clodo Framework** and follows a three-tier architecture:

1. **Input Collection**: Collects and validates service requirements
2. **Smart Confirmations**: Generates and confirms derived configuration values
3. **Automated Generation**: Creates all necessary configuration files and components

## 📁 Project Structure

\`\`\`
${coreInputs.serviceName}/
├── src/
│   ├── config/
│   │   └── domains.js          # Domain configuration
│   ├── worker/
│   │   └── index.js            # Cloudflare Worker entry point
│   ├── handlers/
│   │   └── service-handlers.js # Request handlers
│   ├── middleware/
│   │   └── service-middleware.js # Request/response middleware
│   ├── schemas/
│   │   └── service-schema.js   # Data validation schemas
│   └── utils/
│       └── service-utils.js    # Utility functions
├── scripts/
│   ├── deploy.ps1              # Deployment script
│   ├── setup.ps1               # Environment setup
│   └── health-check.ps1        # Health monitoring
├── test/
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── config/                     # Environment configurations
├── docs/                       # Documentation
└── wrangler.toml               # Cloudflare Workers config
\`\`\`

## 🔧 Configuration

### Environment Variables

Copy \`.env.example\` to \`.env\` and configure:

\`\`\`bash
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token

# Service Configuration
SERVICE_NAME=${coreInputs.serviceName}
SERVICE_TYPE=${coreInputs.serviceType}
DOMAIN_NAME=${coreInputs.domainName}
ENVIRONMENT=${coreInputs.environment}
\`\`\`

### Service URLs

- **Production**: ${confirmedValues.productionUrl}
- **Staging**: ${confirmedValues.stagingUrl}
- **Development**: ${confirmedValues.developmentUrl}
- **Documentation**: ${confirmedValues.documentationUrl}

## 🧪 Testing

\`\`\`bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests only
npm test -- --testPathPattern=integration
\`\`\`

## 🚀 Deployment

### Development

\`\`\`bash
npm run dev
\`\`\`

### Staging

\`\`\`bash
.\\scripts\\deploy.ps1 -Environment staging
\`\`\`

### Production

\`\`\`bash
.\\scripts\\deploy.ps1 -Environment production
\`\`\`

## 🏥 Health Checks

\`\`\`bash
# Check service health
.\\scripts\\health-check.ps1 -Environment production
\`\`\`

Health check endpoint: \`${confirmedValues.healthCheckPath}\`

## 📚 API Documentation

API Base Path: \`${confirmedValues.apiBasePath}\`

See [API Documentation](./docs/API.md) for detailed endpoint information.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

${confirmedValues.author} - Generated by Clodo Framework v3.0.0

## 🔗 Links

- **Repository**: ${confirmedValues.gitRepositoryUrl}
- **Documentation**: ${confirmedValues.documentationUrl}
- **Health Check**: ${confirmedValues.productionUrl}${confirmedValues.healthCheckPath}
`;

    const filePath = join(servicePath, 'README.md');
    writeFileSync(filePath, readmeContent, 'utf8');
    return filePath;
  }

  /**
   * Generate API documentation
   */
  generateApiDocs(coreInputs, confirmedValues, servicePath) {
    const apiDocsContent = `# ${confirmedValues.displayName} API Documentation

## Overview

${confirmedValues.description}

**Base URL**: ${confirmedValues.productionUrl}
**API Base Path**: ${confirmedValues.apiBasePath}
**Version**: ${confirmedValues.version}

## Authentication

${confirmedValues.features.authentication ?
'This service requires authentication. Include your API key in the request headers:\n\n' +
'```\nAuthorization: Bearer YOUR_API_KEY\n```' :
'This service does not require authentication.'}

## Endpoints

### Health Check

**GET** ${confirmedValues.healthCheckPath}

Check the health status of the service.

**Response:**
\`\`\`json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "${coreInputs.serviceName}",
  "version": "${confirmedValues.version}",
  "environment": "${coreInputs.environment}",
  "checks": [
    {
      "name": "database",
      "status": "healthy"
    },
    {
      "name": "configuration",
      "status": "healthy"
    }
  ]
}
\`\`\`

### API Endpoints

**Base Path**: ${confirmedValues.apiBasePath}

${this.generateApiEndpointsForType(coreInputs.serviceType, coreInputs, confirmedValues)}

## Error Responses

All error responses follow this format:

\`\`\`json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### Common HTTP Status Codes

- **200**: Success
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

## Rate Limiting

${confirmedValues.features.rateLimiting ?
'This service implements rate limiting. Please respect the following limits:\n\n' +
'- 1000 requests per hour for authenticated users\n' +
'- 100 requests per hour for anonymous users' :
'This service does not implement rate limiting.'}

## Data Formats

All requests and responses use JSON format.

### Request Headers

\`\`\`
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY (if required)
\`\`\`

### Response Headers

\`\`\`
Content-Type: application/json
X-Service: ${coreInputs.serviceName}
X-Version: ${confirmedValues.version}
X-Response-Time: 150
\`\`\`
`;

    const filePath = join(servicePath, 'docs', 'API.md');
    writeFileSync(filePath, apiDocsContent, 'utf8');
    return filePath;
  }

  /**
   * Generate API endpoints based on service type
   */
  generateApiEndpointsForType(serviceType, coreInputs, confirmedValues) {
    const endpoints = {
      'data-service': `
#### List Items
**GET** /items

Retrieve a paginated list of items.

**Query Parameters:**
- \`limit\` (optional): Number of items per page (default: 20, max: 100)
- \`offset\` (optional): Number of items to skip (default: 0)
- \`search\` (optional): Search query string
- \`filters\` (optional): JSON object with filter criteria

**Response:**
\`\`\`json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
\`\`\`

#### Create Item
**POST** /items

Create a new item.

**Request Body:**
\`\`\`json
{
  "name": "Item Name",
  "description": "Item description",
  "data": {}
}
\`\`\`

#### Get Item
**GET** /items/{id}

Retrieve a specific item by ID.

#### Update Item
**PUT** /items/{id}

Update an existing item.

#### Delete Item
**DELETE** /items/{id}

Delete an item.
`,
      'auth-service': `
#### Register User
**POST** /auth/register

Register a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password"
}
\`\`\`

#### Login
**POST** /auth/login

Authenticate a user and receive access tokens.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password"
}
\`\`\`

#### Get Profile
**GET** /auth/profile

Get the current user's profile information.

#### Update Profile
**PUT** /auth/profile

Update the current user's profile.

#### Logout
**POST** /auth/logout

Invalidate the current user's session.
`,
      'content-service': `
#### List Content
**GET** /content

Retrieve a list of content items.

#### Create Content
**POST** /content

Create new content.

**Request Body:**
\`\`\`json
{
  "title": "Content Title",
  "content": "Content body",
  "contentType": "article",
  "tags": ["tag1", "tag2"]
}
\`\`\`

#### Get Content
**GET** /content/{id}

Retrieve specific content by ID.

#### Update Content
**PUT** /content/{id}

Update existing content.

#### Delete Content
**DELETE** /content/{id}

Delete content.

#### Upload Media
**POST** /media/upload

Upload media files.
`,
      'api-gateway': `
#### Route Request
**ANY** /*

All requests are routed through the API gateway.

**Headers:**
- \`X-Target-Service\`: Target service name
- \`X-Target-Path\`: Path on target service

#### Get Routes
**GET** /routes

List all configured routes.

#### Health Status
**GET** /status

Get gateway health and route status.
`,
      'generic': `
#### Service Info
**GET** /info

Get service information and capabilities.

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "name": "${coreInputs.serviceName}",
    "type": "${coreInputs.serviceType}",
    "version": "${confirmedValues.version}",
    "features": ${JSON.stringify(Object.keys(confirmedValues.features).filter(key => confirmedValues.features[key]), null, 4)}
  }
}
\`\`\`
`
    };

    return endpoints[serviceType] || endpoints.generic;
  }

  /**
   * Generate deployment documentation
   */
  generateDeploymentDocs(coreInputs, confirmedValues, servicePath) {
    const deploymentDocsContent = `# ${confirmedValues.displayName} - Deployment Guide

## Overview

This guide covers deploying ${confirmedValues.displayName} to different environments using the Clodo Framework.

## Environments

### Development
- **URL**: ${confirmedValues.developmentUrl}
- **Environment**: development
- **Configuration**: \`config/development.env\`

### Staging
- **URL**: ${confirmedValues.stagingUrl}
- **Environment**: staging
- **Configuration**: \`config/staging.env\`

### Production
- **URL**: ${confirmedValues.productionUrl}
- **Environment**: production
- **Configuration**: \`config/production.env\`

## Prerequisites

- Node.js 18+
- Cloudflare account with Workers enabled
- Wrangler CLI installed
- PowerShell (for deployment scripts)

## Initial Setup

1. **Clone and setup**:
   \`\`\`bash
   git clone ${confirmedValues.gitRepositoryUrl}
   cd ${coreInputs.serviceName}
   .\\scripts\\setup.ps1
   \`\`\`

2. **Configure environment**:
   Edit \`.env\` with your Cloudflare credentials:
   \`\`\`bash
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_ZONE_ID=your_zone_id
   CLOUDFLARE_API_TOKEN=your_api_token
   \`\`\`

3. **Setup database** (if enabled):
   ${confirmedValues.features.database ? `
   Create a Cloudflare D1 database and update \`wrangler.toml\`:
   \`\`\`toml
   [[d1_databases]]
   binding = "DB"
   database_name = "${confirmedValues.databaseName}"
   database_id = "your_database_id"
   \`\`\`
   ` : 'Database not required for this service type.'}

## Development Deployment

\`\`\`bash
# Start local development server
npm run dev

# Server will be available at http://localhost:8787
\`\`\`

## Staging Deployment

\`\`\`bash
# Deploy to staging
.\\scripts\\deploy.ps1 -Environment staging

# Run health checks
.\\scripts\\health-check.ps1 -Environment staging
\`\`\`

## Production Deployment

\`\`\`bash
# Deploy to production
.\\scripts\\deploy.ps1 -Environment production

# Verify deployment
.\\scripts\\health-check.ps1 -Environment production
\`\`\`

## Automated Deployment

### GitHub Actions

The service includes GitHub Actions workflows for automated deployment:

- **CI**: Runs on every push to main branch
- **Deploy**: Deploys to staging on successful CI
- **Release**: Deploys to production on tag creation

### Manual CI/CD

\`\`\`bash
# Run full CI pipeline locally
npm run lint
npm test
npm run build

# Deploy if all checks pass
.\\scripts\\deploy.ps1 -Environment production
\`\`\`

## Monitoring and Health Checks

### Health Check Endpoint

\`\`\`bash
curl ${confirmedValues.productionUrl}${confirmedValues.healthCheckPath}
\`\`\`

### Automated Health Monitoring

The deployment scripts include automated health checks. For production monitoring, consider:

- Cloudflare Analytics
- External monitoring services
- Log aggregation tools

## Rollback Strategy

### Quick Rollback

\`\`\`bash
# Deploy previous version
wrangler deploy --env production

# Or redeploy from git
git checkout previous-version
npm run deploy
\`\`\`

### Database Rollback

${confirmedValues.features.database ? `
If database schema changes need rollback:

1. Restore from backup
2. Run migration rollback scripts
3. Update wrangler.toml if needed
` : 'No database rollback required for this service type.'}

## Troubleshooting

### Common Issues

1. **Deployment fails with authentication error**
   - Check Cloudflare API token permissions
   - Verify account ID and zone ID

2. **Health check fails**
   - Check database connectivity
   - Verify environment variables
   - Review worker logs

3. **API returns 500 errors**
   - Check worker logs in Cloudflare dashboard
   - Verify service configuration
   - Test locally first

### Logs and Debugging

\`\`\`bash
# View worker logs
wrangler tail

# Check deployment status
wrangler deployments list

# View environment info
wrangler whoami
\`\`\`

## Security Considerations

- Store secrets in Cloudflare Workers secrets, not environment variables
- Use HTTPS for all production endpoints
- Implement proper authentication and authorization
- Regularly rotate API tokens
- Monitor for unusual activity

## Performance Optimization

- Enable caching where appropriate
- Use appropriate database indexes
- Monitor response times
- Optimize bundle size
- Consider edge deployment locations
`;

    const filePath = join(servicePath, 'docs', 'DEPLOYMENT.md');
    writeFileSync(filePath, deploymentDocsContent, 'utf8');
    return filePath;
  }

  /**
   * Generate configuration documentation
   */
  generateConfigurationDocs(coreInputs, confirmedValues, servicePath) {
    const configDocsContent = `# ${confirmedValues.displayName} - Configuration Guide

## Overview

${confirmedValues.displayName} is configured using multiple layers of configuration files and environment variables.

## Configuration Hierarchy

1. **Environment Variables** (.env) - Runtime secrets and environment-specific values
2. **Service Configuration** (src/config/domains.js) - Service-specific settings
3. **Worker Configuration** (wrangler.toml) - Cloudflare Workers deployment settings
4. **Package Configuration** (package.json) - Node.js package settings

## Environment Variables

### Required Variables

\`\`\`bash
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=${coreInputs.cloudflareAccountId}
CLOUDFLARE_ZONE_ID=${coreInputs.cloudflareZoneId}
CLOUDFLARE_API_TOKEN=your_api_token

# Service Configuration
SERVICE_NAME=${coreInputs.serviceName}
SERVICE_TYPE=${coreInputs.serviceType}
DOMAIN_NAME=${coreInputs.domainName}
ENVIRONMENT=${coreInputs.environment}
\`\`\`

### Optional Variables

\`\`\`bash
# URLs (override defaults)
PRODUCTION_URL=${confirmedValues.productionUrl}
STAGING_URL=${confirmedValues.stagingUrl}
DEVELOPMENT_URL=${confirmedValues.developmentUrl}
DOCUMENTATION_URL=${confirmedValues.documentationUrl}

# API Configuration
API_BASE_PATH=${confirmedValues.apiBasePath}
HEALTH_CHECK_PATH=${confirmedValues.healthCheckPath}

# Database
DATABASE_NAME=${confirmedValues.databaseName}

# Logging and Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
ERROR_REPORTING_ENABLED=true

# Custom Variables
CUSTOM_VAR=value
\`\`\`

## Service Configuration (domains.js)

Located at \`src/config/domains.js\`, this file contains service-specific configuration:

\`\`\`javascript
export const domains = {
  '${coreInputs.serviceName}': {
    name: '${coreInputs.serviceName}',
    displayName: '${confirmedValues.displayName}',
    description: '${confirmedValues.description}',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    domains: {
      production: '${confirmedValues.productionUrl}',
      staging: '${confirmedValues.stagingUrl}',
      development: '${confirmedValues.developmentUrl}'
    },
    services: [
      '${coreInputs.serviceName}'
    ],
    databases: [
      {
        name: '${confirmedValues.databaseName}',
        type: 'd1',
        binding: 'DB'
      }
    ],
    features: ${JSON.stringify(confirmedValues.features, null, 4)},
    metadata: {
      version: '${confirmedValues.version}',
      author: '${confirmedValues.author}',
      generatedAt: '${new Date().toISOString()}',
      frameworkVersion: '3.0.0',
      serviceType: '${coreInputs.serviceType}',
      environment: '${coreInputs.environment}'
    }
  }
};
\`\`\`

## Worker Configuration (wrangler.toml)

Cloudflare Workers configuration with environment-specific settings:

\`\`\`toml
name = "${confirmedValues.workerName}"
main = "src/worker/index.js"
compatibility_date = "${new Date().toISOString().split('T')[0]}"
compatibility_flags = ["nodejs_compat"]

# Environment configurations
[env.development]
name = "${confirmedValues.workerName}-dev"

[env.staging]
name = "${confirmedValues.workerName}-staging"

[env.production]
name = "${confirmedValues.workerName}"

# Database bindings
[[d1_databases]]
binding = "DB"
database_name = "${confirmedValues.databaseName}"

# Environment variables
[vars]
SERVICE_NAME = "${coreInputs.serviceName}"
SERVICE_TYPE = "${coreInputs.serviceType}"
DOMAIN_NAME = "${coreInputs.domainName}"
ENVIRONMENT = "${coreInputs.environment}"
API_BASE_PATH = "${confirmedValues.apiBasePath}"
HEALTH_CHECK_PATH = "${confirmedValues.healthCheckPath}"

# Domain-specific variables
PRODUCTION_URL = "${confirmedValues.productionUrl}"
STAGING_URL = "${confirmedValues.stagingUrl}"
DEVELOPMENT_URL = "${confirmedValues.developmentUrl}"

# Feature flags
${Object.entries(confirmedValues.features)
  .filter(([, enabled]) => enabled)
  .map(([feature, enabled]) => `FEATURE_${feature.toUpperCase()} = ${enabled}`)
  .join('\n')}

# Custom environment variables (configure as needed)
# CUSTOM_VAR = "value"
\`\`\`

## Feature Flags

The service supports the following feature flags:

${Object.entries(confirmedValues.features)
  .map(([feature, enabled]) => `- **${feature}**: ${enabled ? '✅ Enabled' : '❌ Disabled'}`)
  .join('\n')}

### Feature Descriptions

- **logging**: Request/response logging
- **monitoring**: Performance monitoring and metrics
- **errorReporting**: Error tracking and reporting
- **metrics**: Application metrics collection
- **healthChecks**: Health check endpoints
${confirmedValues.features.database ? '- **database**: Database operations and connectivity\n' : ''}
${confirmedValues.features.authentication ? '- **authentication**: User authentication\n' : ''}
${confirmedValues.features.authorization ? '- **authorization**: Access control and permissions\n' : ''}
${confirmedValues.features.search ? '- **search**: Search functionality\n' : ''}
${confirmedValues.features.filtering ? '- **filtering**: Data filtering capabilities\n' : ''}
${confirmedValues.features.pagination ? '- **pagination**: Paginated responses\n' : ''}
${confirmedValues.features.caching ? '- **caching**: Response caching\n' : ''}
${confirmedValues.features.backup ? '- **backup**: Data backup functionality\n' : ''}

## Environment-Specific Configuration

### Development
- Full debugging enabled
- Local database connections
- Hot reload enabled
- Less strict validation

### Staging
- Production-like settings
- Separate database
- Full feature set enabled
- Error reporting enabled

### Production
- Optimized settings
- Production database
- Security hardening
- Full monitoring enabled

## Configuration Validation

The service validates configuration on startup:

1. **Environment Variables**: Required variables present and valid
2. **Service Configuration**: domains.js structure and values
3. **Worker Configuration**: wrangler.toml syntax and bindings
4. **Feature Compatibility**: Feature flags compatible with service type

## Runtime Configuration

Some configuration can be changed at runtime:

- Environment variables (require restart)
- Feature flags (may require restart)
- Database connections (handled automatically)
- Logging levels (immediate effect)

## Security Considerations

- Never commit secrets to version control
- Use Cloudflare Workers secrets for sensitive data
- Rotate API tokens regularly
- Limit feature access based on environment
- Validate all input data
- Use HTTPS for all production endpoints

## Troubleshooting Configuration Issues

### Common Problems

1. **Missing environment variables**
   - Check .env file exists and is loaded
   - Verify variable names match expectations

2. **Invalid Cloudflare credentials**
   - Check account ID format (32 hex characters)
   - Verify API token permissions
   - Confirm zone ID is correct

3. **Database connection issues**
   - Verify D1 database exists
   - Check database ID in wrangler.toml
   - Confirm database binding name

4. **Feature flag conflicts**
   - Some features require others to be enabled
   - Check service type compatibility

### Debugging Configuration

\`\`\`bash
# Check environment variables
node -e "console.log(process.env)"

# Validate service configuration
node -e "import('./src/config/domains.js').then(config => console.log(JSON.stringify(config, null, 2)))"

# Test wrangler configuration
wrangler dev --dry-run
\`\`\`
`;

    const filePath = join(servicePath, 'docs', 'CONFIGURATION.md');
    writeFileSync(filePath, configDocsContent, 'utf8');
    return filePath;
  }

  /**
   * Generate CI workflow
   */
  generateCiWorkflow(coreInputs, confirmedValues, servicePath) {
    const ciWorkflow = `name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Lint code
      run: npm run lint

    - name: Run tests
      run: npm test

    - name: Build
      run: npm run build

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
`;

    const filePath = join(servicePath, '.github', 'workflows', 'ci.yml');
    writeFileSync(filePath, ciWorkflow, 'utf8');
    return filePath;
  }

  /**
   * Generate deploy workflow
   */
  generateDeployWorkflow(coreInputs, confirmedValues, servicePath) {
    const deployWorkflow = `name: Deploy

on:
  push:
    branches: [ main, master ]
  workflow_run:
    workflows: ["CI"]
    types:
      - completed

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    environment: staging

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Deploy to staging
      run: npx wrangler deploy --env staging
      env:
        CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    environment: production

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Deploy to production
      run: npx wrangler deploy --env production
      env:
        CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
`;

    const filePath = join(servicePath, '.github', 'workflows', 'deploy.yml');
    writeFileSync(filePath, deployWorkflow, 'utf8');
    return filePath;
  }

  /**
   * Generate .gitignore
   */
  generateGitignore(coreInputs, confirmedValues, servicePath) {
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
coverage/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build / generate output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Cloudflare
.wrangler/
`;

    const filePath = join(servicePath, '.gitignore');
    writeFileSync(filePath, gitignoreContent, 'utf8');
    return filePath;
  }

  /**
   * Generate docker-compose.yml
   */
  generateDockerCompose(coreInputs, confirmedValues, servicePath) {
    const dockerComposeContent = `version: '3.8'

services:
  ${coreInputs.serviceName}:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8787:8787"
    environment:
      - NODE_ENV=development
      - SERVICE_NAME=${coreInputs.serviceName}
      - SERVICE_TYPE=${coreInputs.serviceType}
      - ENVIRONMENT=development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  ${coreInputs.serviceName}-db:
    image: cloudflare/d1
    ports:
      - "8788:8787"
    environment:
      - DATABASE_NAME=${confirmedValues.databaseName}
    volumes:
      - .wrangler:/data
`;

    const filePath = join(servicePath, 'docker-compose.yml');
    writeFileSync(filePath, dockerComposeContent, 'utf8');
    return filePath;
  }

  /**
   * Create service manifest
   */
  createServiceManifest(coreInputs, confirmedValues, generatedFiles) {
    return {
      manifestVersion: '1.0.0',
      frameworkVersion: '3.0.0',
      generatedAt: new Date().toISOString(),
      service: {
        name: coreInputs.serviceName,
        displayName: confirmedValues.displayName,
        description: confirmedValues.description,
        type: coreInputs.serviceType,
        version: confirmedValues.version,
        author: confirmedValues.author
      },
      configuration: {
        coreInputs,
        confirmedValues,
        urls: {
          production: confirmedValues.productionUrl,
          staging: confirmedValues.stagingUrl,
          development: confirmedValues.developmentUrl,
          documentation: confirmedValues.documentationUrl
        },
        api: {
          basePath: confirmedValues.apiBasePath,
          healthCheckPath: confirmedValues.healthCheckPath
        },
        cloudflare: {
          accountId: coreInputs.cloudflareAccountId,
          zoneId: coreInputs.cloudflareZoneId,
          workerName: confirmedValues.workerName,
          databaseName: confirmedValues.databaseName
        },
        features: confirmedValues.features
      },
      files: {
        total: generatedFiles.length,
        list: generatedFiles.map(file => relative(process.cwd(), file)),
        byCategory: this.categorizeFiles(generatedFiles)
      },
      metadata: {
        generationEngine: 'GenerationEngine v1.0.0',
        tier: 'Tier 3 - Automated Generation',
        checksum: this.generateChecksum(generatedFiles)
      }
    };
  }

  /**
   * Categorize generated files
   */
  categorizeFiles(files) {
    const categories = {
      core: [],
      service: [],
      environment: [],
      testing: [],
      documentation: [],
      automation: []
    };

    files.forEach(file => {
      const relativePath = relative(process.cwd(), file);
      if (relativePath.includes('package.json') || relativePath.includes('wrangler.toml') || relativePath.includes('.env')) {
        categories.core.push(relativePath);
      } else if (relativePath.includes('src/')) {
        categories.service.push(relativePath);
      } else if (relativePath.includes('config/') || relativePath.includes('scripts/')) {
        categories.environment.push(relativePath);
      } else if (relativePath.includes('test/') || relativePath.includes('jest.config.js') || relativePath.includes('.eslintrc.js')) {
        categories.testing.push(relativePath);
      } else if (relativePath.includes('docs/') || relativePath.includes('README.md')) {
        categories.documentation.push(relativePath);
      } else if (relativePath.includes('.github/') || relativePath.includes('.gitignore') || relativePath.includes('docker-compose.yml')) {
        categories.automation.push(relativePath);
      }
    });

    return categories;
  }

  /**
   * Generate checksum for verification
   */
  generateChecksum(files) {
    // Simple checksum based on file count and names
    const fileString = files.map(f => relative(process.cwd(), f)).sort().join('');
    let hash = 0;
    for (let i = 0; i < fileString.length; i++) {
      const char = fileString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}