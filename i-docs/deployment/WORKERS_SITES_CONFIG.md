# 🌐 Workers Sites Configuration - Complete Guide

**Clodo Framework Feature** | **Version**: 3.0+ | **Status**: ✅ Production Ready
**Date**: October 27, 2025 (Consolidated Documentation)

---

## 📋 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [Technical Design](#-technical-design)
3. [User Guide](#-user-guide)
4. [API Reference](#-api-reference)

---

## 🎯 Executive Summary

### What It Does
Workers Sites Config transforms static asset deployment from a complex, manual process into a simple, automated feature. No more manual wrangler.toml configuration or KV namespace management - just specify your static files and Clodo handles the rest.

**Before**: Manual configuration requiring wrangler.toml knowledge
```toml
[sites]
bucket = "./dist"
include = ["**/*"]
exclude = ["node_modules/**", ".git/**"]
```

**After**: Automatic configuration from simple inputs
```bash
npx clodo create-service my-site \
  --type static-site \
  --domain www.example.com
```

### Key Benefits
- ⚡ **Zero Configuration**: Automatic wrangler.toml generation
- 🛡️ **Security First**: Aggressive defaults exclude sensitive files
- 🔧 **Build Integration**: Seamless integration with existing workflows
- 📦 **Asset Management**: Intelligent include/exclude patterns
- 🌍 **Multi-Environment**: Production, staging, development support

### Scope & Limitations
- **Scope**: Static-site template ONLY. Not added to other service types.
- **Trigger**: Only generate `[site]` when `serviceType === 'static-site'`
- **Boundary**: Maintains separation between static asset serving and application logic

---

## 🏗️ Technical Design

**Status**: Design Phase
**Priority**: P2 - Platform Completeness
**Effort**: 1-2 hours

### Design Decisions

#### 1. Conditional Generation
**Trigger**: Only generate `[site]` when `serviceType === 'static-site'`

```javascript
// In GenerationEngine.js or SiteConfigGenerator
generateWranglerToml(config) {
  const sections = [];

  // ... existing sections (name, compatibility_date, routes)

  // NEW: Conditional site configuration
  if (config.serviceType === 'static-site') {
    sections.push(this.generateSiteConfig(config));
  }

  return sections.join('\n\n');
}
```

#### 2. Site Configuration Structure
**wrangler.toml format:**
```toml
[site]
bucket = "./public"
include = ["**/*"]
exclude = ["node_modules/**", ".git/**", ".*", "*.md"]
```

**Design Rationale:**
- `bucket`: Points to build output directory (configurable)
- `include`: Catch-all pattern for assets
- `exclude`: Security-first exclusions (credentials, dependencies, source files)

#### 3. Default Configuration Values

**Bucket Path Logic:**
```javascript
function getSiteBucket(config) {
  // Priority order for bucket detection
  if (config.siteBucket) return config.siteBucket;
  if (exists('./dist')) return './dist';
  if (exists('./build')) return './build';
  if (exists('./public')) return './public';
  return './dist'; // Safe default
}
```

**Include Patterns:**
```javascript
const DEFAULT_INCLUDES = [
  '**/*',           // All files by default
  '.*',             // Hidden files (except excluded ones)
];
```

**Exclude Patterns (Security-First):**
```javascript
const DEFAULT_EXCLUDES = [
  'node_modules/**',    // Dependencies
  '.git/**',           // Version control
  '.env*',             // Environment files
  '*.key',             // Private keys
  '*.pem',             // Certificates
  '*.log',             // Log files
  '.*',                // Hidden files (except specific includes)
  '*.md',              // Documentation
  'package-lock.json', // Lock files
  'yarn.lock',         // Lock files
  'wrangler.toml',     // Config files
];
```

#### 4. Environment-Specific Configuration

**Development Environment:**
```toml
[site]
bucket = "./public"
include = ["**/*"]
exclude = ["node_modules/**", ".git/**"]
# More permissive for development
```

**Production Environment:**
```toml
[site]
bucket = "./dist"
include = ["**/*"]
exclude = ["node_modules/**", ".git/**", ".env*", "*.key", "*.log"]
# Stricter exclusions for security
```

#### 5. Integration Points

**With Build Process:**
- Detects build output directory automatically
- Supports common build directories (`./dist`, `./build`, `./public`)
- Configurable via `siteBucket` parameter

**With Deployment:**
- Integrated into wrangler.toml generation
- No separate KV namespace management
- Automatic cache configuration

**With Development Workflow:**
- Hot reload support in development
- Source map exclusion in production
- Development vs production build detection

### Architecture Components

#### SiteConfigGenerator Class
```typescript
class SiteConfigGenerator {
  constructor(options = {})

  generate(config): string
  getBucketPath(config): string
  getIncludePatterns(config): string[]
  getExcludePatterns(config): string[]
  buildSiteSection(config): string
  validateSiteConfig(config): ValidationResult
}
```

#### Integration with WranglerTomlGenerator
```typescript
class WranglerTomlGenerator {
  generate(config) {
    const sections = [
      this.generateNameSection(config),
      this.generateCompatibilitySection(config),
      this.generateRoutesSection(config),
    ];

    // Conditional site section
    if (config.serviceType === 'static-site') {
      sections.push(this.generateSiteSection(config));
    }

    return sections.filter(Boolean).join('\n\n');
  }

  generateSiteSection(config) {
    const siteGenerator = new SiteConfigGenerator();
    return siteGenerator.generate(config);
  }
}
```

### Configuration Schema

#### validation-config.json Extension
```json
{
  "sites": {
    "defaultBucket": "./dist",
    "defaultIncludes": ["**/*"],
    "defaultExcludes": [
      "node_modules/**",
      ".git/**",
      ".env*",
      "*.key",
      "*.pem",
      "*.log",
      ".*",
      "*.md",
      "package-lock.json",
      "yarn.lock",
      "wrangler.toml"
    ],
    "environmentOverrides": {
      "development": {
        "excludes": ["node_modules/**", ".git/**"]
      },
      "production": {
        "excludes": [
          "node_modules/**",
          ".git/**",
          ".env*",
          "*.key",
          "*.log",
          "*-debug.*",
          "*.map"
        ]
      }
    }
  }
}
```

### Error Handling

#### Validation Errors
- **Invalid Bucket Path**: Directory doesn't exist or not readable
- **Conflicting Patterns**: Include/exclude patterns overlap
- **Security Violations**: Sensitive files not excluded
- **Build Integration**: Build output directory not found

#### Recovery Strategies
- **Default Fallbacks**: Use safe default configurations
- **Warning Messages**: Non-blocking validation warnings
- **Graceful Degradation**: Skip site config if validation fails
- **User Guidance**: Clear error messages with fix suggestions

---

## 📖 User Guide

### Quick Start

#### Basic Static Site
```bash
# Create a static site service
npx clodo create-service my-site \
  --type static-site \
  --domain www.example.com
```

**Result**: Complete `wrangler.toml` with sites configuration:
```toml
# Cloudflare Workers Configuration
name = "my-site"
compatibility_date = "2024-01-01"

# Routes for www.example.com
[[routes]]
pattern = "www.example.com/*"
zone_id = "abc123..."

# Site configuration for static assets
[site]
bucket = "./dist"
include = ["**/*"]
exclude = ["node_modules/**", ".git/**", ".env*", "*.key", "*.log"]
```

#### Custom Build Directory
```bash
# Specify custom build output directory
npx clodo create-service my-site \
  --type static-site \
  --domain www.example.com \
  --site-bucket ./build
```

**Result**:
```toml
[site]
bucket = "./build"  # Custom directory
include = ["**/*"]
exclude = ["node_modules/**", ".git/**", ".env*", "*.key", "*.log"]
```

### Advanced Configuration

#### Custom Include/Exclude Patterns
```json
{
  "sites": {
    "include": ["**/*", "!*.tmp"],
    "exclude": ["node_modules/**", ".git/**", "src/**"]
  }
}
```

#### Environment-Specific Configuration
```json
{
  "sites": {
    "environmentOverrides": {
      "development": {
        "bucket": "./public",
        "exclude": ["node_modules/**"]
      },
      "production": {
        "bucket": "./dist",
        "exclude": ["node_modules/**", "*.map", "*-debug.*"]
      }
    }
  }
}
```

### Build Integration

#### Common Build Tools

**Vite:**
```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite dev"
  }
}
```
- Output: `./dist`
- Auto-detected by Workers Sites Config

**Next.js:**
```json
{
  "scripts": {
    "build": "next build",
    "export": "next export"
  }
}
```
- Output: `./out` (static export)
- Configure: `--site-bucket ./out`

**Create React App:**
```json
{
  "scripts": {
    "build": "react-scripts build"
  }
}
```
- Output: `./build`
- Auto-detected by Workers Sites Config

#### Custom Build Scripts
```json
{
  "scripts": {
    "build": "webpack --mode production --output-path ./dist",
    "predeploy": "npm run build"
  }
}
```

### Security Considerations

#### Automatic Exclusions
Workers Sites Config automatically excludes:
- `node_modules/**` - Dependencies
- `.git/**` - Version control
- `.env*` - Environment variables
- `*.key`, `*.pem` - Private keys and certificates
- `*.log` - Log files
- `wrangler.toml` - Configuration files

#### Additional Security Measures
```json
{
  "sites": {
    "exclude": [
      "config/secrets.json",
      "private/**",
      "*.private.*"
    ]
  }
}
```

### Performance Optimization

#### Cache Headers
Workers Sites Config integrates with Cloudflare's caching:
- Static assets cached at edge
- Automatic cache invalidation on deploy
- Custom cache rules via `_headers` file

#### Asset Optimization
- Automatic gzip compression
- Brotli compression for supported browsers
- WebP image optimization
- Minification for CSS/JS

### Troubleshooting

#### Common Issues

**Site not serving assets**:
- Check `bucket` path exists and contains files
- Verify build completed successfully
- Check wrangler.toml syntax

**Assets not updating**:
- Clear Cloudflare cache: `wrangler kv:namespace delete --all`
- Check cache headers in `_headers` file
- Verify build output directory

**Large deployment size**:
- Review exclude patterns
- Check for unnecessary files in build output
- Consider code splitting for large applications

**CORS issues**:
- Add `_headers` file to site bucket
- Configure CORS headers for API calls

#### Debug Commands
```bash
# Check site configuration
wrangler sites list

# Preview deployment
wrangler dev --site

# Check deployment status
wrangler deployments list
```

### Best Practices

#### Directory Structure
```
my-static-site/
├── public/           # Static assets (development)
├── src/             # Source files
├── dist/            # Build output (production)
├── _headers         # Custom headers
├── _redirects       # Redirect rules
└── package.json
```

#### Build Optimization
- Use modern build tools (Vite, Next.js, etc.)
- Enable code splitting for large applications
- Optimize images and assets
- Minify CSS and JavaScript

#### Deployment Strategy
- Test builds locally with `wrangler dev --site`
- Use preview deployments for staging
- Monitor bundle size and performance
- Set up automated deployments

---

## 🔧 API Reference

### SiteConfigGenerator Class

#### Constructor
```typescript
new SiteConfigGenerator(options?: SiteGeneratorOptions)
```

**Options:**
```typescript
interface SiteGeneratorOptions {
  defaultBucket?: string;
  strictSecurity?: boolean;
  environmentOverrides?: Record<string, SiteConfig>;
}
```

#### Methods

##### generate(config: ServiceConfig): string
Generates the complete `[site]` section for wrangler.toml.

**Parameters:**
- `config`: Service configuration object

**Returns:**
- TOML-formatted site configuration string

**Example:**
```typescript
const generator = new SiteConfigGenerator();
const siteConfig = generator.generate({
  serviceType: 'static-site',
  siteBucket: './dist'
});
// Returns: "[site]\nbucket = \"./dist\"\n..."
```

##### getBucketPath(config: ServiceConfig): string
Determines the correct bucket path for the service.

**Logic:**
1. Use `config.siteBucket` if specified
2. Auto-detect common build directories
3. Fall back to `./dist`

##### getIncludePatterns(config: ServiceConfig): string[]
Returns the include patterns for the site configuration.

##### getExcludePatterns(config: ServiceConfig): string[]
Returns the exclude patterns based on environment and security settings.

##### validateSiteConfig(config: ServiceConfig): ValidationResult
Validates the site configuration for security and correctness.

### Configuration Types

#### ServiceConfig
```typescript
interface ServiceConfig {
  serviceType: 'static-site' | string;
  siteBucket?: string;
  environment?: 'development' | 'staging' | 'production';
  customIncludes?: string[];
  customExcludes?: string[];
}
```

#### SiteConfig
```typescript
interface SiteConfig {
  bucket: string;
  include: string[];
  exclude: string[];
  cacheSettings?: CacheSettings;
}
```

#### ValidationResult
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
```

### Integration Examples

#### With WranglerTomlGenerator
```typescript
import { SiteConfigGenerator } from './generators/SiteConfigGenerator.js';

class WranglerTomlGenerator {
  generate(config) {
    let toml = '';

    // Basic configuration
    toml += this.generateBasicConfig(config);

    // Conditional site configuration
    if (config.serviceType === 'static-site') {
      const siteGenerator = new SiteConfigGenerator();
      toml += '\n\n' + siteGenerator.generate(config);
    }

    return toml;
  }
}
```

#### With Build Scripts
```json
{
  "scripts": {
    "build": "next build && next export",
    "deploy": "npm run build && clodo-service deploy",
    "dev": "wrangler dev --site"
  }
}
```

---

## 📚 Additional Resources

- [Clodo Framework Overview](../overview.md)
- [Static Site Template Guide](../guides/STATIC_SITE_TEMPLATE_GUIDE.md)
- [Deployment Guide](../deployment/DEPLOYMENT.md)
- [Configuration Guide](../guides/CONFIGURATION.md)

---

**Document Version**: 1.0 | **Last Updated**: October 27, 2025 | **Consolidated from 2 source documents**</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\clodo-framework\i-docs\deployment\WORKERS_SITES_CONFIG.md