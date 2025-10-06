# Customer Configuration Management

The Lego Framework now includes customer-specific configuration management that integrates with the existing domain and feature flag systems.

## Overview

The customer configuration system provides:

- **Customer Isolation**: Each customer gets their own configuration namespace
- **Multi-Environment Support**: Separate configs for development, staging, and production
- **Template-Based Creation**: Automated customer onboarding from templates
- **Domain Integration**: Customers are automatically registered as domains
- **Feature Flag Integration**: Customer-specific feature toggles
- **CLI Tools**: Command-line interface for customer management

## Quick Start

### 1. Create a Customer

```bash
# Create customer with default domain
npm run customer-config create-customer acmecorp

# Create customer with custom domain
npm run customer-config create-customer acmecorp acmecorp.com
```

This creates:
- `config/customers/acmecorp/` directory
- Environment-specific config files (development.env, staging.env, production.env)
- Domain registration in the framework
- Feature flag configuration

### 2. Validate Configuration

```bash
npm run customer-config validate
```

### 3. View Customer Configuration

```bash
# Show effective configuration for customer/environment
npm run customer-config show acmecorp production
```

### 4. Get Deployment Commands

```bash
# Get wrangler deployment command
npm run customer-config deploy-command acmecorp staging
```

### 5. List All Customers

```bash
npm run customer-config list
```

## Directory Structure

```
config/
├── base/                          # Base configuration templates
│   ├── wrangler.base.toml
│   └── variables.base.env
├── environments/                  # Environment-specific configs
│   ├── development.toml
│   ├── staging.toml
│   └── production.toml
└── customers/                     # Customer-specific configs
    ├── template/                  # Customer config templates
    │   ├── development.env.template
    │   ├── staging.env.template
    │   └── production.env.template
    └── acmecorp/                  # Customer-specific directory
        ├── development.env
        ├── staging.env
        └── production.env
```

## Template Variables

The following variables are automatically replaced in templates:

- `{{CUSTOMER_NAME}}` - The customer identifier (e.g., "acmecorp")
- `{{CUSTOMER_DOMAIN}}` - The customer's domain (e.g., "acmecorp.com")
- `{{ENVIRONMENT}}` - The environment (development/staging/production)
- `{{DOMAIN}}` - Environment-specific domain

## Integration with Framework

### Domain System

Customers are automatically registered as domains in the framework:

```javascript
import { createDomainRegistry } from '@tamyla/lego-framework/config';

// Customer domains are available in the domain registry
const domainConfig = domainRegistry.get('acmecorp');
```

### Feature Flags

Customer-specific features are automatically configured:

```javascript
import { featureManager } from '@tamyla/lego-framework/config';

// Check customer-specific features
const hasCustomDomain = featureManager.isEnabled('customDomain', false);
const isIsolated = featureManager.isEnabled('customerIsolation', false);
```

### Programmatic Usage

```javascript
import { CustomerConfigurationManager } from '@tamyla/lego-framework/config';

const customerManager = new CustomerConfigurationManager();

// Create customer programmatically
await customerManager.createCustomer('newcustomer', 'newcustomer.com');

// Validate configurations
const validation = await customerManager.validateConfigs();

// Get effective configuration
const config = customerManager.showConfig('newcustomer', 'production');
```

## Environment-Specific Behavior

### Development
- Debug logging enabled
- Relaxed validation
- Local database connections
- Development API keys

### Staging
- Info-level logging
- Strict validation enabled
- Staging database connections
- Test API keys

### Production
- Warning-level logging
- Full validation and monitoring
- Production database connections
- Production secrets (must be set manually)

## Security Considerations

- Production secrets are templated as `{{PRODUCTION_JWT_SECRET}}` etc.
- These must be replaced with actual secrets before deployment
- Use `wrangler secret put` to set production secrets
- Customer configurations are isolated from each other

## Next Steps

After creating a customer configuration:

1. **Review Generated Configs**: Check `config/customers/{customer}/` for accuracy
2. **Update Domains**: Modify domain-specific URLs if needed
3. **Generate Secrets**: Create production secrets for the customer
4. **Set Secrets**: Use wrangler to set production environment secrets
5. **Deploy**: Use the generated deployment commands

## API Reference

### CustomerConfigurationManager

#### Methods

- `createCustomer(name, domain, options)` - Create new customer
- `validateConfigs()` - Validate all configurations
- `showConfig(customer, environment)` - Show effective configuration
- `getDeployCommand(customer, environment)` - Get deployment command
- `listCustomers()` - List all customers
- `getCustomerInfo(customer)` - Get customer details

#### Properties

- `environments` - Array of supported environments
- `customers` - Map of customer metadata
- `domainRegistry` - Integrated domain registry

## Troubleshooting

### Template Not Found
Ensure `config/customers/template/` contains the required `.env.template` files.

### Validation Errors
Run `npm run customer-config validate` to identify configuration issues.

### Domain Conflicts
Customer names must be unique and valid domain identifiers.

### Missing Secrets
Production environment requires manual secret configuration.