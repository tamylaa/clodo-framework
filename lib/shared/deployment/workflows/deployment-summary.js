/**
 * Deployment Summary Module
 * 
 * Provides reusable deployment success/failure summary reporting.
 * Extracted from enterprise-deployment/master-deploy.js for modularity.
 * 
 * @module deployment-summary
 */

/**
 * Deployment Summary Manager
 * Handles success summaries, enterprise summaries, and deployment statistics
 */
export class DeploymentSummary {
  /**
   * Display standard deployment success summary
   * 
   * @param {Object} deploymentState - Deployment state object
   * @param {Object} config - Deployment configuration
   * @param {Object} options - Display options
   * @returns {Promise<void>}
   */
  static async displaySuccessSummary(deploymentState, config, options = {}) {
    const duration = (Date.now() - deploymentState.startTime.getTime()) / 1000;

    console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
    console.log('=========================');
    console.log(`\n📊 Summary:`);
    console.log(`   🆔 Deployment ID: ${deploymentState.deploymentId}`);
    console.log(`   🌐 Domain: ${config.domain}`);
    console.log(`   ⏱️ Duration: ${duration.toFixed(1)}s`);
    console.log(`   🔑 Secrets: ${Object.keys(config.secrets.keys).length} deployed`);
    
    this.displayEndpoints(config);
    this.displayDistributionFiles(config);
    this.displayNextSteps(config);
  }

  /**
   * Display enterprise deployment success summary
   * 
   * @param {Object} deploymentState - Deployment state object
   * @param {Object} config - Deployment configuration
   * @param {Object} frameworkPaths - Framework paths configuration
   * @param {Object} enterpriseModules - Enterprise modules
   * @returns {Promise<void>}
   */
  static async displayEnterpriseSuccessSummary(deploymentState, config, frameworkPaths, enterpriseModules) {
    console.log('\n🎉 ENTERPRISE DEPLOYMENT SUCCESSFUL!');
    console.log('====================================');
    
    const duration = (new Date() - deploymentState.startTime) / 1000;
    
    this.displayDeploymentStats(deploymentState, config, duration);
    this.displayEnterpriseEndpoints(config);
    this.displayGeneratedFiles(frameworkPaths, config, deploymentState);
    this.displayEnabledFeatures(config);
    
    // End audit session successfully
    if (enterpriseModules?.auditor) {
      enterpriseModules.auditor.endDeploymentAudit(
        deploymentState.deploymentId, 
        'success', 
        { 
          duration,
          endpoints: 4,
          testsRun: config.deployment.runTests,
          enterpriseFeatures: Object.keys(config.enterprise).filter(k => config.enterprise[k]).length
        }
      );
    }

    this.displayEnterpriseNextSteps();
  }

  /**
   * Display deployment statistics
   * 
   * @param {Object} deploymentState - Deployment state
   * @param {Object} config - Configuration
   * @param {number} duration - Deployment duration in seconds
   */
  static displayDeploymentStats(deploymentState, config, duration) {
    console.log('\n📊 Deployment Statistics:');
    console.log(`   ⏱️  Duration: ${duration.toFixed(1)} seconds`);
    console.log(`   🆔 Deployment ID: ${deploymentState.deploymentId}`);
    console.log(`   🌐 Domain: ${config.domain}`);
    console.log(`   🌍 Environment: ${config.environment}`);
    console.log(`   📱 Mode: ${config.deploymentMode}`);
  }

  /**
   * Display service endpoints
   * 
   * @param {Object} config - Configuration
   */
  static displayEndpoints(config) {
    console.log(`\n🌐 Your service is now live at:`);
    console.log(`   ${config.worker.url}/health`);
    console.log(`   ${config.worker.url}/auth/magic-link`);
  }

  /**
   * Display enterprise endpoints
   * 
   * @param {Object} config - Configuration
   */
  static displayEnterpriseEndpoints(config) {
    console.log('\n🌐 Enterprise Endpoints:');
    console.log(`   🏠 Main: ${config.worker.url}`);
    console.log(`   ❤️  Health: ${config.worker.url}/health`);
    console.log(`   🔐 Auth: ${config.worker.url}/auth/magic-link`);
    console.log(`   📊 API: ${config.worker.url}/api`);
  }

  /**
   * Display secret distribution files
   * 
   * @param {Object} config - Configuration
   */
  static displayDistributionFiles(config) {
    console.log(`\n📄 Secret distribution files:`);
    console.log(`   secrets/distribution/${config.domain}/.env`);
    console.log(`   secrets/distribution/${config.domain}/secrets.json`);
    console.log(`   secrets/distribution/${config.domain}/deploy-secrets.sh`);
  }

  /**
   * Display generated enterprise files
   * 
   * @param {Object} frameworkPaths - Framework paths
   * @param {Object} config - Configuration
   * @param {Object} deploymentState - Deployment state
   */
  static displayGeneratedFiles(frameworkPaths, config, deploymentState) {
    console.log('\n📄 Generated Enterprise Files:');
    console.log(`   📝 Audit Log: ${frameworkPaths.auditLogs}/deployments/session-${deploymentState.deploymentId}.log`);
    console.log(`   📊 Report: ${frameworkPaths.auditReports}/deployment-${deploymentState.deploymentId}.html`);
    console.log(`   🔐 Secrets: ${frameworkPaths.secureTokens}/distribution/${config.domain}/`);
    console.log(`   ⚙️  Config: ${frameworkPaths.configCache}/domains/${config.domain}/`);
  }

  /**
   * Display enabled enterprise features
   * 
   * @param {Object} config - Configuration
   */
  static displayEnabledFeatures(config) {
    console.log('\n🚀 Enterprise Features Enabled:');
    console.log(`   🔍 Validation: ${config.deployment.validationLevel}`);
    console.log(`   📋 Audit: ${config.deployment.auditLevel}`);
    console.log(`   🧪 Testing: ${config.deployment.runTests ? 'Comprehensive' : 'Disabled'}`);
    console.log(`   🔄 Rollback: ${config.deployment.enableRollback ? 'Available' : 'Disabled'}`);
    console.log(`   💾 Caching: Smart configuration caching enabled`);
    console.log(`   🎯 Orchestration: Enterprise orchestration active`);
  }

  /**
   * Display next steps
   * 
   * @param {Object} config - Configuration
   */
  static displayNextSteps(config) {
    console.log('\n🚀 Next steps:');
    console.log('   1. Test the endpoints above');
    console.log('   2. Distribute secrets to upstream/downstream applications');  
    console.log('   3. Configure DNS if using custom domain');
    console.log('   4. Update your applications to use the new service');
  }

  /**
   * Display enterprise next steps
   */
  static displayEnterpriseNextSteps() {
    console.log('\n✅ Enterprise deployment completed successfully!');
    console.log('   Visit the health endpoint to verify deployment');
    console.log('   Check audit logs for detailed deployment history');
    console.log('   Use enterprise modules for ongoing management');
  }

  /**
   * Display failure summary
   * 
   * @param {Error} error - Deployment error
   * @param {Object} deploymentState - Deployment state
   * @param {Object} config - Configuration
   */
  static displayFailureSummary(error, deploymentState, config) {
    const duration = (Date.now() - deploymentState.startTime.getTime()) / 1000;

    console.log('\n❌ DEPLOYMENT FAILED');
    console.log('===================');
    console.log(`\n📊 Summary:`);
    console.log(`   🆔 Deployment ID: ${deploymentState.deploymentId}`);
    console.log(`   🌐 Domain: ${config.domain}`);
    console.log(`   ⏱️ Duration: ${duration.toFixed(1)}s`);
    console.log(`   ❌ Error: ${error.message}`);
    
    if (deploymentState.currentPhase) {
      console.log(`   📍 Failed at: ${deploymentState.currentPhase}`);
    }

    console.log('\n🔄 Rollback options:');
    console.log(`   ${deploymentState.rollbackActions.length} rollback actions available`);
  }

  /**
   * Get deployment summary statistics
   * 
   * @param {Object} deploymentState - Deployment state
   * @param {Object} config - Configuration
   * @returns {Object} Summary statistics
   */
  static getSummaryStats(deploymentState, config) {
    const duration = (Date.now() - deploymentState.startTime.getTime()) / 1000;

    return {
      deploymentId: deploymentState.deploymentId,
      domain: config.domain,
      environment: config.environment,
      duration: duration.toFixed(1),
      secretsDeployed: Object.keys(config.secrets.keys).length,
      currentPhase: deploymentState.currentPhase,
      rollbackActionsAvailable: deploymentState.rollbackActions.length
    };
  }
}
