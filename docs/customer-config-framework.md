# Customer Configuration Management - Framework Mode

The Lego Framework now includes customer-specific configuration management that integrates with the existing domain and feature flag systems.

## ⚠️ Framework vs Service Environment

**Important**: This customer configuration system is designed for **framework testing and development**. It uses mock/placeholder values and should not contain real customer data.

- **Framework Mode**: Uses placeholder Cloudflare IDs and mock configurations for testing
- **Service Environment**: Real customer configurations with actual infrastructure IDs
- **Migration Path**: Framework-generated templates serve as starting points for service-specific configs

## Quick Start (Framework Mode)

### 1. Create a Customer

```bash
# Create customer with default domain
npm run customer-config create-customer acmecorp

# Create customer with custom domain
npm run customer-config create-customer acmecorp acmecorp.com
```

### 2. View Customer Configuration

```bash
npm run customer-config show acmecorp production
```

### 3. List All Customers

```bash
npm run customer-config list
```

## What This Provides

✅ **Customer Isolation Patterns** - Each customer gets their own configuration namespace
✅ **Multi-Environment Support** - Separate configs for development, staging, and production
✅ **Template-Based Creation** - Automated customer onboarding from templates
✅ **Domain Integration** - Customers are automatically registered as domains
✅ **Feature Flag Integration** - Customer-specific feature toggles
✅ **CLI Tools** - Command-line interface for customer management
✅ **Framework Testing** - Mock-friendly for framework development

## Integration with Existing Framework

The customer configuration system integrates with:

- **Domain Registry**: Customers are registered as domains with mock IDs
- **Feature Flags**: Customer-specific features are automatically configured
- **Validation**: Framework-friendly validation that skips infrastructure checks
- **CLI**: Commands that work in testing/development environments

## Migration to Service Environment

When moving from framework testing to service implementation:

1. **Extract Templates**: Use framework-generated configs as starting templates
2. **Replace Placeholders**: Update with real Cloudflare account/zone IDs
3. **Add Secrets**: Configure production secrets in service environment
4. **Update Infrastructure**: Connect to real databases and services
5. **Remove Framework Flags**: Disable `isFrameworkMode` and `skipValidation`

## API Reference

```javascript
import { CustomerConfigurationManager } from '@tamyla/lego-framework/config';

const customerManager = new CustomerConfigurationManager();

// Create customer (framework mode)
await customerManager.createCustomer('customer', 'domain.com', {
  skipValidation: true,
  isFrameworkMode: true
});

// Show configuration
const config = customerManager.showConfig('customer', 'production');
```</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\docs\customer-config-framework.md