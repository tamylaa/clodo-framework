/**
 * Orchestrator Subclasses Test Suite
 * 
 * Comprehensive tests for SingleServiceOrchestrator, PortfolioOrchestrator, and EnterpriseOrchestrator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SingleServiceOrchestrator } from '../../lib/deployment/orchestration/SingleServiceOrchestrator.js';
import { PortfolioOrchestrator } from '../../lib/deployment/orchestration/PortfolioOrchestrator.js';
import { EnterpriseOrchestrator } from '../../lib/deployment/orchestration/EnterpriseOrchestrator.js';

describe('Orchestrator Subclasses', () => {
  describe('SingleServiceOrchestrator', () => {
    let orchestrator;

    beforeEach(() => {
      orchestrator = new SingleServiceOrchestrator({
        deploymentId: 'single-deploy-001',
        config: {
          domain: 'example.com',
          environment: 'production'
        }
      });
    });

    it('should initialize with correct type', () => {
      expect(orchestrator.orchestratorType).toBe('single-service');
    });

    it('should complete full deployment pipeline', async () => {
      const result = await orchestrator.execute();

      expect(result.stats.completed).toBe(6);
      expect(result.stats.failed).toBe(0);
      expect(result.stats.successRate).toBe(100);
    });

    it('should initialize service environment', async () => {
      await orchestrator.execute();

      const initResult = orchestrator.getPhaseResult('initialization');
      expect(initResult.result.status).toBe('initialized');
      expect(initResult.result.service).toBe('example.com');
      expect(initResult.result.features).toContain('modular-deployment');
    });

    it('should validate service prerequisites', async () => {
      await orchestrator.execute();

      const valResult = orchestrator.getPhaseResult('validation');
      expect(valResult.result.status).toBe('validated');
      expect(valResult.result.allChecksPassed).toBe(true);
    });

    it('should prepare service resources', async () => {
      await orchestrator.execute();

      const prepResult = orchestrator.getPhaseResult('preparation');
      expect(prepResult.result.status).toBe('prepared');
      expect(prepResult.result.readyForDeployment).toBe(true);
      expect(prepResult.result.resources).toBeDefined();
    });

    it('should deploy service', async () => {
      await orchestrator.execute();

      const deployResult = orchestrator.getPhaseResult('deployment');
      expect(deployResult.result.status).toBe('deployed');
      expect(deployResult.result.url).toContain('example.com');
    });

    it('should verify deployment', async () => {
      await orchestrator.execute();

      const verifyResult = orchestrator.getPhaseResult('verification');
      expect(verifyResult.result.status).toBe('verified');
      expect(verifyResult.result.healthCheck).toBe('passed');
    });

    it('should setup monitoring', async () => {
      await orchestrator.execute();

      const monResult = orchestrator.getPhaseResult('monitoring');
      expect(monResult.result.status).toBe('monitoring_enabled');
      expect(monResult.result.alerts.length).toBeGreaterThan(0);
    });

    it('should provide correct metadata', () => {
      const metadata = orchestrator.getMetadata();

      expect(metadata.type).toBe('single-service');
      expect(metadata.deploymentType).toBe('single-service');
      expect(metadata.capabilities).toContain('modular-deployment');
      expect(metadata.capabilities).toContain('lightweight');
    });

    it('should have fast deployment time', () => {
      const metadata = orchestrator.getMetadata();
      expect(metadata.averageDeploymentTime).toContain('2-5 minutes');
    });
  });

  describe('PortfolioOrchestrator', () => {
    let orchestrator;

    beforeEach(() => {
      orchestrator = new PortfolioOrchestrator({
        deploymentId: 'portfolio-deploy-001',
        config: {
          domains: ['service1.com', 'service2.com', 'service3.com'],
          environment: 'production'
        }
      });
    });

    it('should initialize with correct type', () => {
      expect(orchestrator.orchestratorType).toBe('portfolio');
    });

    it('should track multiple domains', () => {
      expect(orchestrator.domains.length).toBe(3);
      expect(orchestrator.domains).toContain('service1.com');
    });

    it('should complete full deployment pipeline', async () => {
      const result = await orchestrator.execute();

      expect(result.stats.completed).toBe(6);
      expect(result.stats.failed).toBe(0);
      expect(result.stats.successRate).toBe(100);
    });

    it('should initialize portfolio environment', async () => {
      await orchestrator.execute();

      const initResult = orchestrator.getPhaseResult('initialization');
      expect(initResult.result.status).toBe('initialized');
      expect(initResult.result.totalServices).toBe(3);
      expect(initResult.result.features).toContain('multi-service');
      expect(initResult.result.features).toContain('portfolio');
    });

    it('should validate all services', async () => {
      await orchestrator.execute();

      const valResult = orchestrator.getPhaseResult('validation');
      expect(valResult.result.status).toBe('validated');
      expect(valResult.result.allChecksPassed).toBe(true);
      expect(Object.keys(valResult.result.checks).length).toBe(3);
    });

    it('should prepare resources for all services', async () => {
      await orchestrator.execute();

      const prepResult = orchestrator.getPhaseResult('preparation');
      expect(prepResult.result.status).toBe('prepared');
      expect(prepResult.result.resources.services).toBeDefined();
      expect(Object.keys(prepResult.result.resources.services).length).toBe(3);
    });

    it('should deploy all services', async () => {
      await orchestrator.execute();

      const deployResult = orchestrator.getPhaseResult('deployment');
      expect(deployResult.result.status).toBe('deployed');
      expect(deployResult.result.deployedServices).toBe(3);
    });

    it('should verify all deployments', async () => {
      await orchestrator.execute();

      const verifyResult = orchestrator.getPhaseResult('verification');
      expect(verifyResult.result.status).toBe('verified');
      expect(verifyResult.result.verifiedServices).toBe(3);
      expect(verifyResult.result.portfolioHealth).toBe('healthy');
    });

    it('should setup portfolio monitoring', async () => {
      await orchestrator.execute();

      const monResult = orchestrator.getPhaseResult('monitoring');
      expect(monResult.result.status).toBe('monitoring_enabled');
      expect(monResult.result.portfolioAlerts.length).toBeGreaterThan(0);
      expect(monResult.result.dashboards).toContain('portfolio-overview');
    });

    it('should provide deployment status', async () => {
      await orchestrator.execute();

      const status = orchestrator.getDeploymentStatus();
      expect(status['service1.com']).toBe('verified');
      expect(status['service2.com']).toBe('verified');
      expect(status['service3.com']).toBe('verified');
    });

    it('should provide correct metadata', () => {
      const metadata = orchestrator.getMetadata();

      expect(metadata.type).toBe('portfolio');
      expect(metadata.deploymentType).toBe('multi-service-portfolio');
      expect(metadata.capabilities).toContain('coordinated-deployment');
      expect(metadata.capabilities).toContain('parallel-deployment');
      expect(metadata.specialFeatures).toContain('centralized-logging');
    });

    it('should have longer deployment time than single service', () => {
      const metadata = orchestrator.getMetadata();
      expect(metadata.averageDeploymentTime).toContain('5-10 minutes');
    });
  });

  describe('EnterpriseOrchestrator', () => {
    it('should throw error for enterprise features in basic package', () => {
      expect(() => {
        new EnterpriseOrchestrator({
          deploymentId: 'enterprise-deploy-001',
          config: {
            domain: 'enterprise.com',
            environment: 'production'
          }
        });
      }).toThrow('Enterprise deployment features are not available in the basic clodo-framework package');
    });

    it('should throw error when accessed without enterprise package', () => {
      expect(() => {
        new EnterpriseOrchestrator();
      }).toThrow(/enterprise package/);
    });
  });

  describe('Orchestrator Comparison', () => {
    it('should handle different deployment types', async () => {
      const single = new SingleServiceOrchestrator({
        config: { domain: 'single.com', environment: 'production' }
      });
      const portfolio = new PortfolioOrchestrator({
        config: { domains: ['a.com', 'b.com'], environment: 'production' }
      });

      const singleResult = await single.execute();
      const portfolioResult = await portfolio.execute();

      expect(singleResult.stats.completed).toBe(6);
      expect(portfolioResult.stats.completed).toBe(6);
    });

    it('should have different metadata', () => {
      const single = new SingleServiceOrchestrator();
      const portfolio = new PortfolioOrchestrator();

      const singleMeta = single.getMetadata();
      const portfolioMeta = portfolio.getMetadata();

      expect(singleMeta.type).toBe('single-service');
      expect(portfolioMeta.type).toBe('portfolio');

      expect(singleMeta.capabilities.length).toBeLessThan(portfolioMeta.capabilities.length);
    });

    it('should follow same phase pipeline', async () => {
      const orchestrators = [
        new SingleServiceOrchestrator({ config: { domain: 'a.com' } }),
        new PortfolioOrchestrator({ config: { domains: ['a.com'] } })
      ];

      for (const orch of orchestrators) {
        const result = await orch.execute();
        expect(result.phases).toBeDefined();
        expect(Object.keys(result.phases)).toContain('initialization');
        expect(Object.keys(result.phases)).toContain('validation');
        expect(Object.keys(result.phases)).toContain('preparation');
        expect(Object.keys(result.phases)).toContain('deployment');
        expect(Object.keys(result.phases)).toContain('verification');
        expect(Object.keys(result.phases)).toContain('monitoring');
      }
    });

    it('should throw error for enterprise orchestrator in basic package', () => {
      expect(() => {
        new EnterpriseOrchestrator({ config: { domain: 'ent.com' } });
      }).toThrow('Enterprise deployment features are not available in the basic clodo-framework package');
    });
  });
});
