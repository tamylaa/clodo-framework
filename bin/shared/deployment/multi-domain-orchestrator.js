#!/usr/bin/env node

/**
 * Multi-Domain Orchestrator Module
 * Enterprise-grade deployment orchestration with state management, 
 * rollback capabilities, and portfolio-wide coordination
 * 
 * Extracted from bulletproof-deploy.js with enhancements
 */

import { randomBytes } from 'crypto';
import { access, readFile, writeFile, mkdir } from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
import { join } from 'path';

/**
 * Multi-Domain Deployment Orchestrator
 * Manages enterprise-level deployments across multiple domains with comprehensive state tracking
 */
export class MultiDomainOrchestrator {
  constructor(options = {}) {
    this.domains = options.domains || [];
    this.environment = options.environment || 'production';
    this.dryRun = options.dryRun || false;
    this.skipTests = options.skipTests || false;
    this.parallelDeployments = options.parallelDeployments || 3;
    
    // Portfolio-wide state tracking
    this.portfolioState = {
      orchestrationId: this.generateOrchestrationId(),
      startTime: new Date(),
      totalDomains: this.domains.length,
      completedDomains: 0,
      failedDomains: 0,
      domainStates: new Map(),
      rollbackPlan: [],
      auditLog: []
    };

    // Note: Async initialization required - call initialize() after construction
  }

  /**
   * Initialize the orchestrator asynchronously
   */
  async initialize() {
    await this.initializePortfolioState();
  }

  /**
   * Generate unique orchestration ID for tracking portfolio deployments
   * @returns {string} Unique orchestration identifier
   */
  generateOrchestrationId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = randomBytes(6).toString('hex');
    return `orchestration-${timestamp}-${random}`;
  }

  /**
   * Generate deployment ID for individual domain
   * @param {string} domain - Domain name
   * @returns {string} Unique deployment identifier
   */
  generateDeploymentId(domain) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = randomBytes(4).toString('hex');
    return `deploy-${domain}-${timestamp}-${random}`;
  }

  /**
   * Initialize portfolio state tracking
   */
  async initializePortfolioState() {
    console.log('🌐 Multi-Domain Orchestrator v1.0');
    console.log('==================================');
    console.log(`📊 Portfolio: ${this.domains.length} domains`);
    console.log(`🌍 Environment: ${this.environment}`);
    console.log(`🆔 Orchestration ID: ${this.portfolioState.orchestrationId}`);
    console.log(`🔍 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE DEPLOYMENT'}`);
    console.log(`⚡ Parallel Deployments: ${this.parallelDeployments}`);
    console.log('');

    // Initialize individual domain states
    this.domains.forEach(domain => {
      this.portfolioState.domainStates.set(domain, {
        domain,
        deploymentId: this.generateDeploymentId(domain),
        phase: 'pending',
        status: 'pending',
        startTime: null,
        endTime: null,
        error: null,
        rollbackActions: [],
        config: this.generateDomainConfig(domain)
      });
    });
  }

  /**
   * Generate standardized domain configuration
   * @param {string} domain - Domain name
   * @returns {Object} Domain configuration object
   */
  generateDomainConfig(domain) {
    const cleanDomain = domain.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    
    return {
      name: domain,
      cleanName: cleanDomain,
      productionName: `${cleanDomain}-data-service`,
      database: {
        name: `${cleanDomain}-auth-db`,
        id: null // Will be discovered/created
      },
      worker: {
        name: `${cleanDomain}-data-service`
      },
      environments: {
        production: domain,
        staging: `staging.${domain}`,
        development: `dev.${domain}`
      }
    };
  }

  /**
   * Deploy to single domain with comprehensive state management
   * @param {string} domain - Domain to deploy
   * @returns {Promise<Object>} Deployment result
   */
  async deploySingleDomain(domain) {
    const domainState = this.portfolioState.domainStates.get(domain);
    if (!domainState) {
      throw new Error(`Domain ${domain} not found in portfolio`);
    }

    try {
      domainState.startTime = new Date();
      domainState.status = 'deploying';
      
      this.logAuditEvent('DEPLOYMENT_START', domain, {
        deploymentId: domainState.deploymentId,
        environment: this.environment
      });

      console.log(`\n🚀 Deploying ${domain}`);
      console.log(`   Deployment ID: ${domainState.deploymentId}`);
      console.log(`   Environment: ${this.environment}`);

      // Phase 1: Pre-deployment validation
      await this.validateDomainPrerequisites(domain);
      domainState.phase = 'validation-complete';

      // Phase 2: Initialize domain deployment
      await this.initializeDomainDeployment(domain);
      domainState.phase = 'initialization-complete';

      // Phase 3: Database setup
      await this.setupDomainDatabase(domain);
      domainState.phase = 'database-complete';

      // Phase 4: Secret management
      await this.handleDomainSecrets(domain);
      domainState.phase = 'secrets-complete';

      // Phase 5: Worker deployment
      const deploymentResult = await this.deployDomainWorker(domain);
      domainState.phase = 'deployment-complete';

      // Phase 6: Post-deployment validation
      if (!this.skipTests) {
        await this.validateDomainDeployment(domain);
        domainState.phase = 'validation-complete';
      }

      domainState.status = 'completed';
      domainState.endTime = new Date();
      this.portfolioState.completedDomains++;

      this.logAuditEvent('DEPLOYMENT_SUCCESS', domain, {
        duration: domainState.endTime - domainState.startTime,
        phase: domainState.phase
      });

      console.log(`   ✅ ${domain} deployed successfully`);
      
      return {
        domain,
        success: true,
        deploymentId: domainState.deploymentId,
        duration: domainState.endTime - domainState.startTime,
        url: deploymentResult.url, // Include the actual deployment URL
        environment: this.environment
      };

    } catch (error) {
      domainState.status = 'failed';
      domainState.error = error.message;
      domainState.endTime = new Date();
      this.portfolioState.failedDomains++;

      this.logAuditEvent('DEPLOYMENT_FAILED', domain, {
        error: error.message,
        phase: domainState.phase
      });

      console.error(`   ❌ ${domain} deployment failed: ${error.message}`);
      
      // Add to rollback plan if needed
      if (!this.dryRun) {
        this.portfolioState.rollbackPlan.push({
          domain,
          actions: domainState.rollbackActions
        });
      }

      throw error;
    }
  }

  /**
   * Deploy to multiple domains with orchestrated coordination
   * @returns {Promise<Object>} Portfolio deployment results
   */
  async deployPortfolio() {
    const startTime = Date.now();
    const results = {
      orchestrationId: this.portfolioState.orchestrationId,
      successful: [],
      failed: [],
      totalDuration: 0,
      summary: {}
    };

    try {
      console.log('🌐 Starting Portfolio Deployment');
      console.log(`📊 Total Domains: ${this.domains.length}`);
      console.log(`⚡ Parallel Limit: ${this.parallelDeployments}`);
      console.log('');

      // Deploy domains in batches based on parallel limit
      const batches = this.createDeploymentBatches();
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Batch ${batchIndex + 1}/${batches.length}: ${batch.join(', ')}`);

        // Deploy batch in parallel
        const batchResults = await Promise.allSettled(
          batch.map(domain => this.deploySingleDomain(domain))
        );

        // Process batch results
        batchResults.forEach((result, index) => {
          const domain = batch[index];
          
          if (result.status === 'fulfilled') {
            results.successful.push({
              domain,
              ...result.value
            });
          } else {
            results.failed.push({
              domain,
              error: result.reason.message
            });
          }
        });

        // Brief pause between batches
        if (batchIndex < batches.length - 1) {
          console.log('   ⏳ Pausing between batches...\n');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      results.totalDuration = Date.now() - startTime;
      results.summary = {
        total: this.domains.length,
        successful: results.successful.length,
        failed: results.failed.length,
        successRate: (results.successful.length / this.domains.length * 100).toFixed(1)
      };

      this.portfolioState.endTime = new Date();
      this.logAuditEvent('PORTFOLIO_COMPLETE', 'ALL', results.summary);

      console.log('\n🎉 PORTFOLIO DEPLOYMENT COMPLETE');
      console.log('================================');
      console.log(`✅ Successful: ${results.summary.successful}/${results.summary.total}`);
      console.log(`❌ Failed: ${results.summary.failed}/${results.summary.total}`);
      console.log(`📊 Success Rate: ${results.summary.successRate}%`);
      console.log(`⏱️ Total Duration: ${(results.totalDuration / 1000).toFixed(1)}s`);

      if (results.failed.length > 0) {
        console.log('\n❌ Failed Domains:');
        results.failed.forEach(failure => {
          console.log(`   - ${failure.domain}: ${failure.error}`);
        });
      }

      return results;

    } catch (error) {
      this.logAuditEvent('PORTFOLIO_FAILED', 'ALL', { error: error.message });
      throw error;
    }
  }

  /**
   * Create deployment batches based on parallel limit
   * @returns {Array<Array<string>>} Batches of domains
   */
  createDeploymentBatches() {
    const batches = [];
    for (let i = 0; i < this.domains.length; i += this.parallelDeployments) {
      batches.push(this.domains.slice(i, i + this.parallelDeployments));
    }
    return batches;
  }

  /**
   * Log audit event for tracking
   * @param {string} event - Event type
   * @param {string} domain - Domain or 'ALL' for portfolio events
   * @param {Object} details - Event details
   */
  logAuditEvent(event, domain, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      orchestrationId: this.portfolioState.orchestrationId,
      event,
      domain,
      details
    };

    this.portfolioState.auditLog.push(auditEntry);

    // Save to file for persistence (fire and forget)
    if (!this.dryRun) {
      (async () => {
        try {
          await this.saveAuditLog();
        } catch (error) {
          console.warn(`⚠️ Failed to save audit log: ${error.message}`);
        }
      })();
    }
  }

  /**
   * Save audit log to file
   */
  async saveAuditLog() {
    try {
      const logDir = 'deployments';
      try {
        await access(logDir);
      } catch {
        await mkdir(logDir, { recursive: true });
      }

      const logFile = join(logDir, `${this.portfolioState.orchestrationId}.json`);
      const logData = {
        orchestrationId: this.portfolioState.orchestrationId,
        environment: this.environment,
        startTime: this.portfolioState.startTime,
        endTime: this.portfolioState.endTime,
        domains: this.domains,
        summary: {
          total: this.portfolioState.totalDomains,
          completed: this.portfolioState.completedDomains,
          failed: this.portfolioState.failedDomains
        },
        auditLog: this.portfolioState.auditLog
      };

      await writeFile(logFile, JSON.stringify(logData, null, 2));
    } catch (error) {
      console.warn(`⚠️ Failed to save audit log: ${error.message}`);
    }
  }

  // Placeholder methods for domain-specific operations (to be implemented with other modules)
  async validateDomainPrerequisites(domain) {
    // Will integrate with deployment-validator module
    console.log(`   🔍 Validating ${domain} prerequisites...`);
  }

  async initializeDomainDeployment(domain) {
    // Will integrate with config and setup modules
    console.log(`   🔧 Initializing ${domain} deployment...`);
  }

  async setupDomainDatabase(domain) {
    // Use configurable database naming from framework config
    console.log(`   🗄️ Setting up ${domain} database...`);
    
    try {
      // Extract service name from domain (e.g., "data-service" from "data-service.greatidude.com")  
      const serviceName = domain.split('.')[0];
      
      // Import framework config for consistent naming
      const { frameworkConfig } = await import('../../../src/utils/framework-config.js');
      const databaseName = frameworkConfig.generateDatabaseName(serviceName, this.environment);
      
      console.log(`     📋 Service: ${serviceName}`);
      console.log(`     🗄️ Database: ${databaseName} (${this.environment})`);
      console.log(`     ✅ Database configuration ready`);
      
      // Database will be created automatically by Cloudflare Workers during deployment
      return { success: true, serviceName, databaseName, environment: this.environment };
    } catch (error) {
      console.error(`     ❌ Database setup failed: ${error.message}`);
      throw error;
    }
  }

  async handleDomainSecrets(domain) {
    // Will integrate with enhanced secret-generator module
    console.log(`   🔐 Managing ${domain} secrets...`);
  }

  async deployDomainWorker(domain) {
    // Use WranglerDeployer to execute actual deployment
    console.log(`   ⚡ Deploying ${domain} worker via wrangler...`);

    try {
      // Import WranglerDeployer dynamically (only available at build time)
      const { WranglerDeployer } = await import('../../../src/deployment/wrangler-deployer.js');

      const deployer = new WranglerDeployer({
        cwd: process.cwd(),
        configPath: this.environment === 'production' ? 'wrangler.toml' : 'config/wrangler.toml'
      });

      // Validate wrangler setup first
      const validation = await deployer.validateWranglerSetup();
      if (!validation.valid) {
        throw new Error(`Wrangler validation failed: ${validation.error}`);
      }

      // Execute deployment
      const deploymentResult = await deployer.deploy(this.environment);

      if (!deploymentResult.success) {
        throw new Error(`Deployment failed: ${deploymentResult.error}`);
      }

      console.log(`   ✅ Worker deployed successfully`);
      console.log(`   🌐 URL: ${deploymentResult.url}`);

      // Return deployment result for use by caller
      return {
        success: true,
        url: deploymentResult.url,
        deploymentId: deploymentResult.deploymentId,
        duration: deploymentResult.duration,
        environment: this.environment
      };

    } catch (error) {
      console.error(`   ❌ Worker deployment failed: ${error.message}`);
      throw error;
    }
  }

  async validateDomainDeployment(domain) {
    // Will integrate with production-tester module
    console.log(`   🧪 Validating ${domain} deployment...`);
  }
}

export default MultiDomainOrchestrator;