/**
 * Interactive Deployment Coordinator
 *
 * Restores the interactive deployment functionality that was lost during enterprise code separation.
 * Orchestrates the interactive workflows that were extracted from enterprise-deployment/master-deploy.js.
 *
 * This coordinator brings together:
 * - InteractiveDomainInfoGatherer
 * - InteractiveDatabaseWorkflow
 * - InteractiveSecretWorkflow
 * - InteractiveValidation
 * - InteractiveConfirmation
 * - InteractiveTestingWorkflow
 *
 * @module interactive-deployment-coordinator
 */

import { InteractiveDomainInfoGatherer } from './interactive-domain-info-gatherer.js';
import { InteractiveDatabaseWorkflow } from './interactive-database-workflow.js';
import { InteractiveSecretWorkflow } from './interactive-secret-workflow.js';
import { InteractiveValidationWorkflow } from './interactive-validation.js';
import { InteractiveConfirmation } from './interactive-confirmation.js';
import { InteractiveTestingWorkflow } from './interactive-testing-workflow.js';
import { Clodo } from '@tamyla/clodo-framework';
import { OutputFormatter } from '../../utils/output-formatter.js';
import { DeploymentCredentialCollector } from '../credential-collector.js';

/**
 * Interactive Deployment Coordinator
 * Orchestrates the complete interactive deployment workflow
 */
export class InteractiveDeploymentCoordinator {
  /**
   * @param {Object} options - Coordinator options
   * @param {string} options.servicePath - Path to service directory
   * @param {string} options.environment - Target environment
   * @param {string} options.domain - Specific domain (optional)
   * @param {string} options.serviceName - Service name for URL generation
   * @param {boolean} options.dryRun - Dry run mode
   * @param {Object} options.credentials - Cloudflare credentials
   * @param {boolean} options.checkPrereqs - Check prerequisites
   * @param {boolean} options.checkAuth - Check authentication
   * @param {boolean} options.checkNetwork - Check network connectivity
   * @param {boolean} options.verbose - Verbose output
   * @param {boolean} options.quiet - Quiet output
   * @param {boolean} options.json - JSON output
   */
  constructor(options = {}) {
    this.options = options;
    this.output = new OutputFormatter(options);
    this.deploymentState = {
      config: {},
      validation: {},
      resources: {},
      testing: {}
    };

    // Initialize credential collector
    this.credentialCollector = new DeploymentCredentialCollector({
      quiet: options.quiet,
      servicePath: options.servicePath
    });

    // Initialize interactive workflow components
    this.workflows = {
      domainGatherer: new InteractiveDomainInfoGatherer({
        interactive: true,
        configCache: null // TODO: Add config cache if available
      }),
      databaseWorkflow: new InteractiveDatabaseWorkflow({
        interactive: true,
        dryRun: this.options.dryRun
      }),
      secretWorkflow: new InteractiveSecretWorkflow({
        interactive: true,
        dryRun: this.options.dryRun,
        credentials: this.options.credentials
      }),
      validation: new InteractiveValidationWorkflow({
        interactive: true
      }),
      confirmation: InteractiveConfirmation,
      testingWorkflow: new InteractiveTestingWorkflow({
        interactive: true
      })
    };
  }

  /**
   * Run the complete interactive deployment workflow
   * @returns {Promise<Object>} Deployment result
   */
  async runInteractiveDeployment() {
    try {
      console.log('\n🔄 Starting Interactive Deployment Workflow...\n');

      // Phase 1: Gather domain and environment information
      await this.gatherDeploymentInfo();

      // Phase 2: Configure database resources
      await this.configureDatabase();

      // Phase 3: Configure secrets and credentials
      await this.configureSecrets();

      // Phase 4: Validate configuration
      await this.validateConfiguration();

      // Phase 5: Show final confirmation
      await this.showConfirmation();

      // Phase 6: Execute deployment
      const result = await this.executeDeployment();

      // Phase 7: Run post-deployment testing
      await this.runPostDeploymentTests();

      return result;

    } catch (error) {
      this.output.error(`Interactive deployment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Phase 1: Gather domain and environment information
   */
  async gatherDeploymentInfo() {
    console.log('📋 Phase 1: Gathering Deployment Information');
    console.log('─'.repeat(50));

    // Start with basic config from options
    this.deploymentState.config = {
      servicePath: this.options.servicePath || '.',
      environment: this.options.environment || 'production',
      domain: this.options.domain,
      dryRun: this.options.dryRun || false
    };

    // Collect credentials with prerequisite checking
    const credentialOptions = {
      token: this.options.credentials?.token,
      accountId: this.options.credentials?.accountId,
      zoneId: this.options.credentials?.zoneId,
      checkAuth: this.options.checkAuth,
      checkNetwork: this.options.checkNetwork
    };

    this.deploymentState.config.credentials = await this.credentialCollector.collectCredentials(credentialOptions);

    // Use interactive domain gatherer for missing information
    if (!this.deploymentState.config.domain) {
      this.deploymentState.config = await this.workflows.domainGatherer.gatherSingleDomainInfo(this.deploymentState.config);
    }

    console.log('✅ Domain information gathered\n');
  }

  /**
   * Phase 2: Configure database resources
   */
  async configureDatabase() {
    console.log('🗄️  Phase 2: Configuring Database Resources');
    console.log('─'.repeat(50));

    this.deploymentState.resources.database = await this.workflows.databaseWorkflow.handleDatabaseSetup(
      this.deploymentState.config.domain,
      this.deploymentState.config.environment,
      { 
        interactive: true,
        apiToken: this.deploymentState.config.credentials?.token,
        accountId: this.deploymentState.config.credentials?.accountId
      }
    );

    console.log('✅ Database configuration complete\n');
  }

  /**
   * Phase 3: Configure secrets and credentials
   */
  async configureSecrets() {
    console.log('🔐 Phase 3: Configuring Secrets & Credentials');
    console.log('─'.repeat(50));

    const workerName = this.deploymentState.config.worker?.name || `${this.deploymentState.config.domain}-data-service`;
    this.deploymentState.resources.secrets = await this.workflows.secretWorkflow.handleSecretManagement(
      this.deploymentState.config.domain,
      this.deploymentState.config.environment,
      workerName,
      { 
        interactive: true,
        credentials: this.deploymentState.config.credentials
      }
    );

    console.log('✅ Secrets configuration complete\n');
  }

  /**
   * Phase 4: Validate configuration
   */
  async validateConfiguration() {
    console.log('✅ Phase 4: Validating Configuration');
    console.log('─'.repeat(50));

    this.deploymentState.validation = await this.workflows.validation.executePreDeploymentChecks(this.deploymentState.config);

    console.log('✅ Configuration validation complete\n');
  }

  /**
   * Phase 5: Show final confirmation
   */
  async showConfirmation() {
    console.log('🎯 Phase 5: Final Confirmation');
    console.log('─'.repeat(50));

    await this.workflows.confirmation.showFinalConfirmation(
      this.deploymentState.config,
      this.deploymentState,
      { defaultAnswer: 'n' }
    );

    console.log('✅ Deployment confirmed\n');
  }

  /**
   * Phase 6: Execute deployment
   */
  async executeDeployment() {
    console.log('🚀 Phase 6: Executing Deployment');
    console.log('─'.repeat(50));

    const result = await Clodo.deploy({
      servicePath: this.deploymentState.config.servicePath,
      environment: this.deploymentState.config.environment,
      domain: this.deploymentState.config.domain,
      serviceName: this.options.serviceName,
      dryRun: this.deploymentState.config.dryRun,
      credentials: this.deploymentState.config.credentials
    });

    if (result.success) {
      console.log('✅ Deployment executed successfully\n');
    } else {
      throw new Error('Deployment execution failed');
    }

    return result;
  }

  /**
   * Phase 7: Run post-deployment testing
   */
  async runPostDeploymentTests() {
    console.log('🧪 Phase 7: Running Post-Deployment Tests');
    console.log('─'.repeat(50));

    this.deploymentState.testing = await this.workflows.testingWorkflow.executePostDeploymentTesting(this.deploymentState.config);

    console.log('✅ Post-deployment testing complete\n');
  }
}