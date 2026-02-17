// Mock for framework-config.js to avoid import.meta.url issues in Jest
export class FrameworkConfig {
  constructor(configPath = null) {
    this.configPath = configPath;
    this.config = {};
    this.environment = 'test';
  }

  findConfigFile() {
    return null;
  }

  loadConfig() {
    return {};
  }

  validateEnvironmentVariables() {
    // Mock implementation
  }

  get(key, defaultValue = null) {
    return defaultValue;
  }

  set(key, value) {
    this.config[key] = value;
  }

  getRoutingConfig() {
    const routing = this.config.routing || {};
    const templates = this.config.templates || {};
    const workersDomain = templates.defaults?.WORKERS_DEV_DOMAIN || 'workers.dev';

    return {
      defaults: {
        includeComments: routing.defaults?.includeComments !== false,
        includeZoneId: routing.defaults?.includeZoneId !== false,
        targetEnvironment: routing.defaults?.targetEnvironment || 'all',
        orderStrategy: routing.defaults?.orderStrategy || 'most-specific-first'
      },
      domains: {
        skipPatterns: routing.domains?.skipPatterns || [],
        workersDomain,
        complexTLDs: routing.domains?.complexTLDs || ['.co.uk', '.com.au', '.org.uk', '.gov.uk'],
        subdomainMinParts: routing.domains?.subdomainMinParts || 3,
        ignoreSubdomains: routing.domains?.ignoreSubdomains || ['www']
      },
      validation: {
        zoneIdPattern: routing.validation?.zoneIdPattern || '^[a-f0-9]{32}$',
        domainPattern: routing.validation?.domainPattern || '^[a-z0-9.-]+$',
        strictMode: routing.validation?.strictMode !== false
      },
      comments: {
        enabled: routing.comments?.enabled !== false,
        templates: routing.comments?.templates || {
          production: '# Production environment routes\n# Domain: {{domain}}',
          staging: '# Staging environment routes\n# Domain: {{domain}}',
          development: '# Development environment\n# Uses {{WORKERS_DEV_DOMAIN}} subdomain'
        }
      }
    };
  }

  getEnvironmentRoutingConfig(environment = null) {
    const env = environment || this.environment;
    const environments = this.config.environments || {};
    const envConfig = environments[env] || environments.development || {};
    const routingConfig = envConfig.routing || {};

    const defaultPrefixes = {
      development: '/dev-api',
      staging: '/staging-api',
      production: '/api'
    };

    return {
      defaultPathPrefix: routingConfig.defaultPathPrefix || defaultPrefixes[env] || '/api',
      wildcardPattern: routingConfig.wildcardPattern || '/*',
      generateFallbackRoute: routingConfig.generateFallbackRoute !== false,
      nestedInToml: env !== 'production' && (routingConfig.nestedInToml !== false)
    };
  }
}

export const frameworkConfig = new FrameworkConfig();