/**
 * ValidationManager - Coordinates comprehensive validation phases for deployment readiness
 * Provides unified validation orchestration across configuration, database, and deployment components
 */

import { 
  validatePrerequisites,
  checkAuth,
  authenticate,
  workerExists 
} from '../../shared/config/cloudflare-config.js';

import { askYesNo } from '../../shared/utils/interactive-utils.js';

export class ValidationManager {
  constructor(config, enterpriseModules = null) {
    this.config = config;
    this.enterpriseModules = enterpriseModules;
    this.validationResults = {
      prerequisites: null,
      authentication: null,
      configuration: null,
      database: null,
      deployment: null,
      comprehensive: null
    };
  }

  /**
   * Execute all validation phases with comprehensive reporting
   */
  async executeComprehensiveValidation() {
    console.log('\n🔍 Comprehensive Validation Suite');
    console.log('=================================');

    const phases = [
      { name: 'Prerequisites', method: 'validatePrerequisites' },
      { name: 'Authentication', method: 'validateAuthentication' },
      { name: 'Configuration', method: 'validateConfiguration' },
      { name: 'Database', method: 'validateDatabase' },
      { name: 'Deployment Readiness', method: 'validateDeploymentReadiness' }
    ];

    const results = {
      passed: [],
      failed: [],
      warnings: []
    };

    for (const phase of phases) {
      try {
        console.log(`\n🔍 Validating ${phase.name}...`);
        const result = await this[phase.method]();
        
        if (result.valid) {
          results.passed.push(phase.name);
          console.log(`   ✅ ${phase.name}: Passed`);
          
          if (result.warnings?.length > 0) {
            results.warnings.push(...result.warnings.map(w => `${phase.name}: ${w}`));
          }
        } else {
          results.failed.push({
            phase: phase.name,
            errors: result.errors
          });
          console.log(`   ❌ ${phase.name}: Failed`);
          result.errors?.forEach(error => console.log(`      - ${error}`));
        }
      } catch (error) {
        results.failed.push({
          phase: phase.name,
          errors: [error.message]
        });
        console.log(`   ❌ ${phase.name}: Error - ${error.message}`);
      }
    }

    // Generate comprehensive report
    return this.generateValidationReport(results);
  }

  /**
   * Validate system prerequisites (Node.js, wrangler CLI, etc.)
   */
  async validatePrerequisites() {
    try {
      const prereqs = await validatePrerequisites();
      const errors = [];
      
      for (const prereq of prereqs) {
        if (prereq.status !== 'ok') {
          errors.push(`${prereq.name}: ${prereq.error}`);
        }
      }

      this.validationResults.prerequisites = {
        valid: errors.length === 0,
        errors,
        details: prereqs
      };

      return this.validationResults.prerequisites;
    } catch (error) {
      this.validationResults.prerequisites = {
        valid: false,
        errors: [`Prerequisites check failed: ${error.message}`]
      };
      return this.validationResults.prerequisites;
    }
  }

  /**
   * Validate Cloudflare authentication
   */
  async validateAuthentication() {
    try {
      const isAuthenticated = await checkAuth();
      
      if (!isAuthenticated) {
        this.validationResults.authentication = {
          valid: false,
          errors: ['Cloudflare authentication required'],
          canAutoFix: true
        };
      } else {
        this.validationResults.authentication = {
          valid: true,
          errors: []
        };
      }

      return this.validationResults.authentication;
    } catch (error) {
      this.validationResults.authentication = {
        valid: false,
        errors: [`Authentication check failed: ${error.message}`]
      };
      return this.validationResults.authentication;
    }
  }

  /**
   * Validate deployment configuration completeness and correctness
   */
  async validateConfiguration() {
    const errors = [];
    const warnings = [];

    // Validate required configuration fields
    if (!this.config.domain) {
      errors.push('Domain name is required');
    }

    if (!this.config.worker?.name) {
      errors.push('Worker name is required');
    }

    if (!this.config.environment) {
      errors.push('Environment specification is required');
    }

    // Validate domain format
    if (this.config.domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(this.config.domain)) {
      errors.push('Invalid domain format');
    }

    // Check for existing worker deployment
    try {
      if (this.config.worker?.name) {
        const exists = await workerExists(this.config.worker.name);
        if (exists) {
          warnings.push(`Worker '${this.config.worker.name}' already exists - deployment will update existing worker`);
        }
      }
    } catch (error) {
      warnings.push(`Could not check existing worker: ${error.message}`);
    }

    // Validate environment-specific configuration
    if (this.config.environment === 'production' && !this.config.database?.enableBackup) {
      warnings.push('Database backup not enabled for production environment');
    }

    this.validationResults.configuration = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    return this.validationResults.configuration;
  }

  /**
   * Validate database configuration and connectivity
   */
  async validateDatabase() {
    const errors = [];
    const warnings = [];

    try {
      // Basic database configuration validation
      if (!this.config.database?.name) {
        errors.push('Database name is required');
      }

      if (this.config.database?.enableMigrations && !this.config.database?.migrationsPath) {
        warnings.push('Migrations enabled but no migrations path specified');
      }

      // Enterprise database validation if available
      if (this.enterpriseModules?.databaseOrchestrator) {
        try {
          const dbValidation = await this.enterpriseModules.databaseOrchestrator.validateDatabaseSetup(
            this.config.domain,
            this.config.environment
          );
          
          if (!dbValidation.valid) {
            errors.push(...dbValidation.errors);
          }
          if (dbValidation.warnings) {
            warnings.push(...dbValidation.warnings);
          }
        } catch (error) {
          warnings.push(`Enterprise database validation failed: ${error.message}`);
        }
      }

      this.validationResults.database = {
        valid: errors.length === 0,
        errors,
        warnings
      };

      return this.validationResults.database;
    } catch (error) {
      this.validationResults.database = {
        valid: false,
        errors: [`Database validation failed: ${error.message}`]
      };
      return this.validationResults.database;
    }
  }

  /**
   * Validate deployment readiness using enterprise validation if available
   */
  async validateDeploymentReadiness() {
    try {
      // Use enterprise validator if available
      if (this.enterpriseModules?.validator) {
        const validation = await this.enterpriseModules.validator.validateDeploymentReadiness(
          this.config.domain,
          {
            environment: this.config.environment,
            validationLevel: this.config.deployment?.validationLevel || 'standard',
            interactiveMode: false // Non-interactive for validation reporting
          }
        );

        this.validationResults.deployment = validation;
        return validation;
      }

      // Fallback validation for non-enterprise deployments
      const errors = [];
      const warnings = [];

      // Basic deployment readiness checks
      if (!this.config.worker?.script) {
        errors.push('Worker script path not specified');
      }

      if (!this.config.deployment?.environment) {
        warnings.push('Deployment environment not specified, using default');
      }

      this.validationResults.deployment = {
        valid: errors.length === 0,
        errors,
        warnings
      };

      return this.validationResults.deployment;
    } catch (error) {
      this.validationResults.deployment = {
        valid: false,
        errors: [`Deployment readiness check failed: ${error.message}`]
      };
      return this.validationResults.deployment;
    }
  }

  /**
   * Auto-fix authentication issues by prompting for authentication
   */
  async autoFixAuthentication() {
    if (!this.validationResults.authentication?.canAutoFix) {
      return false;
    }

    const shouldAuthenticate = await askYesNo(
      'Cloudflare authentication required. Run authentication now?',
      'y'
    );

    if (shouldAuthenticate) {
      console.log('\n🔑 Please complete Cloudflare authentication...');
      await authenticate();
      
      // Re-validate authentication
      await this.validateAuthentication();
      return this.validationResults.authentication.valid;
    }

    return false;
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport(results) {
    const report = {
      valid: results.failed.length === 0,
      summary: {
        passed: results.passed.length,
        failed: results.failed.length,
        warnings: results.warnings.length
      },
      phases: {
        passed: results.passed,
        failed: results.failed,
        warnings: results.warnings
      },
      recommendation: null
    };

    // Generate recommendation based on results
    if (report.valid) {
      if (results.warnings.length > 0) {
        report.recommendation = 'Deployment ready with warnings - review warnings before proceeding';
      } else {
        report.recommendation = 'All validation checks passed - deployment ready';
      }
    } else {
      report.recommendation = 'Fix validation errors before proceeding with deployment';
    }

    return report;
  }

  /**
   * Get validation results for specific phase
   */
  getValidationResults(phase = null) {
    if (phase) {
      return this.validationResults[phase];
    }
    return this.validationResults;
  }

  /**
   * Reset validation state for fresh validation run
   */
  resetValidationState() {
    this.validationResults = {
      prerequisites: null,
      authentication: null,
      configuration: null,
      database: null,
      deployment: null,
      comprehensive: null
    };
  }
}