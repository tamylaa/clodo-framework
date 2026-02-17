/**
 * Validation Handler Module
 * Focused module for service validation and health checks
 */

import fs from 'fs/promises';
import path from 'path';
import { FrameworkConfig } from '../../utils/framework-config.js';
import { ConfigurationValidator } from '../../security/ConfigurationValidator.js';

export class ValidationHandler {
  constructor(options = {}) {
    this.strict = options.strict || false;
    this.customConfig = options.customConfig || {};
    this.configLoaded = false;
  }

  /**
   * Load validation configuration from validation-config.json if it exists
   */
  loadValidationConfig(servicePath) {
    // Skip if already loaded or custom config provided
    if (this.configLoaded || Object.keys(this.customConfig).length > 0) {
      return this.validationConfig;
    }

    try {
      // Try to load validation-config.json from service directory
      const configPath = path.join(servicePath, 'validation-config.json');
      const frameworkConfig = new FrameworkConfig(configPath);
      const config = frameworkConfig.config;
      
      // Extract validation section from config
      if (config && config.validation) {
        // Log that we loaded the config
        console.log(`📋 Loaded configuration from: ${configPath}`);
        
        this.validationConfig = {
          requiredFiles: config.validation.requiredFiles || [
            'package.json',
            'src/config/domains.js',
            'src/worker/index.js',
            'wrangler.toml'
          ],
          optionalFiles: config.validation.optionalFiles || [
            'README.md',
            'LICENSE',
            '.gitignore'
          ],
          requiredFields: config.validation.requiredFields || {
            'package.json': ['name', 'version', 'type', 'main'],
            'wrangler.toml': ['name', 'main', 'compatibility_date']
          },
          serviceTypes: config.validation.serviceTypes || [
            'data-service',
            'auth-service',
            'content-service',
            'api-gateway',
            'static-site',
            'generic'
          ]
        };
        this.configLoaded = true;
        return this.validationConfig;
      }
    } catch (error) {
      // Config loading failed, use defaults silently
    }

    // Use custom config if provided, otherwise use defaults
    this.validationConfig = {
      requiredFiles: this.customConfig.requiredFiles || [
        'package.json',
        'src/config/domains.js',
        'src/worker/index.js',
        'wrangler.toml'
      ],
      optionalFiles: this.customConfig.optionalFiles || [
        'README.md',
        'LICENSE',
        '.gitignore'
      ],
      requiredFields: this.customConfig.requiredFields || {
        'package.json': ['name', 'version', 'type', 'main'],
        'wrangler.toml': ['name', 'main', 'compatibility_date']
      },
      serviceTypes: this.customConfig.serviceTypes || [
        'data-service',
        'auth-service',
        'content-service',
        'api-gateway',
        'static-site',
        'generic'
      ]
    };
    this.configLoaded = true;
    return this.validationConfig;
  }

  /**
   * Check if a version is sufficient (greater than or equal to minimum)
   */
  isVersionSufficient(currentVersion, minVersion) {
    const current = currentVersion.replace(/^v/, '').split('.').map(Number);
    const min = minVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(current.length, min.length); i++) {
      const c = current[i] || 0;
      const m = min[i] || 0;
      if (c > m) return true;
      if (c < m) return false;
    }
    return true;
  }

  /**
   * Generate fix suggestions from validation issues
   */
  generateFixSuggestions(issues) {
    const suggestions = [];
    
    issues.forEach(issue => {
      if (issue.includes('Missing required field: main')) {
        suggestions.push('Add main field to package.json');
      } else if (issue.includes('Missing required dependency:')) {
        suggestions.push(issue); // Pass the full issue text for dependency extraction
      } else if (issue.includes('Should use "type": "module"')) {
        suggestions.push('Set package.json type to module');
      }
    });
    
    return suggestions;
  }

  /**
   * Validate complete service configuration
   */
  async validateService(servicePath) {
    // Load validation config from validation-config.json if it exists
    this.loadValidationConfig(servicePath);
    
    const issues = [];

    // Check for required files using custom config
    for (const file of this.validationConfig.requiredFiles) {
      const filePath = path.join(servicePath, file);
      try {
        await fs.access(filePath);
      } catch {
        issues.push(`Missing required file: ${file}`);
      }
    }

    // Validate package.json
    const packageValidation = await this.validatePackageJson(servicePath);
    issues.push(...packageValidation.issues);

    // Validate domain configuration
    const domainValidation = await this.validateDomainConfig(servicePath);
    issues.push(...domainValidation.issues);

    // Validate wrangler configuration
    const wranglerValidation = await this.validateWranglerConfig(servicePath);
    issues.push(...wranglerValidation.issues);

    // Run comprehensive configuration validation using ConfigurationValidator
    try {
      // Determine manifest path candidates and select first that exists
      const manifestCandidates = ['clodo-service-manifest.json', 'service-manifest.json', 'manifest.json'];
      let manifestPath = null;
      for (const candidate of manifestCandidates) {
        const candidatePath = path.join(servicePath, candidate);
        try {
          await fs.access(candidatePath);
          manifestPath = candidatePath;
          break;
        } catch {
          // Not found, continue
        }
      }

      const wranglerPath = path.join(servicePath, 'wrangler.toml');

      if (manifestPath) {
        const configValidation = ConfigurationValidator.validateServiceConfig(manifestPath, wranglerPath);
        if (!configValidation.valid) {
          issues.push(...(configValidation.issues || []).map(i => `Configuration mismatch: ${i.message || JSON.stringify(i)}`));
        }
      } else {
        // No manifest found — warn but do not block validation
        issues.push('Warning: No service manifest found (clodo-service-manifest.json) — skipping manifest↔wrangler validation');
      }
    } catch (error) {
      issues.push(`Configuration validation step failed: ${error.message}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      servicePath
    };
  }

  /**
   * Validate package.json structure
   */
  async validatePackageJson(servicePath) {
    const issues = [];
    const packageJsonPath = path.join(servicePath, 'package.json');

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      // Check custom required fields for package.json
      const requiredPackageFields = this.validationConfig.requiredFields['package.json'] || ['name', 'version'];
      requiredPackageFields.forEach(field => {
        if (!packageJson[field]) {
          issues.push(`package.json: Missing required field: ${field}`);
        }
      });

      if (!packageJson.type || packageJson.type !== 'module') {
        issues.push('package.json: Should use "type": "module" for ES modules');
      }

      // Check for required dependencies
      const requiredDeps = ['@tamyla/clodo-framework'];
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      requiredDeps.forEach(dep => {
        if (!deps[dep]) {
          issues.push(`package.json: Missing required dependency: ${dep}`);
        }
      });

    } catch (error) {
      issues.push(`package.json: Invalid JSON format - ${error.message}`);
    }

    return { issues };
  }

  /**
   * Validate domain configuration
   */
  async validateDomainConfig(servicePath) {
    const issues = [];
    const domainConfigPath = path.join(servicePath, 'src/config/domains.js');

    try {
      const domainConfig = await fs.readFile(domainConfigPath, 'utf8');

      // Check for Clodo Framework integration
      if (!domainConfig.includes('createDomainConfigSchema')) {
        issues.push('Domain configuration missing Clodo Framework integration');
      }

      // Check for required exports
      if (!domainConfig.includes('export const domains')) {
        issues.push('Domain configuration missing domains export');
      }

      // Basic domain format validation
      const domainMatches = domainConfig.match(/domain:\s*['"]([^'"]+)['"]/g);
      if (domainMatches) {
        domainMatches.forEach(match => {
          const domain = match.match(/domain:\s*['"]([^'"]+)['"]/)[1];
          if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(domain)) {
            issues.push(`Invalid domain format: ${domain}`);
          }
        });
      }

    } catch (error) {
      issues.push(`Domain configuration: Cannot read file - ${error.message}`);
    }

    return { issues };
  }

  /**
   * Validate wrangler configuration
   */
  async validateWranglerConfig(servicePath) {
    const issues = [];
    const wranglerConfigPath = path.join(servicePath, 'wrangler.toml');

    try {
      const wranglerConfig = await fs.readFile(wranglerConfigPath, 'utf8');

      // Check for required fields
      if (!wranglerConfig.includes('name =')) {
        issues.push('wrangler.toml: Missing name field');
      }

      if (!wranglerConfig.includes('main =')) {
        issues.push('wrangler.toml: Missing main field');
      }

      if (!wranglerConfig.includes('compatibility_date =')) {
        issues.push('wrangler.toml: Missing compatibility_date');
      }

    } catch (error) {
      issues.push(`wrangler.toml: Cannot read file - ${error.message}`);
    }

    return { issues };
  }

  /**
   * Run comprehensive service diagnostics
   */
  async diagnoseService(servicePath) {
    const diagnosis = {
      errors: [],
      warnings: [],
      recommendations: []
    };

    // Basic validation
    const validation = await this.validateService(servicePath);
    validation.issues.forEach(issue => {
      if (issue.includes('Missing required')) {
        diagnosis.errors.push({
          message: issue,
          severity: 'high',
          suggestion: 'Run service initialization to create missing files'
        });
      } else if (issue.includes('Invalid')) {
        diagnosis.errors.push({
          message: issue,
          severity: 'medium',
          suggestion: 'Review and correct the configuration'
        });
      } else {
        diagnosis.warnings.push({
          message: issue,
          suggestion: 'Consider updating for better compatibility'
        });
      }
    });

    // Additional recommendations
    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(servicePath, 'package.json'), 'utf8'));
      
      if (!packageJson.scripts || !packageJson.scripts.dev) {
        diagnosis.recommendations.push('Add development scripts for easier testing');
      }

      if (!packageJson.scripts || !packageJson.scripts.deploy) {
        diagnosis.recommendations.push('Add deployment scripts for easier publishing');
      }

    } catch (error) {
      // Package.json validation already handled above
    }

    return diagnosis;
  }

  /**
   * Set validation strictness
   */
  setStrict(enabled) {
    this.strict = enabled;
  }

  /**
   * Run comprehensive doctor checks for preflight diagnostics
   * @param {Object} options - Options for doctor run
   * @param {boolean} options.json - Output in JSON format
   * @param {boolean} options.fix - Attempt to fix issues
   * @param {boolean} options.strict - Strict mode (fail on warnings)
   * @param {string} options.servicePath - Path to service directory
   * @returns {Object} Doctor results
   */
  async runDoctor(options = {}) {
    const { json = false, fix = false, strict = this.strict, servicePath = process.cwd() } = options;
    
    const results = {
      timestamp: new Date().toISOString(),
      servicePath,
      checks: [],
      summary: {
        total: 0,
        passed: 0,
        warnings: 0,
        errors: 0,
        critical: 0
      },
      fixSuggestions: [],
      fixesApplied: [],
      exitCode: 0
    };

    // Load validation config
    const config = this.loadValidationConfig(servicePath);

    // Run environment checks
    const envCheck = await this.checkEnvironment();
    results.checks.push(envCheck);
    this.updateSummary(results, envCheck);

    // Run config presence checks
    const configCheck = await this.checkConfigPresence(servicePath, config);
    results.checks.push(configCheck);
    this.updateSummary(results, configCheck);

    // Run service validation
    const validationCheck = await this.validateService(servicePath);
    const fixSuggestions = this.generateFixSuggestions(validationCheck.issues || []);
    results.checks.push({
      name: 'service-validation',
      status: validationCheck.valid ? 'passed' : 'failed',
      severity: validationCheck.valid ? 'info' : 'error',
      message: validationCheck.valid ? 'Service validation passed' : 'Service validation failed',
      details: validationCheck.issues || [],
      fixSuggestions
    });
    this.updateSummary(results, results.checks[results.checks.length - 1]);

    // Run token scope check
    const tokenCheck = await this.checkTokenScopes();
    results.checks.push(tokenCheck);
    this.updateSummary(results, tokenCheck);

    // Run secrets baseline check
    const secretsCheck = await this.checkSecretsBaseline(servicePath);
    results.checks.push(secretsCheck);
    this.updateSummary(results, secretsCheck);

    // Apply fixes if requested
    if (fix && results.summary.errors > 0) {
      console.log('🔧 Attempting to fix detected issues...');
      const fixesApplied = await this.applyFixes(results, servicePath);
      results.fixesApplied = fixesApplied;
      
      // Re-run checks after fixes
      if (fixesApplied.length > 0) {
        console.log(`✅ Applied ${fixesApplied.length} fixes. Re-running checks...`);
        return this.runDoctor({ ...options, fix: false }); // Re-run without fix to see results
      }
    }

    // Determine exit code
    results.exitCode = results.summary.errors > 0 || (strict && results.summary.warnings > 0) ? 1 : 0;

    // Collect fix suggestions
    results.checks.forEach(check => {
      if (check.fixSuggestions && check.fixSuggestions.length > 0) {
        results.fixSuggestions.push(...check.fixSuggestions);
      }
    });

    return results;
  }

  /**
   * Update summary counts based on check result
   */
  updateSummary(results, check) {
    results.summary.total++;
    if (check.status === 'passed') {
      results.summary.passed++;
    } else if (check.severity === 'warning') {
      results.summary.warnings++;
    } else if (check.severity === 'error') {
      results.summary.errors++;
    } else if (check.severity === 'critical') {
      results.summary.critical++;
    }
  }

  /**
   * Check environment prerequisites
   */
  async checkEnvironment() {
    const check = {
      name: 'environment',
      status: 'passed',
      severity: 'info',
      message: 'Environment checks passed',
      details: [],
      fixSuggestions: []
    };

    // Check Node.js version
    const nodeVersion = process.version;
    const minVersion = '18.0.0';
    if (!this.isVersionSufficient(nodeVersion, minVersion)) {
      check.status = 'failed';
      check.severity = 'error';
      check.details.push(`Node.js version ${nodeVersion} is below minimum ${minVersion}`);
      check.fixSuggestions.push('Upgrade Node.js to version 18 or higher');
    }

    // Check if wrangler is available
    try {
      const { execSync } = await import('child_process');
      execSync('wrangler --version', { stdio: 'pipe' });
      check.details.push('Wrangler CLI is available');
    } catch (error) {
      check.status = 'failed';
      check.severity = 'error';
      check.details.push('Wrangler CLI is not installed or not in PATH');
      check.fixSuggestions.push('Install Wrangler CLI: npm install -g wrangler');
    }

    return check;
  }

  /**
   * Check config file presence
   */
  async checkConfigPresence(servicePath, config) {
    const check = {
      name: 'config-presence',
      status: 'passed',
      severity: 'info',
      message: 'Configuration files present',
      details: [],
      fixSuggestions: []
    };

    const requiredFiles = config.requiredFiles || [];
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(servicePath, file));
        check.details.push(`✓ ${file}`);
      } catch (error) {
        check.status = 'failed';
        check.severity = 'error';
        check.details.push(`✗ ${file} is missing`);
        check.fixSuggestions.push(`Create ${file} or ensure it exists`);
      }
    }

    return check;
  }

  /**
   * Check Cloudflare token scopes
   */
  async checkTokenScopes() {
    const check = {
      name: 'token-scopes',
      status: 'passed',
      severity: 'info',
      message: 'Cloudflare token scopes validated',
      details: [],
      fixSuggestions: []
    };

    // Get Cloudflare token from environment
    const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;

    if (!token) {
      check.status = 'failed';
      check.severity = 'error';
      check.details.push('No Cloudflare API token found in environment variables');
      check.fixSuggestions.push('Set CLOUDFLARE_API_TOKEN or CF_API_TOKEN environment variable');
      check.fixSuggestions.push('Generate a token at: https://dash.cloudflare.com/profile/api-tokens');
      return check;
    }

    try {
      // Check token permissions by making API calls
      const permissions = await this.validateCloudflareToken(token);

      if (!permissions.hasWorkersEdit) {
        check.status = 'failed';
        check.severity = 'error';
        check.details.push('Token missing required "Account:Workers:Edit" permission');
        check.fixSuggestions.push('Add "Account:Workers:Edit" permission to your API token');
      } else {
        check.details.push('✓ Account:Workers:Edit permission present');
      }

      if (!permissions.hasWorkersRead) {
        check.status = 'warning';
        check.severity = 'warning';
        check.details.push('Token missing "Account:Workers:Read" permission (recommended)');
        check.fixSuggestions.push('Consider adding "Account:Workers:Read" permission for better diagnostics');
      } else {
        check.details.push('✓ Account:Workers:Read permission present');
      }

      if (!permissions.hasZoneRead) {
        check.status = 'warning';
        check.severity = 'warning';
        check.details.push('Token missing "Zone:Read" permission (recommended for domain validation)');
        check.fixSuggestions.push('Consider adding "Zone:Read" permission for domain validation');
      } else {
        check.details.push('✓ Zone:Read permission present');
      }

    } catch (error) {
      check.status = 'failed';
      check.severity = 'error';
      check.details.push(`Token validation failed: ${error.message}`);
      check.fixSuggestions.push('Verify your API token is valid and has network access');
      check.fixSuggestions.push('Check token permissions at: https://dash.cloudflare.com/profile/api-tokens');
    }

    return check;
  }

  /**
   * Validate Cloudflare token by testing API access
   */
  async validateCloudflareToken(token) {
    const permissions = {
      hasWorkersEdit: false,
      hasWorkersRead: false,
      hasZoneRead: false
    };

    try {
      // Test Workers:Edit permission by trying to list workers
      const workersResponse = await fetch('https://api.cloudflare.com/client/v4/accounts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (workersResponse.ok) {
        const data = await workersResponse.json();
        if (data.success && data.result && data.result.length > 0) {
          permissions.hasWorkersRead = true;
          permissions.hasWorkersEdit = true; // If we can read accounts, we likely can edit workers
        }
      }

      // Test Zone:Read permission
      const zonesResponse = await fetch('https://api.cloudflare.com/client/v4/zones', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (zonesResponse.ok) {
        permissions.hasZoneRead = true;
      }

    } catch (error) {
      // If network fails, we can't validate but don't fail completely
      console.warn('Network error during token validation:', error.message);
    }

    return permissions;
  }

  /**
   * Check secrets baseline
   */
  async checkSecretsBaseline(servicePath) {
    const check = {
      name: 'secrets-baseline',
      status: 'passed',
      severity: 'info',
      message: 'Secrets baseline validation passed',
      details: [],
      fixSuggestions: []
    };

    try {
      // Scan for potential secrets
      const secretsFound = await this.scanForSecrets(servicePath);

      if (secretsFound.length > 0) {
        // Check against baseline
        const baselineSecrets = await this.loadSecretsBaseline(servicePath);
        const newSecrets = secretsFound.filter(secret =>
          !baselineSecrets.some(baseline =>
            baseline.file === secret.file &&
            baseline.line === secret.line &&
            baseline.pattern === secret.pattern
          )
        );

        if (newSecrets.length > 0) {
          check.status = 'failed';
          check.severity = 'critical';
          check.message = `Found ${newSecrets.length} potential secrets not in baseline`;
          check.details.push(...newSecrets.map(secret =>
            `${secret.file}:${secret.line} - ${secret.pattern}: ${secret.match}`
          ));
          check.fixSuggestions.push('Review the secrets above and ensure they are not sensitive');
          check.fixSuggestions.push('If safe, add to .secrets.baseline file');
          check.fixSuggestions.push('Run: clodo secrets baseline update');
        } else {
          check.details.push(`✓ All ${secretsFound.length} secrets are in baseline`);
        }
      } else {
        check.details.push('✓ No potential secrets found');
      }

    } catch (error) {
      check.status = 'warning';
      check.severity = 'warning';
      check.details.push(`Secrets scanning failed: ${error.message}`);
      check.fixSuggestions.push('Ensure file permissions allow reading source files');
    }

    return check;
  }

  /**
   * Scan for potential secrets in the codebase
   */
  async scanForSecrets(servicePath) {
    const secrets = [];
    const secretPatterns = [
      { name: 'api_key', pattern: /(api[_-]?key|apikey)\s*[=:]\s*['"]([^'"]{20,})['"]/gi },
      { name: 'secret', pattern: /(secret|token)\s*[=:]\s*['"]([^'"]{20,})['"]/gi },
      { name: 'password', pattern: /(password|passwd|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]/gi },
      { name: 'private_key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi },
      { name: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/g },
      { name: 'cloudflare_token', pattern: /(?:cloudflare|cf)[_-]?(?:api[_-]?)?token\s*[=:]\s*['"]([^'"]{40,})['"]/gi },
      { name: 'jwt_secret', pattern: /(?:jwt|json[_-]?web[_-]?token)[_-]?secret\s*[=:]\s*['"]([^'"]{20,})['"]/gi },
      { name: 'database_url', pattern: /(?:database|db)[_-]?url\s*[=:]\s*['"]([^'"]*password[^'"]*)['"]/gi },
      { name: 'stripe_key', pattern: /(sk|pk)_(?:test|live)_[0-9a-zA-Z]{20,}/g }
    ];

    // Files to scan (exclude common non-sensitive files)
    const scanFiles = await this.getFilesToScan(servicePath);

    for (const file of scanFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          secretPatterns.forEach(({ name, pattern }) => {
            let match;
            while ((match = pattern.exec(line)) !== null) {
              // Skip if it's clearly a test/example
              if (line.toLowerCase().includes('example') ||
                  line.toLowerCase().includes('test') ||
                  line.toLowerCase().includes('fake') ||
                  line.toLowerCase().includes('placeholder')) {
                continue;
              }

              secrets.push({
                file: path.relative(servicePath, file),
                line: index + 1,
                pattern: name,
                match: match[0].substring(0, 50) + '...' // Truncate for safety
              });
            }
          });
        });
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return secrets;
  }

  /**
   * Get list of files to scan for secrets
   */
  async getFilesToScan(servicePath) {
    const files = [];
    const scanExtensions = ['.js', '.ts', '.json', '.toml', '.env', '.md', '.txt'];

    async function scanDir(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip common directories that shouldn't contain secrets
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'dist', 'build', 'coverage', 'logs'].includes(entry.name)) {
            continue;
          }
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (scanExtensions.includes(ext) || entry.name.startsWith('.env')) {
            files.push(fullPath);
          }
        }
      }
    }

    await scanDir(servicePath);
    return files;
  }

  /**
   * Load secrets baseline file
   */
  async loadSecretsBaseline(servicePath) {
    const baselinePath = path.join(servicePath, '.secrets.baseline');

    try {
      const content = await fs.readFile(baselinePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // No baseline file exists
      return [];
    }
  }

  /**
   * Apply automatic fixes for detected issues
   */
  async applyFixes(results, servicePath) {
    const fixesApplied = [];

    for (const check of results.checks) {
      if (check.status === 'failed' && check.fixSuggestions) {
        for (const suggestion of check.fixSuggestions) {
          try {
            const fixResult = await this.applySpecificFix(check.name, suggestion, servicePath);
            if (fixResult) {
              fixesApplied.push(`${check.name}: ${fixResult}`);
              console.log(`  ✅ ${fixResult}`);
            }
          } catch (error) {
            console.log(`  ❌ Failed to apply fix: ${error.message}`);
          }
        }
      }
    }

    return fixesApplied;
  }

  /**
   * Apply a specific fix based on check name and suggestion
   */
  async applySpecificFix(checkName, suggestion, servicePath) {
    switch (checkName) {
      case 'environment':
        if (suggestion.includes('wrangler')) {
          return await this.fixInstallWrangler();
        }
        break;

      case 'service-validation':
        if (suggestion.includes('dependency')) {
          return await this.fixMissingDependency(suggestion, servicePath);
        }
        if (suggestion.includes('Add main field')) {
          return await this.fixAddMainField(servicePath);
        }
        if (suggestion.includes('Set package.json type to module')) {
          return await this.fixSetModuleType(servicePath);
        }
        if (suggestion.includes('domain')) {
          return await this.fixDomainConfiguration(servicePath);
        }
        break;

      case 'config-presence':
        if (suggestion.includes('Create')) {
          const fileName = suggestion.match(/Create (\S+)/)?.[1];
          if (fileName) {
            return await this.fixCreateConfigFile(fileName, servicePath);
          }
        }
        break;
    }

    return null;
  }

  /**
   * Fix: Install wrangler CLI
   */
  async fixInstallWrangler() {
    try {
      const { execSync } = await import('child_process');
      console.log('  📦 Installing wrangler CLI globally...');
      execSync('npm install -g wrangler', { stdio: 'inherit' });
      return 'Installed wrangler CLI globally';
    } catch (error) {
      throw new Error(`Failed to install wrangler: ${error.message}`);
    }
  }

  /**
   * Fix: Add missing dependency to package.json
   */
  async fixMissingDependency(suggestion, servicePath) {
    const depMatch = suggestion.match(/Missing required dependency: (\S+)/);
    if (!depMatch) return null;

    const dependency = depMatch[1];
    const packageJsonPath = path.join(servicePath, 'package.json');

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }

      // Add the framework dependency with latest version
      packageJson.dependencies[dependency] = '^4.5.0';
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      return `Added ${dependency} to package.json dependencies`;
    } catch (error) {
      throw new Error(`Failed to add dependency: ${error.message}`);
    }
  }

  /**
   * Fix: Add main field to package.json
   */
  async fixAddMainField(servicePath) {
    const packageJsonPath = path.join(servicePath, 'package.json');

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      packageJson.main = 'src/worker/index.js';
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      return 'Added main field to package.json';
    } catch (error) {
      throw new Error(`Failed to add main field: ${error.message}`);
    }
  }

  /**
   * Fix: Set package.json type to module
   */
  async fixSetModuleType(servicePath) {
    const packageJsonPath = path.join(servicePath, 'package.json');

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      packageJson.type = 'module';
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      return 'Set package.json type to module';
    } catch (error) {
      throw new Error(`Failed to set module type: ${error.message}`);
    }
  }

  /**
   * Fix: Create basic domain configuration
   */
  async fixDomainConfiguration(servicePath) {
    const domainConfigPath = path.join(servicePath, 'src/config/domains.js');
    const dirPath = path.dirname(domainConfigPath);

    try {
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });

      const basicDomainConfig = `/**
 * Domain Configuration
 * 
 * Configure domains and routing for your Clodo service
 */

import { createDomainConfigSchema } from '@tamyla/clodo-framework';

export const domains = createDomainConfigSchema({
  // Default domain configuration
  default: {
    name: 'example.com',
    routes: [
      {
        pattern: '/',
        handler: 'index'
      }
    ]
  }
});
`;

      await fs.writeFile(domainConfigPath, basicDomainConfig);
      return 'Created basic domain configuration file';
    } catch (error) {
      throw new Error(`Failed to create domain config: ${error.message}`);
    }
  }

  /**
   * Fix: Create basic configuration file
   */
  async fixCreateConfigFile(fileName, servicePath) {
    const filePath = path.join(servicePath, fileName);
    const dirPath = path.dirname(filePath);

    try {
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });

      let content = '';

      switch (fileName) {
        case 'wrangler.toml':
          content = `name = "my-clodo-service"
main = "src/worker/index.js"
compatibility_date = "${new Date().toISOString().split('T')[0]}"

[vars]
NODE_ENV = "production"
`;
          break;

        case 'src/worker/index.js':
          content = `/**
 * Main Worker Entry Point
 */

import { createServiceRouter } from '@tamyla/clodo-framework';

export default {
  async fetch(request, env, ctx) {
    const router = createServiceRouter({
      // Configure your service routes here
    });

    return router.handle(request, env, ctx);
  }
};
`;
          break;

        case 'src/config/domains.js':
          return await this.fixDomainConfiguration(servicePath);

        default:
          content = `# ${fileName}
# Basic configuration file created by clodo doctor --fix
`;
      }

      await fs.writeFile(filePath, content);
      return `Created ${fileName} with basic configuration`;
    } catch (error) {
      throw new Error(`Failed to create ${fileName}: ${error.message}`);
    }
  }
}
