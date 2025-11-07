/**
 * Data Formatters for Clodo Framework
 * Centralizes all data transformation logic
 * Replaces: 5 scattered formatting implementations
 * Savings: 150+ lines
 */

/**
 * Name formatting utilities
 */
export const NameFormatters = {
  /**
   * Convert kebab-case to Display Case
   * Example: 'my-service' → 'My Service'
   */
  toDisplayName(kebabCase) {
    if (!kebabCase) return '';
    return kebabCase
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Convert camelCase to kebab-case
   * Example: 'myService' → 'my-service'
   */
  toKebabCase(camelCase) {
    if (!camelCase) return '';
    return camelCase
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/^([A-Z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  },

  /**
   * Convert kebab-case to camelCase
   * Example: 'my-service' → 'myService'
   */
  toCamelCase(kebabCase) {
    if (!kebabCase) return '';
    return kebabCase
      .split('-')
      .map((part, i) => 
        i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join('');
  },

  /**
   * Convert snake_case to camelCase
   * Example: 'my_service' → 'myService'
   */
  snakeToCamel(snakeCase) {
    if (!snakeCase) return '';
    return snakeCase
      .split('_')
      .map((part, i) => 
        i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join('');
  }
};

/**
 * URL formatting utilities
 */
export const UrlFormatters = {
  /**
   * Build service URL
   * Example: buildServiceUrl('api', 'example.com', 'production')
   * → 'https://api.example.com'
   */
  buildServiceUrl(serviceName, domain, environment = 'production') {
    if (!serviceName || !domain) return '';
    
    const prefix = environment === 'production' 
      ? serviceName 
      : `${serviceName}-${environment.substring(0, 3)}`;
    
    return `https://${prefix}.${domain}`;
  },

  /**
   * Build production URL
   */
  buildProductionUrl(serviceName, domain) {
    return this.buildServiceUrl(serviceName, domain, 'production');
  },

  /**
   * Build staging URL
   */
  buildStagingUrl(serviceName, domain) {
    return this.buildServiceUrl(serviceName, domain, 'staging');
  },

  /**
   * Build development URL
   */
  buildDevUrl(serviceName, domain) {
    return this.buildServiceUrl(serviceName, domain, 'development');
  },

  /**
   * Build API endpoint URL
   */
  buildApiUrl(serviceName, domain, path = '') {
    const baseUrl = this.buildProductionUrl(serviceName, domain);
    return path ? `${baseUrl}${path}` : baseUrl;
  }
};

/**
 * Resource name formatters
 */
export const ResourceFormatters = {
  /**
   * Format database name
   * Example: 'my-service' → 'my-service-db'
   */
  databaseName(serviceName) {
    if (!serviceName) return '';
    return `${serviceName}-db`;
  },

  /**
   * Format worker name
   * Example: 'my-service' → 'my-service-worker'
   */
  workerName(serviceName) {
    if (!serviceName) return '';
    return `${serviceName}-worker`;
  },

  /**
   * Format service directory
   * Example: 'my-service' → './services/my-service'
   */
  serviceDirectory(serviceName) {
    if (!serviceName) return '';
    return `./services/${serviceName}`;
  },

  /**
   * Format configuration key
   * Example: 'cloudflareApiToken' → 'cloudflare-api-token'
   */
  configKey(camelCase) {
    return NameFormatters.toKebabCase(camelCase);
  },

  /**
   * Format package name for NPM
   * Example: 'my-service' → 'my-service'
   */
  packageName(serviceName) {
    if (!serviceName) return '';
    // For NPM packages, just use the service name as-is
    // Scoped packages would be handled separately (e.g., @company/my-service)
    return serviceName;
  },
};

/**
 * Environment-related formatters
 */
export const EnvironmentFormatters = {
  /**
   * Get environment variable prefix
   * Example: 'production' → 'PROD_'
   */
  getEnvPrefix(environment) {
    switch (environment) {
      case 'production':
        return 'PROD_';
      case 'staging':
        return 'STAGING_';
      case 'development':
        return 'DEV_';
      default:
        return 'APP_';
    }
  },

  /**
   * Get log level for environment
   * Example: 'production' → 'warn'
   */
  getLogLevel(environment) {
    switch (environment) {
      case 'production':
        return 'warn';
      case 'staging':
        return 'info';
      case 'development':
        return 'debug';
      default:
        return 'info';
    }
  },

  /**
   * Get CORS policy for environment
   */
  getCorsPolicy(domain, environment) {
    switch (environment) {
      case 'production':
        return `https://${domain}`;
      case 'staging':
        return `https://${domain}`;
      case 'development':
        return '*'; // Allow all in development
      default:
        return '*';
    }
  }
};

/**
 * Version formatting
 */
export const VersionFormatters = {
  /**
   * Normalize version string
   */
  normalize(version) {
    const match = version.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : '1.0.0';
  },

  /**
   * Bump version
   */
  bump(version, type = 'patch') {
    const [major, minor, patch] = version.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
      default:
        return `${major}.${minor}.${patch + 1}`;
    }
  }
};

/**
 * Convenience exports - combine all formatters
 */
export const Formatters = {
  ...NameFormatters,
  ...UrlFormatters,
  ...ResourceFormatters,
  ...EnvironmentFormatters,
  ...VersionFormatters
};
