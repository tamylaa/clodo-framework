import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';

/**
 * WranglerTomlGenerator
 * 
 * Generates wrangler.toml configuration files for Cloudflare Workers.
 * 
 * Responsibilities:
 * - Generate main worker configuration (name, main, compatibility)
 * - Include routes configuration from RouteGenerator
 * - Include Workers Sites configuration from SiteConfigGenerator
 * - Configure environment-specific settings (dev/staging/production)
 * - Configure D1 database bindings
 * - Configure environment variables and feature flags
 * 
 * Dependencies:
 * - RouteGenerator (for routes configuration)
 * - SiteConfigGenerator (for Workers Sites configuration)
 */
export class WranglerTomlGenerator extends BaseGenerator {
  constructor(options = {}) {
    super({
      name: 'WranglerTomlGenerator',
      description: 'Generates wrangler.toml configuration for Cloudflare Workers',
      outputPath: 'wrangler.toml',
      ...options
    });

    this.routeGenerator = options.routeGenerator;
    this.siteConfigGenerator = options.siteConfigGenerator;
  }

  /**
   * Always generate wrangler.toml
   */
  shouldGenerate(context) {
    return true;
  }

  /**
   * Generate wrangler.toml content
   */
  async generate(context) {
    // Support both new structured format and legacy flat format
    const coreInputs = context.coreInputs || context;
    const confirmedValues = context.confirmedValues || context;
    const servicePath = context.servicePath || context.outputDir;

    this.setContext({ coreInputs, confirmedValues, servicePath });

    // Generate routes configuration
    const routesConfig = await this._generateRoutesConfig(coreInputs, confirmedValues);

    // Generate Workers Sites configuration (static-site only)
    const siteConfig = await this._generateSiteConfig(coreInputs);

    // Build wrangler.toml content
    const content = this._buildWranglerToml(coreInputs, confirmedValues, routesConfig, siteConfig);

    // Write file
    await this.writeFile('wrangler.toml', content);

    // Return full path for backward compatibility
    return join(servicePath, 'wrangler.toml');
  }

  /**
   * Generate routes configuration using RouteGenerator
   */
  async _generateRoutesConfig(coreInputs, confirmedValues) {
    if (!this.routeGenerator) {
      console.warn('⚠️  RouteGenerator not available. Routes will need to be configured manually.');
      return '# Routes will be configured during deployment\n';
    }

    try {
      const routesConfig = this.routeGenerator.generateRoutes(
        coreInputs,
        confirmedValues,
        { includeComments: true, includeZoneId: true }
      );
      return routesConfig;
    } catch (error) {
      console.warn(`⚠️  Could not generate routes: ${error.message}`);
      console.warn('   Continuing without automatic routes. You can add them manually later.');
      return '# Routes will be configured during deployment\n';
    }
  }

  /**
   * Generate Workers Sites configuration using SiteConfigGenerator
   */
  async _generateSiteConfig(coreInputs) {
    if (!this.siteConfigGenerator) {
      return '';
    }

    // Only generate site config for static-site service type
    if (coreInputs.serviceType !== 'static-site') {
      return '';
    }

    try {
      const siteConfig = await this.siteConfigGenerator.generate({
        coreInputs,
        siteConfig: coreInputs.siteConfig || {}
      });
      return siteConfig;
    } catch (error) {
      console.warn(`⚠️  Could not generate Workers Sites config: ${error.message}`);
      return '';
    }
  }

  /**
   * Build the complete wrangler.toml content
   */
  _buildWranglerToml(coreInputs, confirmedValues, routesConfig, siteConfig) {
    const compatDate = new Date().toISOString().split('T')[0];
    
    return `# Cloudflare Workers Configuration for ${confirmedValues.displayName}
name = "${confirmedValues.workerName}"
main = "src/worker/index.js"
compatibility_date = "${compatDate}"
compatibility_flags = ["nodejs_compat"]

# Account configuration
account_id = "${coreInputs.cloudflareAccountId}"

${routesConfig}
${siteConfig ? '\n' + siteConfig : ''}

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
${this._generateFeatureFlags(confirmedValues.features)}

# Custom environment variables (configure as needed)
# CUSTOM_VAR = "value"
`;
  }

  /**
   * Generate feature flags section
   */
  _generateFeatureFlags(features) {
    if (!features || typeof features !== 'object') {
      return '# No feature flags configured';
    }

    const flagEntries = Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([feature, enabled]) => `FEATURE_${feature.toUpperCase()} = ${enabled}`);

    return flagEntries.length > 0 
      ? flagEntries.join('\n')
      : '# No feature flags configured';
  }

  /**
   * Validate context has required fields
   */
  validateContext(context) {
    const coreInputs = context.coreInputs || context;
    const confirmedValues = context.confirmedValues || context;

    const required = [
      { field: 'cloudflareAccountId', source: coreInputs },
      { field: 'serviceName', source: coreInputs },
      { field: 'serviceType', source: coreInputs },
      { field: 'domainName', source: coreInputs },
      { field: 'environment', source: coreInputs },
      { field: 'workerName', source: confirmedValues },
      { field: 'displayName', source: confirmedValues },
      { field: 'databaseName', source: confirmedValues },
      { field: 'apiBasePath', source: confirmedValues },
      { field: 'healthCheckPath', source: confirmedValues },
      { field: 'productionUrl', source: confirmedValues },
      { field: 'stagingUrl', source: confirmedValues },
      { field: 'developmentUrl', source: confirmedValues }
    ];

    const missing = required
      .filter(({ field, source }) => !source || !source[field])
      .map(({ field }) => field);

    if (missing.length > 0) {
      throw new Error(
        `WranglerTomlGenerator: Missing required fields: ${missing.join(', ')}`
      );
    }

    return true;
  }
}
