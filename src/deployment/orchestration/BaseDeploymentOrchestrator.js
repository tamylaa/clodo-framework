/**
 * Base Deployment Orchestrator
 * 
 * Abstract base class for all deployment orchestration patterns.
 * Provides unified phase pipeline, phase state management, and error handling.
 * 
 * Phase Pipeline:
 * 1. Initialization → 2. Validation → 3. Preparation → 4. Deployment → 5. Verification → 6. Monitoring
 * 
 * All subclasses must implement phase-specific methods:
 * - onInitialize()
 * - onValidation()
 * - onPrepare()
 * - onDeploy()
 * - onVerify()
 * - onMonitor()
 * 
 * @class BaseDeploymentOrchestrator
 * @abstract
 */

import { ErrorHandler } from '../../../lib/shared/utils/ErrorHandler.js';

/**
 * Phase state and execution order
 */
const DEPLOYMENT_PHASES = {
  INITIALIZATION: 'initialization',
  VALIDATION: 'validation',
  PREPARATION: 'preparation',
  DEPLOYMENT: 'deployment',
  VERIFICATION: 'verification',
  MONITORING: 'monitoring'
};

/**
 * Phase execution order
 */
const PHASE_SEQUENCE = [
  DEPLOYMENT_PHASES.INITIALIZATION,
  DEPLOYMENT_PHASES.VALIDATION,
  DEPLOYMENT_PHASES.PREPARATION,
  DEPLOYMENT_PHASES.DEPLOYMENT,
  DEPLOYMENT_PHASES.VERIFICATION,
  DEPLOYMENT_PHASES.MONITORING
];

/**
 * Base Deployment Orchestrator - Abstract orchestration framework
 */
export class BaseDeploymentOrchestrator {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   * @param {string} options.deploymentId - Unique deployment identifier
   * @param {Object} options.config - Deployment configuration
   * @param {Object} options.auditor - Deployment auditor instance (optional)
   */
  constructor(options = {}) {
    this.deploymentId = options.deploymentId || `deploy-${Date.now()}`;
    this.config = options.config || {};
    this.auditor = options.auditor;
    
    // Phase state management
    this.currentPhase = null;
    this.phaseStates = new Map();
    this.phaseResults = new Map();
    this.phaseErrors = new Map();
    this.startTime = Date.now();
    this.phaseTimings = new Map();
    
    // Execution context
    this.executionContext = {
      deploymentId: this.deploymentId,
      startTime: this.startTime,
      phases: {},
      errors: []
    };
  }

  /**
   * Execute complete deployment orchestration
   * Runs through all phases in sequence with error handling and recovery
   * 
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Deployment result
   * @throws {Error} If critical phase fails
   */
  async execute(options = {}) {
    const { continueOnError = false } = options;

    try {
      console.log(`🎯 Starting deployment orchestration: ${this.deploymentId}`);
      console.log(`📊 Phases: ${PHASE_SEQUENCE.join(' → ')}`);
      console.log('');

      // Execute each phase in sequence
      for (const phase of PHASE_SEQUENCE) {
        try {
          const result = await this.executePhase(phase);
          this.phaseResults.set(phase, result);

          // Log phase success
          if (this.auditor) {
            this.auditor.logPhase(this.deploymentId, phase, 'complete', { result });
          }

          console.log(`✅ Phase '${phase}' completed successfully`);
        } catch (error) {
          // Store phase error
          this.phaseErrors.set(phase, error);
          console.error(`❌ Phase '${phase}' failed: ${error.message}`);

          // Log phase error
          if (this.auditor) {
            this.auditor.logError(this.deploymentId, error, {
              phase,
              context: this.executionContext
            });
          }

          // Handle critical phases
          if (this.isCriticalPhase(phase)) {
            if (!continueOnError) {
              throw error;
            }
            console.warn(`⚠️  Continuing despite critical phase failure in '${phase}'`);
          }
        }
      }

      // Generate execution summary
      const summary = this.generateExecutionSummary();
      console.log('');
      console.log(`✅ Deployment orchestration completed: ${this.deploymentId}`);
      console.log(`📈 Execution time: ${this.getExecutionTime()}ms`);

      return summary;
    } catch (error) {
      // Log fatal error to auditor if available
      if (this.auditor) {
        this.auditor.logError(this.deploymentId, error, {
          fatal: true,
          phase: this.currentPhase,
          context: this.executionContext
        });
      }

      // Re-throw the error without additional wrapping
      throw error;
    }
  }

  /**
   * Execute single phase
   * @private
   * @param {string} phase - Phase name
   * @returns {Promise<Object>} Phase result
   */
  async executePhase(phase) {
    this.currentPhase = phase;
    const phaseStartTime = Date.now();

    console.log(`\n🔄 Executing phase: '${phase}'`);
    console.log(`   ├─ Phase state: pending → executing → complete`);

    // Update phase state
    this.phaseStates.set(phase, 'executing');

    try {
      // Validate phase method exists
      const phaseMethod = `on${this.capitalize(phase)}`;
      if (typeof this[phaseMethod] !== 'function') {
        throw new Error(
          `Phase method '${phaseMethod}' not implemented in ${this.constructor.name}`
        );
      }

      // Execute phase-specific logic
      const result = await this[phaseMethod]();

      // Record phase timing
      const phaseDuration = Date.now() - phaseStartTime;
      this.phaseTimings.set(phase, phaseDuration);

      // Update phase state
      this.phaseStates.set(phase, 'complete');

      return {
        phase,
        status: 'success',
        result,
        duration: phaseDuration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Record error and re-throw
      const phaseDuration = Date.now() - phaseStartTime;
      this.phaseTimings.set(phase, phaseDuration);
      this.phaseStates.set(phase, 'error');

      throw error;
    }
  }

  /**
   * Determine if phase is critical to deployment success
   * Critical phases: initialization, validation, deployment
   * Non-critical: monitoring, verification (can warn instead)
   * 
   * @private
   * @param {string} phase - Phase name
   * @returns {boolean} True if phase is critical
   */
  isCriticalPhase(phase) {
    const criticalPhases = [
      DEPLOYMENT_PHASES.INITIALIZATION,
      DEPLOYMENT_PHASES.DEPLOYMENT
    ];
    return criticalPhases.includes(phase);
  }

  /**
   * Generate comprehensive execution summary
   * @private
   * @returns {Object} Execution summary
   */
  generateExecutionSummary() {
    const summary = {
      deploymentId: this.deploymentId,
      orchestrator: this.constructor.name,
      totalDuration: this.getExecutionTime(),
      phases: {},
      stats: {
        total: PHASE_SEQUENCE.length,
        completed: 0,
        failed: 0,
        skipped: 0
      },
      errors: Array.from(this.phaseErrors.entries()).map(([phase, error]) => ({
        phase,
        message: error.message,
        severity: this.isCriticalPhase(phase) ? 'critical' : 'warning'
      }))
    };

    // Add phase details to summary
    for (const phase of PHASE_SEQUENCE) {
      const state = this.phaseStates.get(phase);
      const duration = this.phaseTimings.get(phase) || 0;

      summary.phases[phase] = {
        state,
        duration,
        result: this.phaseResults.get(phase),
        error: this.phaseErrors.get(phase)?.message
      };

      if (state === 'complete') summary.stats.completed++;
      if (state === 'error') summary.stats.failed++;
      if (!state) summary.stats.skipped++;
    }

    summary.stats.successRate = Math.round(
      (summary.stats.completed / summary.stats.total) * 100
    );

    return summary;
  }

  /**
   * Get total execution time in milliseconds
   * @returns {number} Execution time in ms
   */
  getExecutionTime() {
    return Date.now() - this.startTime;
  }

  /**
   * Get phase status
   * @param {string} phase - Phase name
   * @returns {string} Phase state: 'pending', 'executing', 'complete', 'error'
   */
  getPhaseStatus(phase) {
    return this.phaseStates.get(phase) || 'pending';
  }

  /**
   * Get all phase results
   * @returns {Map<string, Object>} Map of phase results
   */
  getPhaseResults() {
    return new Map(this.phaseResults);
  }

  /**
   * Get specific phase result
   * @param {string} phase - Phase name
   * @returns {Object} Phase result or null
   */
  getPhaseResult(phase) {
    return this.phaseResults.get(phase) || null;
  }

  /**
   * Get execution context
   * @returns {Object} Current execution context
   */
  getExecutionContext() {
    return {
      ...this.executionContext,
      currentPhase: this.currentPhase,
      phaseStates: Object.fromEntries(this.phaseStates),
      phaseTimings: Object.fromEntries(this.phaseTimings),
      totalDuration: this.getExecutionTime()
    };
  }

  /**
   * Capitalize first letter of string and convert hyphens to camelCase
   * Used for method name generation with special handling for phase names
   * 
   * @private
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized camelCase string
   */
  capitalize(str) {
    // Special mappings for phase names to method names
    const phaseToMethodMap = {
      'initialization': 'Initialize',
      'validation': 'Validation',
      'preparation': 'Prepare',
      'deployment': 'Deploy',
      'verification': 'Verify',
      'monitoring': 'Monitor'
    };

    if (phaseToMethodMap[str]) {
      return phaseToMethodMap[str];
    }

    // Generic camelCase converter for extensibility
    return str
      .split('-')
      .map((word, idx) => 
        idx === 0 
          ? word.charAt(0).toUpperCase() + word.slice(1)
          : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');
  }

  /**
   * Phase lifecycle methods (to be implemented by subclasses)
   * Each phase must be implemented in concrete orchestrator
   */

  /**
   * Initialization phase
   * Setup and validate deployment environment
   * 
   * @abstract
   * @returns {Promise<Object>} Initialization result
   */
  async onInitialize() {
    throw new Error(
      `onInitialize() must be implemented in ${this.constructor.name}`
    );
  }

  /**
   * Validation phase
   * Validate all prerequisites and configurations
   * 
   * @abstract
   * @returns {Promise<Object>} Validation result
   */
  async onValidation() {
    throw new Error(
      `onValidation() must be implemented in ${this.constructor.name}`
    );
  }

  /**
   * Preparation phase
   * Prepare resources and deployment artifacts
   * 
   * @abstract
   * @returns {Promise<Object>} Preparation result
   */
  async onPrepare() {
    throw new Error(
      `onPrepare() must be implemented in ${this.constructor.name}`
    );
  }

  /**
   * Deployment phase
   * Execute actual deployment operations
   * 
   * @abstract
   * @returns {Promise<Object>} Deployment result
   */
  async onDeploy() {
    throw new Error(
      `onDeploy() must be implemented in ${this.constructor.name}`
    );
  }

  /**
   * Verification phase
   * Verify deployment success and health
   * 
   * @abstract
   * @returns {Promise<Object>} Verification result
   */
  async onVerify() {
    throw new Error(
      `onVerify() must be implemented in ${this.constructor.name}`
    );
  }

  /**
   * Monitoring phase
   * Setup monitoring and alerting for deployed service
   * 
   * @abstract
   * @returns {Promise<Object>} Monitoring result
   */
  async onMonitor() {
    throw new Error(
      `onMonitor() must be implemented in ${this.constructor.name}`
    );
  }

  /**
   * Static helper to get deployment phases
   * @static
   * @returns {Object} Phase constants
   */
  static getPhases() {
    return { ...DEPLOYMENT_PHASES };
  }

  /**
   * Static helper to get phase sequence
   * @static
   * @returns {string[]} Ordered phase names
   */
  static getPhaseSequence() {
    return [...PHASE_SEQUENCE];
  }

  /**
   * Static helper to validate phase name
   * @static
   * @param {string} phase - Phase to validate
   * @returns {boolean} True if valid phase
   */
  static isValidPhase(phase) {
    return PHASE_SEQUENCE.includes(phase);
  }
}

export default BaseDeploymentOrchestrator;
export { DEPLOYMENT_PHASES, PHASE_SEQUENCE };

