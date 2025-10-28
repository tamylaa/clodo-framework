# Domain Configuration Examples

**Date**: October 28, 2025  
**Purpose**: Example domain configurations for clodo-service deployment  
**Location**: `config/domain-examples/`  

---

## 📋 Overview

This directory contains three comprehensive example domain configuration files that demonstrate different deployment strategies and use cases for the clodo-service framework. These examples show how to configure domains for various scenarios:

1. **Single Domain** - Simple production deployment
2. **Multi-Domain** - Complex multi-service architecture
3. **Environment-Mapped** - Development, staging, and production environments

---

## 📁 Configuration Files

### 1. `single-domain.json` - Simple Production Setup
**Use Case**: Single API service in production environment
**Complexity**: Basic
**Domains**: 1
**Environment**: Production only

**Key Features**:
- Single domain configuration
- Basic health checks
- CORS and rate limiting
- API routing rules
- Production security settings

### 2. `multi-domain.json` - Multi-Service Architecture
**Use Case**: Multiple services with different requirements
**Complexity**: Advanced
**Domains**: 3 (API, Admin, CDN)
**Environment**: Production only

**Key Features**:
- Three different service types
- Parallel deployment configuration
- Service-specific security policies
- Authentication requirements
- CDN caching configuration
- Rollback strategies

### 3. `environment-mapped.json` - Multi-Environment Setup
**Use Case**: Development workflow with multiple environments
**Complexity**: Enterprise
**Domains**: 3 (one per environment)
**Environments**: Development, Staging, Production

**Key Features**:
- Environment-specific configurations
- Different security levels per environment
- Monitoring and alerting setup
- Domain suffix mapping
- Environment-specific routing

---

## 🚀 Usage Guide

### Basic Usage

```bash
# Deploy using a domain configuration
npx clodo-service deploy --config config/domain-examples/single-domain.json

# Deploy to specific environment (for environment-mapped configs)
npx clodo-service deploy --config config/domain-examples/environment-mapped.json --environment production

# Deploy all domains (for multi-domain configs)
npx clodo-service deploy --config config/domain-examples/multi-domain.json --all-domains
```

### Configuration Structure

All configuration files follow this structure:

```json
{
  "domains": {
    "domain-name.com": {
      "environment": "production|staging|development",
      "serviceName": "unique-service-identifier",
      "serviceType": "data-service|web-service|static-site",
      "cloudflareToken": "your-api-token",
      "cloudflareAccountId": "your-account-id",
      "cloudflareZoneId": "your-zone-id",
      "displayName": "Human-readable name",
      "description": "Service description",
      "deploymentStrategy": "rolling|blue-green|instant",
      "healthCheck": { ... },
      "routing": { ... },
      "security": { ... }
    }
  },
  "global": {
    "customer": "your-company",
    "organization": "Your Organization",
    "contact": "devops@yourcompany.com",
    "version": "1.0.0",
    "lastUpdated": "2025-10-28"
  }
}
```

---

## 🔧 Configuration Details

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `serviceName` | Unique identifier for the service | `"api-service-prod"` |
| `serviceType` | Type of service | `"data-service"` |
| `cloudflareToken` | Cloudflare API token | `"CLOUDFLARE_TOKEN"` |
| `cloudflareAccountId` | Cloudflare account ID | `"1234567890abcdef..."` |
| `cloudflareZoneId` | Cloudflare zone ID | `"0987654321fedcba..."` |

### Optional Fields

| Field | Description | Default |
|-------|-------------|---------|
| `environment` | Target environment | `"production"` |
| `deploymentStrategy` | Deployment method | `"rolling"` |
| `displayName` | Human-readable name | Same as serviceName |
| `description` | Service description | `""` |

### Service Types

- **`data-service`**: API services with database connectivity
- **`web-service`**: Web applications with user interfaces
- **`static-site`**: Static content served via CDN

### Deployment Strategies

- **`rolling`**: Gradual replacement, zero downtime
- **`blue-green`**: Complete switch between versions
- **`instant`**: Immediate deployment (for static sites)

---

## 🛡️ Security Configuration

### CORS Settings

```json
"cors": {
  "enabled": true,
  "origins": ["https://app.example.com"],
  "methods": ["GET", "POST", "PUT", "DELETE"],
  "headers": ["Content-Type", "Authorization"]
}
```

### Rate Limiting

```json
"rateLimit": {
  "enabled": true,
  "requests": 1000,
  "window": 60
}
```

### Web Application Firewall (WAF)

```json
"waf": {
  "enabled": true,
  "rules": ["sql-injection", "xss", "csrf", "ddos"]
}
```

---

## 🔍 Health Checks

### Basic Health Check

```json
"healthCheck": {
  "enabled": true,
  "path": "/health",
  "interval": 30,
  "timeout": 10
}
```

### Advanced Health Check

```json
"healthCheck": {
  "enabled": true,
  "path": "/api/health",
  "interval": 60,
  "timeout": 15,
  "headers": {
    "Authorization": "Bearer health-check-token"
  },
  "expectedStatus": 200
}
```

---

## 🛣️ Routing Configuration

### Basic Routing

```json
"routing": {
  "rules": [
    {
      "pattern": "/api/*",
      "target": "api-worker",
      "methods": ["GET", "POST", "PUT", "DELETE"]
    }
  ]
}
```

### Advanced Routing with Authentication

```json
"routing": {
  "rules": [
    {
      "pattern": "/admin/*",
      "target": "admin-worker",
      "methods": ["GET", "POST", "PUT", "DELETE"],
      "auth": {
        "required": true,
        "type": "jwt"
      }
    }
  ]
}
```

### CDN Routing with Caching

```json
"routing": {
  "rules": [
    {
      "pattern": "/*",
      "target": "cdn-worker",
      "methods": ["GET", "HEAD"],
      "cache": {
        "enabled": true,
        "ttl": 3600,
        "purgeOnDeploy": true
      }
    }
  ]
}
```

---

## 🌍 Environment Mapping

### Environment Structure

```json
"environments": {
  "production": {
    "domains": { ... }
  },
  "staging": {
    "domains": { ... }
  },
  "development": {
    "domains": { ... }
  }
}
```

### Global Environment Configuration

```json
"global": {
  "environmentMapping": {
    "enabled": true,
    "defaultEnvironment": "development",
    "allowedEnvironments": ["development", "staging", "production"],
    "domainSuffixes": {
      "production": "",
      "staging": ".staging",
      "development": ".dev"
    }
  }
}
```

---

## 📊 Deployment Strategies

### Rolling Deployment
- Gradual replacement of instances
- Zero downtime
- Best for stateful services
- Default strategy

### Blue-Green Deployment
- Complete switch between versions
- Instant rollback capability
- Best for critical production services
- Requires double resources during deployment

### Instant Deployment
- Immediate replacement
- Fastest deployment
- Best for static sites and development
- Potential brief downtime

---

## 🔧 Customization Guide

### Adding a New Domain

1. Add domain entry to `domains` object
2. Configure required Cloudflare credentials
3. Set service-specific routing rules
4. Configure security policies
5. Add health check endpoints
6. Test configuration with `--dry-run`

### Environment-Specific Overrides

```json
"domains": {
  "api.example.com": {
    "environment": "production",
    "security": {
      "rateLimit": {
        "requests": 10000
      }
    }
  }
}
```

### Service-Specific Routing

```json
"routing": {
  "rules": [
    {
      "pattern": "/api/v1/*",
      "target": "api-v1-worker"
    },
    {
      "pattern": "/api/v2/*",
      "target": "api-v2-worker"
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Common Issues

**Configuration Validation Errors**
```
Error: Invalid domain configuration
Solution: Check required fields (serviceName, cloudflareToken, etc.)
```

**Cloudflare API Errors**
```
Error: Invalid API token
Solution: Verify CLOUDFLARE_API_TOKEN environment variable
```

**Domain Not Found**
```
Error: Domain not configured
Solution: Check domain spelling and configuration structure
```

**Health Check Failures**
```
Error: Health check timeout
Solution: Verify health endpoint exists and is accessible
```

### Debugging Commands

```bash
# Validate configuration
npx clodo-service deploy --config config/domain-examples/single-domain.json --dry-run

# Test specific domain
npx clodo-service deploy --config config/domain-examples/single-domain.json --domain api.example.com --dry-run

# Check environment variables
echo $CLOUDFLARE_API_TOKEN
echo $CLOUDFLARE_ACCOUNT_ID
```

---

## 📈 Best Practices

### Security
- Use environment variables for sensitive credentials
- Enable WAF rules for production environments
- Configure appropriate rate limits
- Use HTTPS-only origins in CORS

### Performance
- Enable caching for static content
- Configure appropriate health check intervals
- Use parallel deployments for multi-domain setups
- Monitor response times and error rates

### Reliability
- Configure health checks for all services
- Use blue-green deployments for critical services
- Enable rollback on failure
- Set appropriate timeouts

### Monitoring
- Enable monitoring for production environments
- Configure alerts for error rates and response times
- Log deployment events and failures
- Track deployment metrics

---

## 🔗 Related Documentation

- **Deploy Command**: `docs/ORCHESTRATOR_CLI_INTEGRATION.md`
- **API Reference**: `docs/api-reference.md`
- **Security Guide**: `docs/SECURITY.md`
- **Migration Guide**: `docs/MIGRATION_GUIDE.md`

---

## 📞 Support

For questions about domain configuration:
- Check the troubleshooting section above
- Review the API documentation
- Test with `--dry-run` flag first
- Contact: devops@example.com

---

**Version**: 1.0.0  
**Last Updated**: October 28, 2025  
**Examples**: 3 configurations  
**Use Cases**: Single domain, multi-domain, environment-mapped