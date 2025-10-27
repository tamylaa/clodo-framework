/**
 * BaseDeploymentOrchestrator Test Suite
 * 
 * Comprehensive tests for abstract deployment orchestration base class.
 * Tests phase pipeline, state management, error handling, and lifecycle.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BaseDeploymentOrchestrator, DEPLOYMENT_PHASES, PHASE_SEQUENCE } from '../../bin/deployment/orchestration/BaseDeploymentOrchestrator.js';

/**
 * Concrete test implementation of BaseDeploymentOrchestrator
 * Used for testing abstract base class functionality
 */
class TestDeploymentOrchestrator extends BaseDeploymentOrchestrator {
  constructor(options = {}) {
    super(options);
    this.phaseExecutionLog = [];
    this.simulateErrors = options.simulateErrors || {};
  }

  async onInitialize() {
    this.phaseExecutionLog.push('initialize');
    if (this.simulateErrors.initialization) {
      throw new Error('Initialization failed');
    }
    return { status: 'initialized', timestamp: new Date().toISOString() };
  }

  async onValidation() {
    this.phaseExecutionLog.push('validation');
    if (this.simulateErrors.validation) {
      throw new Error('Validation failed');
    }
    return { status: 'validated', checks: ['auth', 'config', 'resources'] };
  }

  async onPrepare() {
    this.phaseExecutionLog.push('preparation');
    if (this.simulateErrors.preparation) {
      throw new Error('Preparation failed');
    }
    return { status: 'prepared', resources: ['worker', 'database', 'secrets'] };
  }

  async onDeploy() {
    this.phaseExecutionLog.push('deployment');
    if (this.simulateErrors.deployment) {
      throw new Error('Deployment failed');
    }
    return { status: 'deployed', version: '1.0.0', url: 'https://example.com' };
  }

  async onVerify() {
    this.phaseExecutionLog.push('verification');
    if (this.simulateErrors.verification) {
      throw new Error('Verification failed');
    }
    return { status: 'verified', healthCheck: 'passed' };
  }

  async onMonitor() {
    this.phaseExecutionLog.push('monitoring');
    if (this.simulateErrors.monitoring) {
      throw new Error('Monitoring setup failed');
    }
    return { status: 'monitoring_enabled', alerts: ['error_rate', 'latency'] };
  }
}

describe('BaseDeploymentOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new TestDeploymentOrchestrator({
      deploymentId: 'test-deploy-001',
      config: {
        domain: 'example.com',
        environment: 'production'
      }
    });
  });

  describe('Constructor & Initialization', () => {
    it('should initialize with deployment ID', () => {
      expect(orchestrator.deploymentId).toBe('test-deploy-001');
    });

    it('should initialize with configuration', () => {
      expect(orchestrator.config.domain).toBe('example.com');
      expect(orchestrator.config.environment).toBe('production');
    });

    it('should generate deployment ID if not provided', () => {
      const orch = new TestDeploymentOrchestrator();
      expect(orch.deploymentId).toMatch(/^deploy-\d+$/);
    });

    it('should initialize phase state maps', () => {
      expect(orchestrator.phaseStates).toBeInstanceOf(Map);
      expect(orchestrator.phaseResults).toBeInstanceOf(Map);
      expect(orchestrator.phaseErrors).toBeInstanceOf(Map);
      expect(orchestrator.phaseTimings).toBeInstanceOf(Map);
    });

    it('should initialize execution context', () => {
      expect(orchestrator.executionContext).toHaveProperty('deploymentId');
      expect(orchestrator.executionContext).toHaveProperty('startTime');
      expect(orchestrator.executionContext).toHaveProperty('phases');
      expect(orchestrator.executionContext).toHaveProperty('errors');
    });
  });

  describe('Phase Pipeline Execution', () => {
    it('should execute all phases in sequence', async () => {
      const result = await orchestrator.execute();
      
      expect(orchestrator.phaseExecutionLog).toEqual([
        'initialize',
        'validation',
        'preparation',
        'deployment',
        'verification',
        'monitoring'
      ]);
    });

    it('should track phase completion', async () => {
      await orchestrator.execute();

      for (const phase of PHASE_SEQUENCE) {
        expect(orchestrator.getPhaseStatus(phase)).toBe('complete');
      }
    });

    it('should record phase results', async () => {
      await orchestrator.execute();

      const results = orchestrator.getPhaseResults();
      expect(results.size).toBe(6);
      expect(results.has('initialization')).toBe(true);
      expect(results.has('deployment')).toBe(true);
    });

    it('should record phase timings', async () => {
      await orchestrator.execute();

      const timings = orchestrator.phaseTimings;
      expect(timings.size).toBe(6);
      
      for (const phase of PHASE_SEQUENCE) {
        const duration = timings.get(phase);
        expect(typeof duration).toBe('number');
        expect(duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should calculate total execution time', async () => {
      const startTime = Date.now();
      await orchestrator.execute();
      const duration = orchestrator.getExecutionTime();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(Date.now() - startTime + 100);
    });
  });

  describe('Error Handling', () => {
    it('should capture phase errors', async () => {
      const orch = new TestDeploymentOrchestrator({
        deploymentId: 'test-error-001',
        simulateErrors: { validation: true }
      });

      try {
        await orch.execute();
      } catch (error) {
        // Expected
      }

      const error = orch.phaseErrors.get('validation');
      expect(error).toBeDefined();
      expect(error.message).toContain('Validation failed');
    });

    it('should stop on critical phase failure', async () => {
      const orch = new TestDeploymentOrchestrator({
        simulateErrors: { deployment: true }
      });

      await expect(orch.execute()).rejects.toThrow();
      
      // Deployment is critical, so verification should not execute
      expect(orch.phaseExecutionLog).not.toContain('verification');
    });

    it('should continue on non-critical phase failure with option', async () => {
      const orch = new TestDeploymentOrchestrator({
        simulateErrors: { monitoring: true }
      });

      const result = await orch.execute({ continueOnError: true });
      
      expect(orch.phaseExecutionLog).toContain('monitoring');
      expect(result.stats.failed).toBe(1);
    });

    it('should track error in phase errors map', async () => {
      const orch = new TestDeploymentOrchestrator({
        simulateErrors: { validation: true }
      });

      try {
        await orch.execute();
      } catch (error) {
        // Expected
      }

      const errors = new Map(orch.phaseErrors);
      expect(errors.size).toBeGreaterThan(0);
    });
  });

  describe('Phase State Management', () => {
    it('should track phase state transitions', async () => {
      const orch = new TestDeploymentOrchestrator();

      // Initial state
      expect(orch.getPhaseStatus('initialization')).toBe('pending');

      // After execution
      await orch.execute();
      expect(orch.getPhaseStatus('initialization')).toBe('complete');
    });

    it('should provide phase-specific results', async () => {
      await orchestrator.execute();

      const deploymentResult = orchestrator.getPhaseResult('deployment');
      expect(deploymentResult).toBeDefined();
      expect(deploymentResult.result.status).toBe('deployed');
      expect(deploymentResult.result.url).toBe('https://example.com');
    });

    it('should return null for unexecuted phases', async () => {
      const orch = new TestDeploymentOrchestrator();
      const result = orch.getPhaseResult('deployment');
      
      expect(result).toBeNull();
    });
  });

  describe('Execution Summary', () => {
    it('should generate execution summary after completion', async () => {
      await orchestrator.execute();
      
      const summary = orchestrator.generateExecutionSummary();
      
      expect(summary).toHaveProperty('deploymentId');
      expect(summary).toHaveProperty('orchestrator');
      expect(summary).toHaveProperty('totalDuration');
      expect(summary).toHaveProperty('phases');
      expect(summary).toHaveProperty('stats');
    });

    it('should include phase details in summary', async () => {
      await orchestrator.execute();
      
      const summary = orchestrator.generateExecutionSummary();
      
      for (const phase of PHASE_SEQUENCE) {
        expect(summary.phases).toHaveProperty(phase);
        expect(summary.phases[phase]).toHaveProperty('state');
        expect(summary.phases[phase]).toHaveProperty('duration');
      }
    });

    it('should calculate success rate', async () => {
      await orchestrator.execute();
      
      const summary = orchestrator.generateExecutionSummary();
      
      expect(summary.stats.completed).toBe(6);
      expect(summary.stats.failed).toBe(0);
      expect(summary.stats.successRate).toBe(100);
    });

    it('should track failed phases in summary', async () => {
      const orch = new TestDeploymentOrchestrator({
        simulateErrors: { validation: true }
      });

      try {
        await orch.execute();
      } catch (error) {
        // Expected
      }

      const summary = orch.generateExecutionSummary();
      expect(summary.stats.failed).toBeGreaterThan(0);
    });
  });

  describe('Critical Phase Detection', () => {
    it('should identify initialization as critical', () => {
      expect(orchestrator.isCriticalPhase('initialization')).toBe(true);
    });

    it('should identify deployment as critical', () => {
      expect(orchestrator.isCriticalPhase('deployment')).toBe(true);
    });

    it('should identify monitoring as non-critical', () => {
      expect(orchestrator.isCriticalPhase('monitoring')).toBe(false);
    });

    it('should identify verification as non-critical', () => {
      expect(orchestrator.isCriticalPhase('verification')).toBe(false);
    });
  });

  describe('Execution Context', () => {
    it('should provide complete execution context', async () => {
      await orchestrator.execute();
      
      const context = orchestrator.getExecutionContext();
      
      expect(context).toHaveProperty('currentPhase');
      expect(context).toHaveProperty('phaseStates');
      expect(context).toHaveProperty('phaseTimings');
      expect(context).toHaveProperty('totalDuration');
    });

    it('should track current phase in context', async () => {
      await orchestrator.execute();
      
      const context = orchestrator.getExecutionContext();
      
      // After execution, should be monitoring
      expect(context.currentPhase).toBe('monitoring');
    });
  });

  describe('Static Helper Methods', () => {
    it('should provide phase constants', () => {
      const phases = BaseDeploymentOrchestrator.getPhases();
      
      expect(phases).toHaveProperty('INITIALIZATION');
      expect(phases).toHaveProperty('VALIDATION');
      expect(phases).toHaveProperty('DEPLOYMENT');
      expect(phases.INITIALIZATION).toBe('initialization');
    });

    it('should provide phase sequence', () => {
      const sequence = BaseDeploymentOrchestrator.getPhaseSequence();
      
      expect(Array.isArray(sequence)).toBe(true);
      expect(sequence.length).toBe(6);
      expect(sequence[0]).toBe('initialization');
      expect(sequence[sequence.length - 1]).toBe('monitoring');
    });

    it('should validate phase names', () => {
      expect(BaseDeploymentOrchestrator.isValidPhase('initialization')).toBe(true);
      expect(BaseDeploymentOrchestrator.isValidPhase('deployment')).toBe(true);
      expect(BaseDeploymentOrchestrator.isValidPhase('invalid-phase')).toBe(false);
    });
  });

  describe('Abstract Method Enforcement', () => {
    it('should require phase method implementation', async () => {
      class IncompleteOrchestrator extends BaseDeploymentOrchestrator {
        // Missing all phase methods
      }

      const orch = new IncompleteOrchestrator();

      await expect(orch.execute()).rejects.toThrow(
        /must be implemented/
      );
    });

    it('should call correct method name for phase', async () => {
      const orch = new TestDeploymentOrchestrator();
      const onInitializeSpy = jest.spyOn(orch, 'onInitialize');

      await orch.execute();

      expect(onInitializeSpy).toHaveBeenCalled();
    });
  });

  describe('String Capitalization Helper', () => {
    it('should capitalize phase names correctly', () => {
      expect(orchestrator.capitalize('initialization')).toBe('Initialize');
      expect(orchestrator.capitalize('validation')).toBe('Validation');
      expect(orchestrator.capitalize('preparation')).toBe('Prepare');
      expect(orchestrator.capitalize('deployment')).toBe('Deploy');
    });

    it('should handle hyphenated phase names', () => {
      // Although current phases don't have hyphens, testing for extensibility
      expect(orchestrator.capitalize('multi-phase')).toBe('MultiPhase');
    });
  });

  describe('Phase Method Results', () => {
    it('should store phase method return values', async () => {
      await orchestrator.execute();

      const initResult = orchestrator.getPhaseResult('initialization');
      expect(initResult).toBeDefined();
      expect(initResult.result.status).toBe('initialized');
      expect(initResult.result.timestamp).toBeDefined();
    });

    it('should provide different results for each phase', async () => {
      await orchestrator.execute();

      const deployResult = orchestrator.getPhaseResult('deployment');
      const verifyResult = orchestrator.getPhaseResult('verification');

      expect(deployResult.result.status).toBe('deployed');
      expect(verifyResult.result.status).toBe('verified');
      expect(deployResult).not.toEqual(verifyResult);
    });
  });

  describe('Auditor Integration', () => {
    it('should log phases to auditor if provided', async () => {
      const mockAuditor = {
        logPhase: jest.fn(),
        logError: jest.fn()
      };

      const orch = new TestDeploymentOrchestrator({
        auditor: mockAuditor
      });

      await orch.execute();

      expect(mockAuditor.logPhase).toHaveBeenCalled();
      expect(mockAuditor.logPhase.mock.calls.length).toBeGreaterThan(0);
    });

    it('should log errors to auditor', async () => {
      const mockAuditor = {
        logPhase: jest.fn(),
        logError: jest.fn()
      };

      const orch = new TestDeploymentOrchestrator({
        auditor: mockAuditor,
        simulateErrors: { validation: true }
      });

      try {
        await orch.execute();
      } catch (error) {
        // Expected
      }

      expect(mockAuditor.logError).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty config gracefully', async () => {
      const orch = new TestDeploymentOrchestrator({
        config: {}
      });

      const result = await orch.execute();
      expect(result).toBeDefined();
      expect(result.stats.completed).toBe(6);
    });

    it('should handle rapid sequential executions', async () => {
      const orch = new TestDeploymentOrchestrator();

      const result1 = await orch.execute();
      expect(result1.stats.completed).toBe(6);

      // Create new orchestrator for second execution
      const orch2 = new TestDeploymentOrchestrator();
      const result2 = await orch2.execute();
      expect(result2.stats.completed).toBe(6);
    });

    it('should maintain state consistency across errors', async () => {
      const orch = new TestDeploymentOrchestrator({
        simulateErrors: { validation: true }
      });

      try {
        await orch.execute();
      } catch (error) {
        // Expected
      }

      // Verify state consistency
      expect(orch.phaseErrors.has('validation')).toBe(true);
      expect(orch.phaseStates.has('validation')).toBe(true);
      expect(orch.phaseStates.get('validation')).toBe('error');
    });
  });

  describe('Performance Metrics', () => {
    it('should track individual phase timings', async () => {
      await orchestrator.execute();

      for (const phase of PHASE_SEQUENCE) {
        const timing = orchestrator.phaseTimings.get(phase);
        expect(typeof timing).toBe('number');
        expect(timing).toBeGreaterThanOrEqual(0);
      }
    });

    it('should calculate total duration', async () => {
      await orchestrator.execute();

      const totalDuration = orchestrator.getExecutionTime();
      let sumOfPhases = 0;

      for (const timing of orchestrator.phaseTimings.values()) {
        sumOfPhases += timing;
      }

      // Total should be >= sum of phases
      expect(totalDuration).toBeGreaterThanOrEqual(sumOfPhases);
    });
  });
});
