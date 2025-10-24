# Static Site Template (SST) - Static Frontend Hosting

The **Static Site Template (SST)** is a specialized service type in the CLODO Framework that provides **static frontend hosting** capabilities using Cloudflare Workers Sites. It enables you to deploy static websites, SPAs (Single Page Applications), and static assets with optimal performance and global distribution.

## 🎯 What is Static Site Hosting?

Static Site Hosting in CLODO Framework provides:
- **Global CDN Distribution** - Content served from Cloudflare's edge network
- **SPA Support** - Automatic fallback to index.html for client-side routing
- **Asset Optimization** - Automatic compression and caching headers
- **Custom Domains** - Full domain configuration support
- **Build Integration** - Support for modern build tools (Vite, Next.js, etc.)

## 🚀 Quick Start

### 1. Create a Static Site Service

```bash
# Using the CLI
npx clodo-init-service my-static-site --type static-site --domain myapp.com

# Or programmatically
const { GenerationEngine } = require('clodo-framework');

const engine = new GenerationEngine();
await engine.generateStaticSite({
  serviceType: 'static-site',
  serviceName: 'my-static-site',
  domain: 'myapp.com'
}, {
  staticSite: {
    buildCommand: 'npm run build',
    buildOutputDir: 'dist',
    spaFallback: true
  }
}, './my-static-site');
```

### 2. Generated Structure

```
my-static-site/
├── src/
│   ├── worker/
│   │   └── index.js          # Cloudflare Worker with Workers Sites
│   ├── config/
│   │   └── domains.js        # Domain configuration
│   └── middleware/
│       └── StaticSiteMiddleware.js  # Asset optimization middleware
├── static-site-schema.json   # Service configuration schema
├── README.md                 # Service documentation
└── package.json             # Dependencies and scripts
```

### 3. Deploy Your Site

```bash
cd my-static-site
npm install
npm run deploy
```

## ⚙️ Configuration Options

### Core Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `buildCommand` | string | `"npm run build"` | Command to build your static assets |
| `buildOutputDir` | string | `"dist"` | Directory containing built assets |
| `spaFallback` | boolean | `true` | Enable SPA routing fallback |

### Advanced Configuration

```javascript
// In your confirmedValues
{
  staticSite: {
    buildCommand: 'vite build --mode production',
    buildOutputDir: 'build',
    spaFallback: true,
    // Additional options will be supported in future versions
    customHeaders: {
      '/*': {
        'Cache-Control': 'public, max-age=31536000'
      }
    }
  }
}
```

## 🏗️ Build Integration

### Supported Build Tools

SST works with any build tool that outputs static files:

- **Vite**: `vite build`
- **Next.js**: `next build && next export`
- **Create React App**: `npm run build`
- **Vue CLI**: `vue-cli-service build`
- **Angular**: `ng build --prod`
- **Custom**: Any command that generates static files

### Build Output Structure

Your build command should output files to the configured `buildOutputDir`:

```
dist/
├── index.html
├── assets/
│   ├── main.js
│   ├── main.css
│   └── ...
└── favicon.ico
```

## 🌐 Domain Configuration

### Custom Domains

SST automatically configures domains for your static site:

```javascript
// Generated domains.js
export const domains = {
  'myapp.com': {
    serviceType: 'static-site',
    spaFallback: true
  }
};
```

### Workers Sites Configuration

The generated Worker automatically serves your static files:

```javascript
// src/worker/index.js (generated)
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    try {
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: ASSET_MANIFEST,
          cacheControl: {
            browserTTL: 60 * 60 * 24 * 30, // 30 days
          },
        }
      );
    } catch (e) {
      // SPA fallback - serve index.html for client-side routing
      return await getAssetFromKV(
        {
          request: new Request(`${new URL(request.url).origin}/index.html`, request),
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: ASSET_MANIFEST,
        }
      );
    }
  },
};
```

## 🔧 Middleware Features

### Asset Optimization

SST includes middleware for optimal asset delivery:

- **Compression**: Automatic gzip/brotli compression
- **Caching**: Intelligent cache headers based on file type
- **CORS**: Proper CORS headers for assets
- **Security**: Security headers for static content

### SPA Routing

When `spaFallback: true`, the service automatically:
- Serves `index.html` for all non-asset routes
- Enables client-side routing for SPAs
- Maintains SEO compatibility

## 📊 Performance Features

### CDN Distribution
- **Global Edge Network**: Content served from 200+ locations
- **Automatic Caching**: Optimized cache headers
- **Compression**: Automatic content compression

### Asset Optimization
- **File Type Detection**: Appropriate headers for each file type
- **Immutable Caching**: Long-term caching for hashed assets
- **Lazy Loading**: Efficient asset serving

## 🔒 Security Considerations

### Content Security
- **HTTPS Only**: All content served over HTTPS
- **Secure Headers**: Security headers included
- **CORS Control**: Configurable CORS policies

### Access Control
- **Public Access**: Static sites are publicly accessible
- **Domain Restrictions**: Limited to configured domains
- **Rate Limiting**: Cloudflare rate limiting available

## 🧪 Testing

### Generated Test Suite

SST includes comprehensive tests:

```bash
# Run SST-specific tests
npm test -- --testPathPattern="StaticSiteGenerator"

# Run all tests
npm test
```

### Integration Testing

Test the complete SST workflow:

```javascript
const { GenerationEngine } = require('clodo-framework');

const engine = new GenerationEngine();
const result = await engine.generateStaticSite(coreInputs, confirmedValues, outputPath);
// result contains the path to generated service
```

## 🚀 Deployment

### Cloudflare Workers Deployment

```bash
# Install dependencies
npm install

# Build static assets
npm run build

# Deploy to Cloudflare
npm run deploy
```

### Environment Configuration

Configure your deployment environment:

```bash
# Set Cloudflare credentials
export CLOUDFLARE_API_TOKEN=your_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id

# Deploy
npm run deploy
```

## 📚 API Reference

### GenerationEngine.generateStaticSite()

```typescript
generateStaticSite(
  coreInputs: CoreInputs,
  confirmedValues: ConfirmedValues,
  servicePath: string
): Promise<string>
```

**Parameters:**
- `coreInputs`: Service core configuration
- `confirmedValues`: Static site specific configuration
- `servicePath`: Output directory path

**Returns:** Path to the generated service directory

### StaticSiteGenerator

```typescript
class StaticSiteGenerator extends BaseGenerator {
  async generate(context: GenerationContext): Promise<void>
  async generateHandlers(context: GenerationContext): Promise<void>
  async generateSchemas(context: GenerationContext): Promise<void>
  async generateMiddleware(context: GenerationContext): Promise<void>
  async generateDocs(context: GenerationContext): Promise<void>
  validateConfig(config: StaticSiteConfig): boolean
}
```

## 🐛 Troubleshooting

### Common Issues

**Build fails during deployment:**
- Ensure your `buildCommand` outputs to the correct `buildOutputDir`
- Check that all dependencies are installed

**SPA routing not working:**
- Verify `spaFallback: true` in configuration
- Ensure `index.html` exists in build output

**Assets not loading:**
- Check file paths in build output
- Verify Workers Sites binding is configured

### Debug Mode

Enable debug logging:

```bash
DEBUG=clodo:* npm run deploy
```

## 📈 Best Practices

### Performance
- Use hashed asset filenames for optimal caching
- Minimize bundle sizes
- Enable compression in your build tool

### SEO
- Pre-render critical content for better SEO
- Use meta tags in your HTML
- Implement proper Open Graph tags

### Development
- Use local development server during development
- Test builds locally before deployment
- Use source maps for debugging

## 🔄 Migration Guide

### From Other Platforms

**From Netlify/Vercel:**
- Update build commands to match CLODO format
- Configure custom domains in CLODO
- Update environment variables

**From Traditional Hosting:**
- Convert to static generation
- Update asset paths for CDN
- Configure SPA fallback if needed

## 📞 Support

- **Documentation**: [CLODO Framework Docs](https://github.com/tamylaa/clodo-framework)
- **Issues**: [GitHub Issues](https://github.com/tamylaa/clodo-framework/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tamylaa/clodo-framework/discussions)

---

**Static Site Template (SST)** - Production-ready static frontend hosting for the modern web.</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\clodo-framework\docs\STATIC_SITE_TEMPLATE_GUIDE.md