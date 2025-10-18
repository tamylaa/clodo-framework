/**
 * Deployment Coordinator Module
 * Handles deployment orchestration, batching, and parallel execution
 * Extracted from MultiDomainOrchestrator for focused responsibility
 */

export class DeploymentCoordinator {
  constructor(options = {}) {
    this.parallelDeployments = options.parallelDeployments || 3;
    this.skipTests = options.skipTests || false;
    this.dryRun = options.dryRun || false;
    this.environment = options.environment || 'production';
    this.batchPauseMs = options.batchPauseMs || 2000;
    this.deploymentPhases = options.phases || [
      'validation',
      'initialization', 
      'database',
      'secrets',
      'deployment',
      'post-validation'
    ];
  }

  /**
   * Deploy to single domain with comprehensive phase management
   * @param {string} domain - Domain to deploy
   * @param {Object} domainState - Domain state object
   * @param {Object} handlers - Handler functions for each phase
   * @returns {Promise<Object>} Deployment result
   */
  async deploySingleDomain(domain, domainState, handlers) {
    const phaseResults = {
      validation: { success: false, errors: [], warnings: [] },
      initialization: { success: false, errors: [], warnings: [] },
      database: { success: false, errors: [], warnings: [] },
      secrets: { success: false, errors: [], warnings: [] },
      deployment: { success: false, errors: [], warnings: [] },
      'post-validation': { success: false, errors: [], warnings: [] }
    };
    
    try {
      domainState.startTime = new Date();
      domainState.status = 'deploying';
      
      console.log(`\n🚀 Deploying ${domain}`);
      console.log(`   Deployment ID: ${domainState.deploymentId}`);
      console.log(`   Environment: ${this.environment}`);

      let deploymentUrl = null;
      let hasCriticalErrors = false;
      
      // Execute deployment phases
      for (const phase of this.deploymentPhases) {
        try {
          const phaseResult = await this.executeDeploymentPhase(domain, phase, domainState, handlers);
          domainState.phase = `${phase}-complete`;
          
          // Mark phase as successful
          phaseResults[phase].success = true;
          
          // Capture deployment URL from deployment phase
          if (phase === 'deployment' && phaseResult) {
            if (phaseResult.url) {
              deploymentUrl = phaseResult.url;
            }
            if (phaseResult.deployed === false) {
              phaseResults[phase].warnings.push('Worker deployed in dry-run mode');
            }
          }
          
          // Capture database warnings
          if (phase === 'database' && phaseResult) {
            if (phaseResult.error) {
              phaseResults[phase].warnings.push(phaseResult.error);
            }
          }
          
        } catch (phaseError) {
          phaseResults[phase].success = false;
          phaseResults[phase].errors.push(phaseError.message);
          
          // Determine if error is critical (stops deployment)
          const criticalPhases = ['validation', 'initialization', 'deployment'];
          if (criticalPhases.includes(phase)) {
            console.error(`   ❌ Critical error in ${phase} phase: ${phaseError.message}`);
            hasCriticalErrors = true;
            throw phaseError; // Stop deployment on critical errors
          } else {
            // Non-critical errors (database migrations, health checks) - log but continue
            console.warn(`   ⚠️  ${phase} phase warning: ${phaseError.message}`);
            console.warn(`   💡 Deployment will continue - this can be fixed manually`);
          }
        }
      }

      // Determine overall success based on phase results
      const allPhasesSuccessful = Object.values(phaseResults).every(result => result.success);
      const hasWarnings = Object.values(phaseResults).some(result => 
        result.warnings.length > 0 || (result.success === false && result.errors.length === 0)
      );
      
      domainState.status = hasCriticalErrors ? 'failed' : (allPhasesSuccessful ? 'completed' : 'completed-with-warnings');
      domainState.endTime = new Date();
      domainState.phaseResults = phaseResults;

      // Show appropriate completion message
      if (allPhasesSuccessful) {
        console.log(`   ✅ ${domain} deployed successfully`);
      } else if (!hasCriticalErrors) {
        console.log(`   ⚠️  ${domain} deployed with warnings`);
        this.displayPhaseWarnings(phaseResults);
      }
      
      return {
        domain,
        success: !hasCriticalErrors,
        allPhasesSuccessful,
        deploymentId: domainState.deploymentId,
        duration: domainState.endTime - domainState.startTime,
        phases: this.deploymentPhases.length,
        url: deploymentUrl || domainState.deploymentUrl,
        status: domainState.status,
        phaseResults
      };

    } catch (error) {
      domainState.status = 'failed';
      domainState.error = error.message;
      domainState.endTime = new Date();
      domainState.phaseResults = phaseResults;

      console.error(`   ❌ ${domain} deployment failed: ${error.message}`);
      
      throw error;
    }
  }

  /**
   * Display warnings for phases that had issues
   * @param {Object} phaseResults - Phase results object
   */
  displayPhaseWarnings(phaseResults) {
    console.log(`\n   📊 Phase Status Summary:`);
    for (const [phase, result] of Object.entries(phaseResults)) {
      if (result.success && result.warnings.length === 0) {
        console.log(`   ✅ ${phase}: Success`);
      } else if (result.success && result.warnings.length > 0) {
        console.log(`   ⚠️  ${phase}: Success with warnings`);
        result.warnings.forEach(warn => console.log(`      • ${warn}`));
      } else {
        console.log(`   ❌ ${phase}: Failed`);
        result.errors.forEach(err => console.log(`      • ${err}`));
      }
    }
  }

  /**
   * Execute specific deployment phase
   * @param {string} domain - Domain being deployed
   * @param {string} phase - Phase name
   * @param {Object} domainState - Domain state object
   * @param {Object} handlers - Phase handler functions
   * @returns {Promise<any>} Phase handler result
   */
  async executeDeploymentPhase(domain, phase, domainState, handlers) {
    const phaseHandler = handlers[phase];
    if (!phaseHandler) {
      console.warn(`   ⚠️ No handler for phase: ${phase}`);
      return null;
    }

    console.log(`   📋 Phase: ${phase}`);
    
    if (this.dryRun) {
      console.log(`   🔍 DRY RUN: Would execute ${phase} for ${domain}`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
      return null;
    }

    // Skip post-validation if tests are disabled
    if (phase === 'post-validation' && this.skipTests) {
      console.log(`   ⏭️ Skipping ${phase} (tests disabled)`);
      return null;
    }

    // Execute handler and return result (important for capturing URLs, database IDs, etc.)
    return await phaseHandler(domain, domainState);
  }

  /**
   * Deploy to multiple domains with orchestrated coordination
   * @param {Array} domains - Domains to deploy
   * @param {Map} domainStates - Map of domain states
   * @param {Object} handlers - Phase handler functions
   * @returns {Promise<Object>} Portfolio deployment results
   */
  async deployPortfolio(domains, domainStates, handlers) {
    const startTime = Date.now();
    const results = {
      successful: [],
      failed: [],
      totalDuration: 0,
      summary: {},
      batches: []
    };

    try {
      console.log('🌐 Starting Portfolio Deployment');
      console.log(`📊 Total Domains: ${domains.length}`);
      console.log(`⚡ Parallel Limit: ${this.parallelDeployments}`);
      console.log('');

      // Deploy domains in batches based on parallel limit
      const batches = this.createDeploymentBatches(domains);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Batch ${batchIndex + 1}/${batches.length}: ${batch.join(', ')}`);

        const batchResult = await this.deployBatch(batch, domainStates, handlers);
        results.batches.push(batchResult);

        // Merge batch results
        results.successful.push(...batchResult.successful);
        results.failed.push(...batchResult.failed);

        // Brief pause between batches
        if (batchIndex < batches.length - 1) {
          console.log('   ⏳ Pausing between batches...\n');
          await new Promise(resolve => setTimeout(resolve, this.batchPauseMs));
        }
      }

      results.totalDuration = Date.now() - startTime;
      results.summary = this.generateDeploymentSummary(domains.length, results);

      this.logDeploymentComplete(results);
      return results;

    } catch (error) {
      console.error('❌ Portfolio deployment failed:', error.message);
      throw error;
    }
  }

  /**
   * Deploy a single batch of domains in parallel
   * @param {Array} batch - Domains in this batch
   * @param {Map} domainStates - Domain states map
   * @param {Object} handlers - Phase handlers
   * @returns {Promise<Object>} Batch results
   */
  async deployBatch(batch, domainStates, handlers) {
    const batchResults = await Promise.allSettled(
      batch.map(domain => {
        const domainState = domainStates.get(domain);
        return this.deploySingleDomain(domain, domainState, handlers);
      })
    );

    const successful = [];
    const failed = [];

    batchResults.forEach((result, index) => {
      const domain = batch[index];
      
      if (result.status === 'fulfilled') {
        successful.push({
          domain,
          ...result.value
        });
      } else {
        failed.push({
          domain,
          error: result.reason.message
        });
      }
    });

    return { successful, failed, batchSize: batch.length };
  }

  /**
   * Create deployment batches based on parallel limit
   * @param {Array} domains - Domains to batch
   * @returns {Array<Array<string>>} Batches of domains
   */
  createDeploymentBatches(domains) {
    const batches = [];
    for (let i = 0; i < domains.length; i += this.parallelDeployments) {
      batches.push(domains.slice(i, i + this.parallelDeployments));
    }
    return batches;
  }

  /**
   * Generate deployment summary statistics
   * @param {number} totalDomains - Total domain count
   * @param {Object} results - Deployment results
   * @returns {Object} Summary statistics
   */
  generateDeploymentSummary(totalDomains, results) {
    return {
      total: totalDomains,
      successful: results.successful.length,
      failed: results.failed.length,
      successRate: (results.successful.length / totalDomains * 100).toFixed(1),
      averageDuration: results.successful.length > 0 
        ? (results.successful.reduce((sum, r) => sum + r.duration, 0) / results.successful.length / 1000).toFixed(1)
        : 0,
      totalBatches: results.batches.length
    };
  }

  /**
   * Log deployment completion with formatted output
   * @param {Object} results - Deployment results
   */
  logDeploymentComplete(results) {
    console.log('\n🎉 PORTFOLIO DEPLOYMENT COMPLETE');
    console.log('================================');
    console.log(`✅ Successful: ${results.summary.successful}/${results.summary.total}`);
    console.log(`❌ Failed: ${results.summary.failed}/${results.summary.total}`);
    console.log(`📊 Success Rate: ${results.summary.successRate}%`);
    console.log(`⏱️ Total Duration: ${(results.totalDuration / 1000).toFixed(1)}s`);
    console.log(`📦 Batches Processed: ${results.summary.totalBatches}`);

    if (results.summary.averageDuration > 0) {
      console.log(`⏱️ Average Duration: ${results.summary.averageDuration}s per domain`);
    }

    if (results.failed.length > 0) {
      console.log('\n❌ Failed Domains:');
      results.failed.forEach(failure => {
        console.log(`   - ${failure.domain}: ${failure.error}`);
      });
    }
  }

  /**
   * Validate deployment coordination configuration
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const issues = [];

    if (this.parallelDeployments < 1) {
      issues.push('parallelDeployments must be at least 1');
    }

    if (this.parallelDeployments > 10) {
      issues.push('parallelDeployments exceeds recommended maximum of 10');
    }

    if (this.batchPauseMs < 0) {
      issues.push('batchPauseMs cannot be negative');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings: this.parallelDeployments > 5 ? ['High parallelism may cause rate limiting'] : []
    };
  }

  /**
   * Get coordination statistics
   * @returns {Object} Coordinator statistics
   */
  getStats() {
    return {
      parallelDeployments: this.parallelDeployments,
      batchPauseMs: this.batchPauseMs,
      phasesCount: this.deploymentPhases.length,
      dryRun: this.dryRun,
      skipTests: this.skipTests,
      environment: this.environment
    };
  }
}