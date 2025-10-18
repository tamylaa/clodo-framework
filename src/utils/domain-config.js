/**
 * Domain Configuration Schema Utilities
 * Provides schema creation and validation for domain configurations
 */

/**
 * Create a domain configuration schema with validation rules
 * @param {Object} options - Schema configuration options
 * @returns {Object} Domain configuration schema
 */
export function createDomainConfigSchema(options = {}) {
  const defaultSchema = {
    type: 'object',
    properties: {
      domains: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            domain: { type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\\.[a-zA-Z]{2,}$' },
            accountId: { type: 'string', minLength: 1 },
            zoneId: { type: 'string', minLength: 1 },
            environment: { type: 'string', enum: ['development', 'staging', 'production'] },
            ssl: { type: 'boolean' },
            cors: { type: 'boolean' }
          },
          required: ['name', 'domain', 'environment'],
          additionalProperties: false
        },
        minItems: 1
      }
    },
    required: ['domains'],
    additionalProperties: false,
    ...options
  };

  return {
    schema: defaultSchema,
    validate: function(data) {
      const errors = [];
      
      if (!data || typeof data !== 'object') {
        errors.push({ field: 'root', message: 'Data must be an object' });
        return { valid: false, errors };
      }
      
      if (!Array.isArray(data.domains)) {
        errors.push({ field: 'domains', message: 'Domains must be an array' });
        return { valid: false, errors };
      }
      
      if (data.domains.length === 0) {
        errors.push({ field: 'domains', message: 'At least one domain is required' });
        return { valid: false, errors };
      }
      
      data.domains.forEach((domain, index) => {
        if (!domain.name) {
          errors.push({ field: `domains[${index}].name`, message: 'Domain name is required' });
        }
        
        if (!domain.domain) {
          errors.push({ field: `domains[${index}].domain`, message: 'Domain URL is required' });
        } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(domain.domain)) {
          errors.push({ field: `domains[${index}].domain`, message: 'Invalid domain format' });
        }
        
        if (!domain.environment) {
          errors.push({ field: `domains[${index}].environment`, message: 'Environment is required' });
        } else if (!['development', 'staging', 'production'].includes(domain.environment)) {
          errors.push({ field: `domains[${index}].environment`, message: 'Environment must be development, staging, or production' });
        }
      });
      
      return { valid: errors.length === 0, errors };
    }
  };
}

/**
 * Validate domain configuration data
 * @param {Object} data - Domain configuration data to validate
 * @param {Object} schema - Optional custom schema
 * @returns {Object} Validation result
 */
export function validateDomainConfig(data, schema = null) {
  const configSchema = schema || createDomainConfigSchema();
  return configSchema.validate(data);
}

/**
 * Create a default domain configuration
 * @param {string} serviceName - Name of the service
 * @param {string} domainName - Primary domain name
 * @param {string} environment - Target environment
 * @returns {Object} Default domain configuration
 */
export function createDefaultDomainConfig(serviceName, domainName, environment = 'development') {
  return {
    domains: [{
      name: serviceName,
      domain: domainName,
      accountId: 'your-account-id',
      zoneId: 'your-zone-id', 
      environment,
      ssl: true,
      cors: environment !== 'production'
    }]
  };
}