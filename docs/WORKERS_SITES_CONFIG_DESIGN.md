# Workers Sites Configuration - Design Specification

**Status**: Design Phase  
**Priority**: P2 - Platform Completeness  
**Effort**: 1-2 hours  
**Date**: October 23, 2025

## Overview

Design for automatic Workers Sites `[site]` configuration generation in wrangler.toml. This feature enables the static-site template to serve static assets from a bucket.

**Scope**: Static-site template ONLY. Not added to other service types.

## Goals

1. Generate `[site]` section conditionally based on serviceType
2. Configure bucket path, include/exclude patterns, cache headers
3. Keep configuration minimal and sensible defaults
4. Maintain boundary: static-site template only

## Design Decisions

### 1. Conditional Generation

**Trigger**: Only generate `[site]` when `serviceType === 'static-site'`

```javascript
// In GenerationEngine.js
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

### 2. Site Configuration Structure

**wrangler.toml format:**
```toml
[site]
bucket = "./public"
include = ["**/*"]
exclude = ["node_modules/**", ".git/**", ".*", "*.md"]
```

**Configuration options:**

| Option | Default | Description |
|--------|---------|-------------|
| `bucket` | `"./public"` | Directory containing static assets |
| `include` | `["**/*"]` | Glob patterns to include |
| `exclude` | `["node_modules/**", ".git/**", ".*", "*.md"]` | Patterns to exclude |

### 3. Integration Points

**Template structure requirement:**
```
templates/static-site/
├── public/                  # Static assets bucket
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── images/
├── src/
│   └── worker/
│       └── index.js        # Static file server worker
├── wrangler.toml           # Generated with [site] section
└── package.json
```

### 4. Validation Rules

**Pre-generation checks:**
1. Verify `serviceType === 'static-site'`
2. Ensure `bucket` path exists (relative to service root)
3. Warn if bucket is empty (no files to serve)

**Boundary enforcement:**
```javascript
// Prevent [site] in non-static templates
if (config.serviceType !== 'static-site' && config.siteConfig) {
  throw new Error('[site] configuration only supported for static-site template');
}
```

## Implementation Plan

### Phase 1: Add generateSiteConfig() Method

**File**: `src/service-management/GenerationEngine.js`

```javascript
/**
 * Generate Workers Sites configuration for static-site template
 * @param {Object} config - Service configuration
 * @returns {string} TOML [site] section
 */
generateSiteConfig(config) {
  // Only for static-site template
  if (config.serviceType !== 'static-site') {
    return '';
  }
  
  const siteConfig = config.siteConfig || {};
  const bucket = siteConfig.bucket || './public';
  const include = siteConfig.include || ['**/*'];
  const exclude = siteConfig.exclude || [
    'node_modules/**',
    '.git/**',
    '.*',
    '*.md'
  ];
  
  // Build TOML section
  const lines = [
    '[site]',
    `bucket = "${bucket}"`,
    `include = ${JSON.stringify(include)}`,
    `exclude = ${JSON.stringify(exclude)}`
  ];
  
  return lines.join('\n');
}
```

### Phase 2: Integrate into generateWranglerToml()

**Modification location**: After routes generation, before closing

```javascript
generateWranglerToml(config) {
  const sections = [];
  
  // Basic config
  sections.push(`name = "${config.serviceName}"`);
  sections.push(`main = "src/worker/index.js"`);
  sections.push(`compatibility_date = "${this.getCompatibilityDate()}"`);
  
  // Routes (if domain config exists)
  if (config.domainConfig) {
    sections.push(this.generateRoutesFromDomains(config.domainConfig));
  }
  
  // NEW: Site config for static-site template
  if (config.serviceType === 'static-site') {
    const siteConfig = this.generateSiteConfig(config);
    if (siteConfig) {
      sections.push(siteConfig);
    }
  }
  
  return sections.join('\n\n');
}
```

### Phase 3: Template Integration

**Add to static-site template config:**

```javascript
// templates/static-site/template-config.json
{
  "serviceType": "static-site",
  "siteConfig": {
    "bucket": "./public",
    "include": ["**/*"],
    "exclude": [
      "node_modules/**",
      ".git/**",
      ".*",
      "*.md",
      "README.md",
      ".DS_Store"
    ]
  }
}
```

## Configuration Customization

Users can override defaults in their service config:

```javascript
// Custom site configuration
const config = {
  serviceName: 'my-static-site',
  serviceType: 'static-site',
  siteConfig: {
    bucket: './dist',           // Custom build output
    include: ['**/*.{html,css,js,png,jpg,svg}'],
    exclude: ['**/*.map']       // Exclude source maps
  }
};
```

## Error Handling

### 1. Invalid Service Type

```javascript
if (config.siteConfig && config.serviceType !== 'static-site') {
  throw new Error(
    'Workers Sites [site] configuration only supported for static-site template. ' +
    `Current serviceType: ${config.serviceType}`
  );
}
```

### 2. Missing Bucket

```javascript
const bucketPath = path.join(outputDir, bucket);
if (!fs.existsSync(bucketPath)) {
  console.warn(`⚠️  Bucket directory not found: ${bucket}`);
  console.warn(`   Workers Sites will fail to deploy without static assets.`);
  console.warn(`   Create the directory: mkdir ${bucket}`);
}
```

### 3. Empty Bucket

```javascript
const files = fs.readdirSync(bucketPath);
if (files.length === 0) {
  console.warn(`⚠️  Bucket directory is empty: ${bucket}`);
  console.warn(`   Add HTML/CSS/JS files to ${bucket}/ directory`);
}
```

## Testing Strategy

### Unit Tests (8 tests)

1. **Basic generation**:
   - Generates [site] section for static-site template
   - Returns empty string for non-static templates

2. **Default values**:
   - Uses ./public as default bucket
   - Includes default exclude patterns

3. **Custom configuration**:
   - Respects custom bucket path
   - Respects custom include/exclude patterns

4. **TOML formatting**:
   - Generates valid TOML syntax
   - Escapes special characters in paths

### Integration Tests (6 tests)

5. **Template generation**:
   - Generated static-site wrangler.toml includes [site]
   - Non-static templates don't include [site]

6. **Boundary enforcement**:
   - Throws error if siteConfig on non-static template

### Validation Tests (4 tests)

7. **Bucket validation**:
   - Warns if bucket doesn't exist
   - Warns if bucket is empty

8. **Path resolution**:
   - Handles relative paths correctly
   - Handles absolute paths correctly

## Compatibility

- **Cloudflare Workers**: Native Workers Sites support
- **wrangler CLI**: v3.0.0+ (current tooling)
- **Existing templates**: No impact (feature not added)
- **Static-site template**: Required dependency

## Migration Path

**No migration needed** - This is a new feature for new template type.

Existing services are unaffected.

## Security Considerations

### 1. Path Traversal

**Risk**: Bucket path could reference files outside service directory

**Mitigation**:
```javascript
const safeBucket = path.normalize(bucket).replace(/^(\.\.[\/\\])+/, '');
if (safeBucket !== bucket) {
  throw new Error('Bucket path cannot traverse outside service directory');
}
```

### 2. Sensitive File Exposure

**Risk**: Accidentally serving .env files or secrets

**Mitigation**: Aggressive default excludes:
```javascript
exclude: [
  'node_modules/**',
  '.git/**',
  '.*',              // All hidden files
  '*.md',
  '.env*',           // Environment files
  'secrets/**',      // Secret directories
  'wrangler.toml',   // Config files
  'package.json'
]
```

## Documentation

### 1. ROUTING_GUIDE.md Addition

Add section on Workers Sites configuration:

```markdown
## Workers Sites Configuration

For static-site templates, the framework automatically configures Workers Sites:

\`\`\`toml
[site]
bucket = "./public"
include = ["**/*"]
exclude = ["node_modules/**", ".git/**"]
\`\`\`

### Custom Bucket Path

\`\`\`javascript
const config = {
  serviceType: 'static-site',
  siteConfig: {
    bucket: './dist'  // Custom build output
  }
};
\`\`\`
```

### 2. Template README

Each static-site template includes:

```markdown
## Static Assets

Place your HTML, CSS, JavaScript, and images in the `public/` directory:

\`\`\`
public/
├── index.html
├── css/style.css
├── js/app.js
└── images/logo.png
\`\`\`

These files are automatically deployed with your worker.
```

## Performance

- **Generation time**: <1ms (minimal TOML formatting)
- **No runtime impact**: Configuration only, no code changes
- **Bundle size**: 0 bytes (configuration, not code)

## Success Criteria

✅ Generates valid [site] TOML section  
✅ Only applies to static-site template  
✅ Supports custom bucket paths  
✅ Includes sensible security defaults  
✅ Validates bucket existence  
✅ Passes all 18 tests (8 unit + 6 integration + 4 validation)  
✅ Zero impact on existing templates  

## Timeline

- **Design**: 1 hour (this document)
- **Implementation**: 2 hours (generateSiteConfig + integration)
- **Testing**: 2 hours (18 tests)
- **Documentation**: 1 hour (updates)

**Total**: 4-6 hours

## Next Steps

1. ✅ Complete design specification (this document)
2. → Implement generateSiteConfig() method
3. → Integrate into GenerationEngine
4. → Write 18 comprehensive tests
5. → Update documentation
6. → Create static-site template (depends on this)

---

**Design Status**: ✅ COMPLETE  
**Ready for Implementation**: YES  
**Blocking**: TODO #13 (Static-Site Template - Design)
