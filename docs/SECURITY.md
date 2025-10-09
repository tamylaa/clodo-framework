# Clodo Framework Security Module

The Security Module provides comprehensive security validation and management capabilities for Clodo Framework services, preventing insecure configurations from reaching production environments.

## Features

- **Configuration Validation**: Automated detection of dummy API keys, weak secrets, and insecure URLs
- **Environment-Specific Rules**: Different security requirements for development, staging, and production
- **Secure Key Generation**: Cryptographically secure key generation utilities
- **Deployment Security**: Pre-deployment validation hooks that block insecure deployments
- **CLI Tools**: Command-line interface for security operations

## Quick Start

### Basic Usage

```javascript
import { validateSecurity, generateSecureKey } from '@tamyla/clodo-framework/security';

// Validate configuration
const config = {
  API_KEY: 'my-secret-key',
  DATABASE_URL: 'https://prod-db.example.com'
};

const issues = validateSecurity(config, 'production');
if (issues.length > 0) {
  console.error('Security issues found:', issues);
}

// Generate secure keys
const apiKey = generateSecureKey('api', { length: 32 });
const jwtSecret = generateSecureKey('jwt', { length: 64 });
```

### Module Integration

```javascript
import { securityModule } from '@tamyla/clodo-framework/modules/security';

// The security module automatically registers with the framework
// and provides pre-deployment validation hooks
```

### CLI Usage

```bash
# Validate configuration security
npx clodo-security validate customer production

# Generate secure keys
npx clodo-security generate-key api
npx clodo-security generate-key jwt 64

# Deploy with security validation
npx clodo-security deploy customer production

# Generate secure configuration
npx clodo-security generate-config customer production

# Check deployment readiness
npx clodo-security check-readiness customer production
```

## Security Validation

### Detected Issues

The security validator detects:

- **Dummy API Keys**: Common development/test keys that shouldn't be in production
- **Weak Secrets**: Passwords shorter than required length or using common patterns
- **Insecure URLs**: HTTP URLs in production or localhost URLs outside development
- **JWT Security**: Weak JWT secrets with insufficient entropy
- **Environment Mismatches**: Development settings in production environments

### Environment Requirements

| Environment | Min Secret Length | HTTPS Required | Dummy Keys Allowed | Localhost Allowed |
|-------------|------------------|----------------|-------------------|-------------------|
| Development | 16 | No | Yes | Yes |
| Staging | 24 | Yes | No | No |
| Production | 32 | Yes | No | No |

## API Reference

### ConfigurationValidator

```javascript
import { ConfigurationValidator } from '@tamyla/clodo-framework/security';

// Validate configuration object
const issues = ConfigurationValidator.validate(config, environment);

// Validate customer configuration file
const result = ConfigurationValidator.validateConfiguration(customer, environment);
```

### SecretGenerator

```javascript
import { SecretGenerator } from '@tamyla/clodo-framework/security';

// Generate API key
const apiKey = SecretGenerator.generateSecureApiKey(length, prefix);

// Generate JWT secret
const jwtSecret = SecretGenerator.generateSecureJwtSecret(length);

// Generate service-specific key
const serviceKey = SecretGenerator.generateServiceKey('content-skimmer', 'prod');
```

### DeploymentManager

```javascript
import { DeploymentManager } from '@tamyla/clodo-framework/security';

// Deploy with security validation
await DeploymentManager.deployWithSecurity({
  customer: 'tamyla',
  environment: 'production',
  dryRun: false
});

// Generate secure configuration
const config = DeploymentManager.generateSecureConfig(customer, environment);
```

## Integration with Services

### Automatic Security Validation

When using the Clodo Framework, security validation is automatically applied:

1. **Pre-deployment Hook**: Configuration is validated before deployment
2. **Critical Issue Blocking**: Deployments are blocked if critical security issues are found
3. **Warning Reporting**: Non-critical issues are reported but don't block deployment

### Manual Integration

For services not using the full framework:

```javascript
import { securityModule } from '@tamyla/clodo-framework/modules/security';

// Register security hooks
moduleManager.registerModule('security', securityModule);

// Use security utilities
const issues = securityModule.validate(config, 'production');
const secureKey = securityModule.generateSecureKey('api-prefix');
```

## Security Patterns

### Insecure Patterns Detected

The module maintains a comprehensive database of insecure patterns:

- Dummy API keys: `content-skimmer-dev-key`, `test-api-key-*`, etc.
- Weak secrets: `password`, `admin`, `123456`, etc.
- Development URLs: `localhost`, `dev.`, `test.`, etc.
- Weak JWT patterns: Short secrets, common words, simple patterns

### Custom Patterns

You can extend the security patterns:

```javascript
import { INSECURE_PATTERNS } from '@tamyla/clodo-framework/security';

// Add custom insecure patterns
INSECURE_PATTERNS.DUMMY_API_KEYS.push('my-custom-dummy-key');
```

## Best Practices

### For Developers

1. **Use Generated Keys**: Always use cryptographically secure generated keys
2. **Environment Separation**: Keep development and production configurations separate
3. **Regular Validation**: Run security validation before deployments
4. **Secret Rotation**: Regularly rotate API keys and secrets

### For Operations

1. **Automated Validation**: Integrate security validation into CI/CD pipelines
2. **Monitoring**: Monitor for security validation failures
3. **Audit Logging**: Keep logs of security validation results
4. **Compliance**: Use security validation for compliance requirements

## Troubleshooting

### Common Issues

**"Critical security issues detected"**
- Check for dummy API keys in production configuration
- Ensure all secrets meet minimum length requirements
- Verify HTTPS URLs are used in production

**"Deployment blocked by security validation"**
- Run `npx clodo-security validate <customer> <environment>` to see issues
- Generate secure keys with `npx clodo-security generate-key`
- Update configuration with secure values

**"Weak secret detected"**
- Use `SecretGenerator.generateSecureJwtSecret()` for JWT secrets
- Ensure secrets are at least 32 characters for production
- Avoid common words or patterns in secrets

## Migration from Legacy Security

If migrating from the data-service security implementation:

1. Update imports to use framework security:
   ```javascript
   // Before
   const { ConfigurationSecurityValidator } = require('./tools/security-validator');

   // After
   const { ConfigurationValidator } = require('@tamyla/clodo-framework/security');
   ```

2. Update CLI commands:
   ```bash
   # Before
   npm run security:validate

   # After
   npx clodo-security validate customer environment
   ```

3. Update deployment scripts to use framework security module

## Future Enhancements

- Secret rotation scheduling
- External secret management integration
- Advanced compliance reporting
- Real-time security monitoring
- Automated vulnerability scanning