/**
 * Enhanced Secret Generation Module
 * Enterprise-grade cryptographic secret management with multi-domain and cross-environment capabilities
 * 
 * Enhanced from deprecated smart-deployment.js with advanced features:
 * - Multi-domain secret coordination
 * - Cross-environment secret management  
 * - Multiple output formats (env, JSON, wrangler)
 * - Secret rotation planning
 * - Audit logging and validation
 */

import { randomBytes, createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SECRET_CONFIGS = {
  'AUTH_JWT_SECRET': { length: 64, description: 'JWT token signing secret', scope: 'critical' },
  'X_SERVICE_KEY': { length: 64, description: 'Service authentication key', scope: 'critical' },
  'AUTH_SERVICE_API_KEY': { length: 48, description: 'Auth service API key', scope: 'standard' },
  'LOGGER_SERVICE_API_KEY': { length: 48, description: 'Logger service API key', scope: 'standard' },
  'CONTENT_SKIMMER_API_KEY': { length: 48, description: 'Content service API key', scope: 'standard' },
  'CROSS_DOMAIN_AUTH_KEY': { length: 64, description: 'Cross-domain authentication key', scope: 'critical' },
  'WEBHOOK_SIGNATURE_KEY': { length: 32, description: 'Webhook signature verification key', scope: 'standard' },
  'FILE_ENCRYPTION_KEY': { length: 64, description: 'File encryption key', scope: 'critical' },
  'SESSION_ENCRYPTION_KEY': { length: 48, description: 'Session encryption key', scope: 'standard' },
  'API_RATE_LIMIT_KEY': { length: 32, description: 'API rate limiting key', scope: 'standard' }
};

/**
 * Enhanced Secret Manager Class
 * Provides enterprise-grade secret management with multi-domain coordination
 */
export class EnhancedSecretManager {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || join(__dirname, '..', '..');
    this.dryRun = options.dryRun || false;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 2000;
    
    // Multi-domain and environment tracking
    this.domainSecrets = new Map();
    this.environmentConfigs = new Map();
    this.rotationSchedule = new Map();
    
    // Paths for secret management
    this.secretPaths = {
      root: join(this.projectRoot, 'secrets'),
      distribution: join(this.projectRoot, 'secrets', 'distribution'),
      backups: join(this.projectRoot, 'secrets', 'backups'),
      audit: join(this.projectRoot, 'logs', 'secrets-audit.log'),
      templates: join(this.projectRoot, 'secrets', 'templates')
    };

    // Supported output formats
    this.outputFormats = {
      env: { extension: '.env', description: 'Environment variables' },
      json: { extension: '.json', description: 'JSON format' },
      wrangler: { extension: '.sh', description: 'Wrangler CLI commands' },
      powershell: { extension: '.ps1', description: 'PowerShell commands' },
      docker: { extension: '.env', description: 'Docker environment file' },
      kubernetes: { extension: '.yaml', description: 'Kubernetes secrets' }
    };

    this.initializeSecretManager();
  }

  /**
   * Initialize enhanced secret manager
   */
  initializeSecretManager() {
    console.log('🔐 Enhanced Secret Manager v2.0');
    console.log('===============================');
    console.log(`📁 Secret Root: ${this.secretPaths.root}`);
    console.log(`🔍 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE OPERATIONS'}`);
    console.log(`📊 Formats: ${Object.keys(this.outputFormats).join(', ')}`);
    console.log('');

    // Create directories
    Object.values(this.secretPaths).forEach(path => {
      if (!path.endsWith('.log')) {
        this.ensureDirectory(path);
      }
    });

    this.logSecretEvent('MANAGER_INITIALIZED', 'SYSTEM', {
      formats: Object.keys(this.outputFormats),
      mode: this.dryRun ? 'DRY_RUN' : 'LIVE'
    });
  }

  /**
   * Generate domain-specific secrets with environment coordination
   * @param {string} domain - Domain name
   * @param {string} environment - Environment (production, staging, development)
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated secrets and metadata
   */
  async generateDomainSpecificSecrets(domain, environment = 'production', options = {}) {
    const {
      customConfigs = {},
      reuseExisting = true,
      rotateAll = false,
      formats = ['env', 'json', 'wrangler']
    } = options;

    console.log(`🔑 Generating secrets for ${domain} (${environment})`);
    console.log(`   🔄 Reuse Existing: ${reuseExisting}`);
    console.log(`   🔁 Rotate All: ${rotateAll}`);
    console.log(`   📋 Formats: ${formats.join(', ')}`);

    try {
      // Load existing secrets if requested
      let existingSecrets = {};
      if (reuseExisting && !rotateAll) {
        const existing = await this.loadDomainSecrets(domain, environment);
        if (existing) {
          existingSecrets = existing.secrets;
          console.log(`   📂 Loaded ${Object.keys(existingSecrets).length} existing secrets`);
        }
      }

      // Merge configurations
      const configs = { ...SECRET_CONFIGS, ...customConfigs };
      const secrets = { ...existingSecrets };
      let generated = 0;

      // Generate missing or rotated secrets
      for (const [key, config] of Object.entries(configs)) {
        if (!secrets[key] || rotateAll) {
          secrets[key] = this.generateSecretValue(config.length);
          generated++;
        }
      }

      console.log(`   🔑 Generated ${generated} new secrets, reused ${Object.keys(secrets).length - generated}`);

      // Create secret metadata
      const secretData = {
        domain,
        environment,
        generated: new Date().toISOString(),
        generatedBy: 'EnhancedSecretManager v2.0',
        secretCount: Object.keys(secrets).length,
        newSecrets: generated,
        formats: formats,
        ...secrets
      };

      // Save secrets
      const savedFile = await this.saveDomainSecrets(domain, environment, secretData);

      // Generate distribution files
      const distribution = await this.generateSecretDistribution(domain, environment, secrets, formats);

      // Deploy secrets if not dry run
      let deployment = null;
      if (!this.dryRun && options.deploy) {
        deployment = await this.deploySecretsToCloudflare(domain, environment, secrets);
      }

      // Update domain tracking
      this.domainSecrets.set(`${domain}-${environment}`, {
        secrets,
        generated: new Date(),
        formats,
        deployment
      });

      this.logSecretEvent('SECRETS_GENERATED', domain, {
        environment,
        secretCount: Object.keys(secrets).length,
        newSecrets: generated,
        formats
      });

      return {
        domain,
        environment,
        secrets,
        metadata: secretData,
        savedFile,
        distribution,
        deployment,
        summary: {
          total: Object.keys(secrets).length,
          generated,
          reused: Object.keys(secrets).length - generated
        }
      };

    } catch (error) {
      this.logSecretEvent('SECRET_GENERATION_FAILED', domain, {
        environment,
        error: error.message
      });
      throw new Error(`Secret generation failed for ${domain}: ${error.message}`);
    }
  }

  /**
   * Coordinate secrets across multiple environments for a domain
   * @param {string} domain - Domain name
   * @param {Array} environments - Environments to coordinate
   * @param {Object} options - Coordination options
   * @returns {Promise<Object>} Coordination results
   */
  async coordinateSecretsAcrossEnvironments(domain, environments = ['development', 'staging', 'production'], options = {}) {
    console.log(`🌐 Cross-Environment Secret Coordination for ${domain}`);
    console.log(`   🌍 Environments: ${environments.join(', ')}`);

    const {
      syncCriticalSecrets = true,
      generateUniquePerEnv = true,
      formats = ['env', 'json', 'wrangler']
    } = options;

    const results = {
      domain,
      environments: {},
      sharedSecrets: {},
      coordinationId: this.generateCoordinationId(domain),
      startTime: new Date()
    };

    try {
      // Generate base secrets for production first
      const productionSecrets = await this.generateDomainSpecificSecrets(domain, 'production', {
        ...options,
        formats
      });

      results.environments.production = productionSecrets;

      // Extract critical secrets to share across environments
      if (syncCriticalSecrets) {
        const criticalConfigs = Object.entries(SECRET_CONFIGS)
          .filter(([, config]) => config.scope === 'critical');
        
        for (const [key, ] of criticalConfigs) {
          if (productionSecrets.secrets[key]) {
            results.sharedSecrets[key] = productionSecrets.secrets[key];
          }
        }
        
        console.log(`   🔗 Sharing ${Object.keys(results.sharedSecrets).length} critical secrets across environments`);
      }

      // Process other environments
      for (const env of environments) {
        if (env === 'production') continue;

        console.log(`\n   🌍 Processing ${env} environment...`);

        const envOptions = {
          ...options,
          customConfigs: generateUniquePerEnv ? {} : results.sharedSecrets,
          reuseExisting: !generateUniquePerEnv,
          formats
        };

        const envSecrets = await this.generateDomainSpecificSecrets(domain, env, envOptions);

        // Override with shared secrets if coordinating
        if (syncCriticalSecrets) {
          Object.assign(envSecrets.secrets, results.sharedSecrets);
          
          // Re-save with coordinated secrets
          await this.saveDomainSecrets(domain, env, {
            ...envSecrets.metadata,
            ...envSecrets.secrets,
            coordinated: true,
            coordinationId: results.coordinationId
          });

          // Re-generate distribution with coordinated secrets
          envSecrets.distribution = await this.generateSecretDistribution(
            domain, env, envSecrets.secrets, formats
          );
        }

        results.environments[env] = envSecrets;
      }

      results.endTime = new Date();
      results.duration = (results.endTime - results.startTime) / 1000;

      this.logSecretEvent('CROSS_ENVIRONMENT_COORDINATION_COMPLETED', domain, {
        coordinationId: results.coordinationId,
        environments: environments,
        sharedSecrets: Object.keys(results.sharedSecrets).length,
        duration: results.duration
      });

      console.log(`\n✅ Cross-environment coordination completed (${results.duration.toFixed(1)}s)`);
      console.log(`   🔗 Shared secrets: ${Object.keys(results.sharedSecrets).length}`);
      console.log(`   🌍 Environments: ${Object.keys(results.environments).length}`);

      return results;

    } catch (error) {
      this.logSecretEvent('CROSS_ENVIRONMENT_COORDINATION_FAILED', domain, {
        coordinationId: results.coordinationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Deploy secrets to Cloudflare Workers across environments
   * @param {string} domain - Domain name
   * @param {string} environment - Environment
   * @param {Object} secrets - Secrets to deploy
   * @returns {Promise<Object>} Deployment results
   */
  async deploySecretsToCloudflare(domain, environment, secrets) {
    console.log(`   ☁️ Deploying ${Object.keys(secrets).length} secrets to Cloudflare (${environment})...`);

    if (this.dryRun) {
      console.log(`     🔍 DRY RUN: Would deploy secrets to ${environment}`);
      return { status: 'dry-run', secretCount: Object.keys(secrets).length };
    }

    const results = {
      domain,
      environment,
      deployed: [],
      failed: [],
      startTime: new Date()
    };

    try {
      for (const [key, value] of Object.entries(secrets)) {
        try {
          await this.deploySingleSecret(key, value, environment);
          results.deployed.push(key);
          console.log(`     ✅ ${key} deployed`);
        } catch (error) {
          results.failed.push({ key, error: error.message });
          console.log(`     ❌ ${key} failed: ${error.message}`);
        }
      }

      results.endTime = new Date();
      results.duration = (results.endTime - results.startTime) / 1000;

      this.logSecretEvent('SECRETS_DEPLOYED', domain, {
        environment,
        deployed: results.deployed.length,
        failed: results.failed.length,
        duration: results.duration
      });

      return results;

    } catch (error) {
      this.logSecretEvent('SECRET_DEPLOYMENT_FAILED', domain, {
        environment,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Deploy single secret with retry logic
   * @param {string} key - Secret key
   * @param {string} value - Secret value
   * @param {string} environment - Environment
   */
  async deploySingleSecret(key, value, environment) {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const command = `echo "${value}" | npx wrangler secret put ${key} --env ${environment}`;
        
        execSync(command, {
          shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: 30000
        });
        
        return;
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw error;
        }
        
        console.log(`     ⚠️ Attempt ${attempt} failed for ${key}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  /**
   * Generate enhanced secret distribution files
   * @param {string} domain - Domain name
   * @param {string} environment - Environment
   * @param {Object} secrets - Secrets to distribute
   * @param {Array} formats - Output formats
   * @returns {Promise<Object>} Distribution results
   */
  async generateSecretDistribution(domain, environment, secrets, formats) {
    const distDir = join(this.secretPaths.distribution, domain, environment);
    this.ensureDirectory(distDir);

    const distribution = {
      domain,
      environment,
      directory: distDir,
      files: {},
      formats: formats,
      generated: new Date()
    };

    console.log(`   📤 Generating distribution files in ${formats.join(', ')} formats...`);

    try {
      for (const format of formats) {
        if (this.outputFormats[format]) {
          const file = await this.generateFormatFile(distDir, domain, environment, secrets, format);
          distribution.files[format] = file;
          console.log(`     📄 ${format}: ${file.filename}`);
        }
      }

      // Generate comprehensive README
      const readme = await this.generateDistributionReadme(domain, environment, secrets, formats);
      distribution.files.readme = readme;

      this.logSecretEvent('DISTRIBUTION_GENERATED', domain, {
        environment,
        formats,
        fileCount: Object.keys(distribution.files).length
      });

      return distribution;

    } catch (error) {
      this.logSecretEvent('DISTRIBUTION_GENERATION_FAILED', domain, {
        environment,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate specific format file
   * @param {string} distDir - Distribution directory
   * @param {string} domain - Domain name
   * @param {string} environment - Environment
   * @param {Object} secrets - Secrets
   * @param {string} format - Format type
   * @returns {Promise<Object>} File information
   */
  async generateFormatFile(distDir, domain, environment, secrets, format) {
    const formatConfig = this.outputFormats[format];
    const filename = `secrets-${environment}${formatConfig.extension}`;
    const filepath = join(distDir, filename);

    let content = '';

    switch (format) {
      case 'env':
        content = Object.entries(secrets)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        break;

      case 'json':
        content = JSON.stringify(secrets, null, 2);
        break;

      case 'wrangler':
        content = [
          '#!/bin/bash',
          `# Wrangler secret deployment for ${domain} (${environment})`,
          `# Generated: ${new Date().toISOString()}`,
          '',
          ...Object.entries(secrets).map(([key, value]) => 
            `echo "${value}" | npx wrangler secret put ${key} --env ${environment}`)
        ].join('\n');
        break;

      case 'powershell':
        content = [
          `# PowerShell secret deployment for ${domain} (${environment})`,
          `# Generated: ${new Date().toISOString()}`,
          '',
          ...Object.entries(secrets).map(([key, value]) => 
            `"${value}" | npx wrangler secret put ${key} --env ${environment}`)
        ].join('\n');
        break;

      case 'docker':
        content = Object.entries(secrets)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        break;

      case 'kubernetes': {
        const encodedSecrets = {};
        Object.entries(secrets).forEach(([key, value]) => {
          encodedSecrets[key] = Buffer.from(value).toString('base64');
        });
        
        content = [
          'apiVersion: v1',
          'kind: Secret',
          'metadata:',
          `  name: ${domain.replace(/\./g, '-')}-secrets-${environment}`,
          `  namespace: ${environment}`,
          'type: Opaque',
          'data:',
          ...Object.entries(encodedSecrets).map(([key, value]) => `  ${key}: ${value}`)
        ].join('\n');
        break;
      }

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    writeFileSync(filepath, content);

    return {
      format,
      filename,
      filepath,
      description: formatConfig.description,
      size: content.length
    };
  }

  /**
   * Generate comprehensive distribution README
   * @param {string} domain - Domain name
   * @param {string} environment - Environment  
   * @param {Object} secrets - Secrets
   * @param {Array} formats - Formats
   * @returns {Promise<Object>} README file info
   */
  async generateDistributionReadme(domain, environment, secrets, formats) {
    const readmeContent = `# Secret Distribution for ${domain} (${environment})

Generated: ${new Date().toISOString()}
Secret Count: ${Object.keys(secrets).length}
Formats: ${formats.join(', ')}

## 🔐 Generated Files

${formats.map(format => {
  const config = this.outputFormats[format];
  const filename = `secrets-${environment}${config.extension}`;
  return `- **${filename}** - ${config.description}`;
}).join('\n')}

## 🚀 Usage Instructions

### Environment Variables (.env)
\`\`\`bash
# For Node.js applications
cp secrets-${environment}.env /path/to/your/app/.env
source secrets-${environment}.env
\`\`\`

### JSON Format
\`\`\`javascript
// For API consumption
const secrets = require('./secrets-${environment}.json');
console.log(secrets.AUTH_JWT_SECRET);
\`\`\`

### Cloudflare Workers Deployment
\`\`\`bash
# Linux/Mac
chmod +x secrets-${environment}.sh
./secrets-${environment}.sh

# Windows PowerShell  
.\\secrets-${environment}.ps1
\`\`\`

### Docker Deployment
\`\`\`bash
# Use as environment file
docker run --env-file secrets-${environment}.env your-image
\`\`\`

### Kubernetes Deployment
\`\`\`bash
# Apply secret manifest
kubectl apply -f secrets-${environment}.yaml
\`\`\`

## 🛡️ Security Guidelines

- **Keep secrets secure** - Never commit to version control
- **Use secure channels** - Distribute via encrypted channels only
- **Rotate regularly** - Update secrets according to security policy
- **Monitor access** - Track secret usage and access patterns
- **Backup safely** - Store backups in encrypted, access-controlled locations

## 🔄 Secret Rotation

To rotate secrets for this domain and environment:
\`\`\`bash
# Rotate all secrets
node scripts/shared/secret-generator.js --domain ${domain} --environment ${environment} --rotate-all

# Rotate specific secret
node scripts/shared/secret-generator.js --domain ${domain} --environment ${environment} --rotate AUTH_JWT_SECRET
\`\`\`

## 📊 Secret Inventory

${Object.entries(SECRET_CONFIGS).map(([key, config]) => 
  `- **${key}**: ${config.description} (${config.scope})`
).join('\n')}

---
*Generated by Enhanced Secret Manager v2.0*
*For support: Check project documentation*
`;

    const readmeFile = join(domain, environment, 'README.md');
    const readmePath = join(this.secretPaths.distribution, readmeFile);
    writeFileSync(readmePath, readmeContent);

    return {
      filename: 'README.md',
      filepath: readmePath,
      size: readmeContent.length
    };
  }

  // Utility methods

  generateSecretValue(length) {
    return randomBytes(length / 2).toString('hex');
  }

  generateCoordinationId(domain) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hash = createHash('md5').update(domain).digest('hex').substring(0, 8);
    return `coord-${domain}-${hash}-${timestamp}`;
  }

  async loadDomainSecrets(domain, environment) {
    const filename = join(this.secretPaths.root, `${domain}-${environment}-secrets.json`);
    
    if (!existsSync(filename)) {
      return null;
    }

    try {
      const data = JSON.parse(readFileSync(filename, 'utf8'));
      const { domain: d, environment: e, generated, generatedBy, secretCount, newSecrets, formats, ...secrets } = data;
      
      return {
        secrets,
        metadata: { domain: d, environment: e, generated, generatedBy, secretCount, newSecrets, formats },
        filename
      };
    } catch (error) {
      throw new Error(`Failed to load secrets for ${domain} (${environment}): ${error.message}`);
    }
  }

  async saveDomainSecrets(domain, environment, secretData) {
    const filename = join(this.secretPaths.root, `${domain}-${environment}-secrets.json`);
    
    if (this.dryRun) {
      console.log(`   🔍 DRY RUN: Would save secrets to ${filename}`);
      return filename;
    }

    writeFileSync(filename, JSON.stringify(secretData, null, 2));
    console.log(`   💾 Secrets saved: ${filename}`);
    
    return filename;
  }

  ensureDirectory(path) {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  logSecretEvent(event, domain, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      domain,
      details,
      user: process.env.USER || process.env.USERNAME || 'system'
    };

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      
      if (existsSync(this.secretPaths.audit)) {
        require('fs').appendFileSync(this.secretPaths.audit, logLine);
      } else {
        writeFileSync(this.secretPaths.audit, logLine);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to log secret event: ${error.message}`);
    }
  }
}

// Legacy function exports for backward compatibility
export function generateSecrets(customConfigs = {}) {
  const configs = { ...SECRET_CONFIGS, ...customConfigs };
  const secrets = {};
  
  for (const [key, config] of Object.entries(configs)) {
    secrets[key] = randomBytes(config.length / 2).toString('hex');
  }
  
  return secrets;
}

export function generateSingleSecret(length = 32) {
  return randomBytes(length / 2).toString('hex');
}

export function saveSecrets(domain, environment, secrets, additionalData = {}) {
  const secretsDir = 'secrets';
  if (!existsSync(secretsDir)) {
    mkdirSync(secretsDir, { recursive: true });
  }

  const data = {
    domain,
    environment,
    generated: new Date().toISOString(),
    note: 'Generated by modular secret system',
    ...additionalData,
    ...secrets
  };

  const filename = join(secretsDir, `${domain}-secrets.json`);
  writeFileSync(filename, JSON.stringify(data, null, 2));
  return filename;
}

export function loadSecrets(domain) {
  const filename = join('secrets', `${domain}-secrets.json`);
  if (!existsSync(filename)) {
    return null;
  }

  try {
    const data = JSON.parse(readFileSync(filename, 'utf8'));
    const { domain: d, environment, generated, note, ...secrets } = data;
    return { 
      secrets, 
      metadata: { domain: d, environment, generated, note },
      filename 
    };
  } catch (error) {
    throw new Error(`Failed to load secrets: ${error.message}`);
  }
}

export function distributeSecrets(domain, secrets) {
  const distDir = join('secrets', 'distribution', domain);
  mkdirSync(distDir, { recursive: true });

  const files = {};

  // .env format
  const envContent = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const envFile = join(distDir, '.env');
  writeFileSync(envFile, envContent);
  files.env = envFile;

  // JSON format
  const jsonFile = join(distDir, 'secrets.json');
  writeFileSync(jsonFile, JSON.stringify(secrets, null, 2));
  files.json = jsonFile;

  // Shell script format (cross-platform)
  const shellContent = Object.entries(secrets)
    .map(([key, value]) => `echo "${value}" | npx wrangler secret put ${key} --env production`)
    .join('\n');
  const shellFile = join(distDir, 'deploy-secrets.sh');
  writeFileSync(shellFile, shellContent);
  files.shell = shellFile;

  // PowerShell script format
  const psContent = Object.entries(secrets)
    .map(([key, value]) => `"${value}" | npx wrangler secret put ${key} --env production`)
    .join('\n');
  const psFile = join(distDir, 'deploy-secrets.ps1');
  writeFileSync(psFile, psContent);
  files.powershell = psFile;

  // README
  const readme = `# Secret Distribution for ${domain}

Generated: ${new Date().toISOString()}

## Files
- \`.env\` - Environment variables for Node.js applications
- \`secrets.json\` - JSON format for API consumption
- \`deploy-secrets.sh\` - Bash commands for Cloudflare Workers
- \`deploy-secrets.ps1\` - PowerShell commands for Cloudflare Workers

## Usage

### For downstream Node.js applications:
\`\`\`bash
cp .env /path/to/your/app/
\`\`\`

### For upstream Cloudflare Workers (Linux/Mac):
\`\`\`bash
chmod +x deploy-secrets.sh
./deploy-secrets.sh
\`\`\`

### For upstream Cloudflare Workers (Windows):
\`\`\`powershell
.\\deploy-secrets.ps1
\`\`\`

## Security Notice
- Keep these files secure
- Never commit to version control
- Distribute via secure channels only
`;
  
  const readmeFile = join(distDir, 'README.md');
  writeFileSync(readmeFile, readme);
  files.readme = readmeFile;
  
  return { directory: distDir, files };
}

export function validateSecrets(secrets) {
  const issues = [];
  
  for (const [key, value] of Object.entries(secrets)) {
    if (!value || typeof value !== 'string') {
      issues.push(`${key}: Invalid value`);
      continue;
    }
    
    if (value.length < 16) {
      issues.push(`${key}: Too short (minimum 16 characters)`);
    }
    
    if (!/^[a-f0-9]+$/i.test(value)) {
      issues.push(`${key}: Should be hexadecimal`);
    }
  }
  
  return issues;
}

export function listSecretsFiles() {
  const secretsDir = 'secrets';
  if (!existsSync(secretsDir)) {
    return [];
  }
  
  try {
    const files = [];
    const items = readdirSync(secretsDir);
    
    for (const item of items) {
      if (item.endsWith('-secrets.json')) {
        const domain = item.replace('-secrets.json', '');
        const filepath = join(secretsDir, item);
        const stat = statSync(filepath);
        files.push({
          domain,
          filepath,
          modified: stat.mtime,
          size: stat.size
        });
      }
    }
    
    return files.sort((a, b) => b.modified - a.modified);
  } catch (error) {
    return [];
  }
}

export { SECRET_CONFIGS };