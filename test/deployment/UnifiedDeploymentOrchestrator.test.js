/**
 * UnifiedDeploymentOrchestrator Integration Tests - Phase 3.3.5e
 * 
 * Tests that verify the unified orchestration layer combines all capabilities
 * from all 3 deployment systems without compromising functionality.
 */

import { UnifiedDeploymentOrchestrator, CAPABILITY_DEFINITIONS } from '../../bin/deployment/orchestration/UnifiedDeploymentOrchestrator.js';

describe('Phase 3.3.5e: Unified Deployment Orchestration', () => {
  
  describe('Capability System', () => {
    
    it('should expose all capability definitions', () => {
      expect(CAPABILITY_DEFINITIONS).toBeDefined();
      expect(Object.keys(CAPABILITY_DEFINITIONS).length).toBeGreaterThan(0);
    });

    it('should define core capability groups', () => {
      const capabilities = CAPABILITY_DEFINITIONS;
      
      // Deployment capabilities
      expect(capabilities.SINGLE_DEPLOY).toBeDefined();
      expect(capabilities.MULTI_DEPLOY).toBeDefined();
      expect(capabilities.PORTFOLIO_DEPLOY).toBeDefined();
      
      // Validation capabilities
      expect(capabilities.BASIC_VALIDATION).toBeDefined();
      expect(capabilities.STANDARD_VALIDATION).toBeDefined();
      expect(capabilities.COMPREHENSIVE_VALIDATION).toBeDefined();
      
      // Testing capabilities
      expect(capabilities.HEALTH_CHECK).toBeDefined();
      expect(capabilities.ENDPOINT_TESTING).toBeDefined();
      expect(capabilities.INTEGRATION_TESTING).toBeDefined();
    });

  });

  describe('Unified Orchestrator Initialization', () => {
    
    it('should create unified orchestrator with default config', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      expect(orchestrator).toBeDefined();
      expect(orchestrator.orchestratorType).toBe('unified');
      expect(orchestrator.version).toBe('1.0.0');
    });

    it('should register all capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      const availableCapabilities = orchestrator.availableCapabilities.size;
      expect(availableCapabilities).toBeGreaterThan(15);
    });

    it('should initialize with specific capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator({
        capabilities: ['singleDeploy', 'standardValidation', 'healthCheck']
      });
      
      expect(orchestrator.hasCapability('singleDeploy')).toBe(true);
      expect(orchestrator.hasCapability('standardValidation')).toBe(true);
      expect(orchestrator.hasCapability('healthCheck')).toBe(true);
      expect(orchestrator.hasCapability('disasterRecovery')).toBe(false);
    });

  });

  describe('Capability Management', () => {
    
    it('should enable capabilities dynamically', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      orchestrator.enableCapability('singleDeploy');
      orchestrator.enableCapability('multiDeploy');
      
      expect(orchestrator.hasCapability('singleDeploy')).toBe(true);
      expect(orchestrator.hasCapability('multiDeploy')).toBe(true);
    });

    it('should disable capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      orchestrator.enableCapability('singleDeploy');
      expect(orchestrator.hasCapability('singleDeploy')).toBe(true);
      
      orchestrator.disableCapability('singleDeploy');
      expect(orchestrator.hasCapability('singleDeploy')).toBe(false);
    });

    it('should chain capability operations', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator()
        .enableCapability('singleDeploy')
        .enableCapability('multiDeploy')
        .enableCapability('portfolioDeploy');
      
      expect(orchestrator.getEnabledCapabilities().length).toBe(3);
    });

    it('should get all enabled capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      orchestrator.enableCapability('singleDeploy');
      orchestrator.enableCapability('healthCheck');
      
      const enabled = orchestrator.getEnabledCapabilities();
      
      expect(enabled).toContain('singleDeploy');
      expect(enabled).toContain('healthCheck');
      expect(enabled.length).toBe(2);
    });

    it('should retrieve capability definitions', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      const definition = orchestrator.getCapabilityDefinition('singleDeploy');
      
      expect(definition).toBeDefined();
      expect(definition.name).toBe('singleDeploy');
      expect(definition.description).toBeDefined();
    });

  });

  describe('Deployment Mode Configuration', () => {
    
    it('should recommend capabilities for single mode', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      const recommended = orchestrator.getRecommendedCapabilities('single');
      
      expect(recommended).toContain('singleDeploy');
      expect(recommended).toContain('standardValidation');
      expect(recommended).toContain('healthCheck');
      expect(recommended).not.toContain('disasterRecovery');
    });

    it('should recommend capabilities for portfolio mode', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      const recommended = orchestrator.getRecommendedCapabilities('portfolio');
      
      expect(recommended).toContain('portfolioDeploy');
      expect(recommended).toContain('comprehensiveValidation');
      expect(recommended).toContain('secretCoordination');
      expect(recommended).not.toContain('disasterRecovery');
    });

    it('should recommend capabilities for enterprise mode', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      const recommended = orchestrator.getRecommendedCapabilities('enterprise');
      
      expect(recommended).toContain('portfolioDeploy');
      expect(recommended).toContain('highAvailability');
      expect(recommended).toContain('disasterRecovery');
      expect(recommended).toContain('complianceCheck');
    });

    it('should auto-configure capabilities by deployment mode', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      orchestrator.setDeploymentMode('enterprise', true);
      
      // Should have enterprise capabilities enabled
      expect(orchestrator.hasCapability('highAvailability')).toBe(true);
      expect(orchestrator.hasCapability('disasterRecovery')).toBe(true);
      expect(orchestrator.hasCapability('complianceCheck')).toBe(true);
    });

  });

  describe('Union of Capabilities - No Functionality Loss', () => {
    
    it('should combine single domain capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      const capabilities = [
        'singleDeploy',           // from SingleServiceOrchestrator
        'standardValidation',     // from all systems
        'healthCheck',            // from all systems
        'dbMigration',            // from all systems
        'secretGeneration',       // from all systems
        'auditLogging'            // from all systems
      ];
      
      capabilities.forEach(cap => orchestrator.enableCapability(cap));
      
      capabilities.forEach(cap => {
        expect(orchestrator.hasCapability(cap)).toBe(true);
      });
    });

    it('should combine portfolio capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      const capabilities = [
        'multiDeploy',            // from PortfolioOrchestrator
        'portfolioDeploy',        // from PortfolioOrchestrator
        'comprehensiveValidation',// from all systems
        'productionTesting',      // from all systems
        'secretCoordination',     // from PortfolioOrchestrator
        'dbMigration'             // from all systems
      ];
      
      capabilities.forEach(cap => orchestrator.enableCapability(cap));
      
      capabilities.forEach(cap => {
        expect(orchestrator.hasCapability(cap)).toBe(true);
      });
    });

    it('should combine enterprise capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      const capabilities = [
        'portfolioDeploy',        // from EnterpriseOrchestrator
        'comprehensiveValidation',// from all systems
        'multiRegionDb',          // from EnterpriseOrchestrator
        'highAvailability',       // from EnterpriseOrchestrator
        'disasterRecovery',       // from EnterpriseOrchestrator
        'complianceCheck',        // from EnterpriseOrchestrator
        'auditLogging',           // from all systems
        'rollback'                // from all systems
      ];
      
      capabilities.forEach(cap => orchestrator.enableCapability(cap));
      
      capabilities.forEach(cap => {
        expect(orchestrator.hasCapability(cap)).toBe(true);
      });
    });

  });

  describe('Capability System Validation', () => {
    
    it('should reject unknown capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      expect(() => {
        orchestrator.enableCapability('unknownCapability');
      }).toThrow('Unknown capability: unknownCapability');
    });

    it('should provide capability definition with system source', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      const singleDeploy = orchestrator.getCapabilityDefinition('singleDeploy');
      expect(singleDeploy.system).toBe('single');
      
      const portfolioDeploy = orchestrator.getCapabilityDefinition('portfolioDeploy');
      expect(portfolioDeploy.system).toBe('portfolio');
      
      const enterpriseDr = orchestrator.getCapabilityDefinition('disasterRecovery');
      expect(enterpriseDr.system).toBe('enterprise');
      
      const validation = orchestrator.getCapabilityDefinition('standardValidation');
      expect(validation.system).toBe('all');
    });

  });

  describe('Phase Execution with Unified Capabilities', () => {
    
    it('should initialize with all capabilities', async () => {
      const orchestrator = new UnifiedDeploymentOrchestrator({
        capabilities: ['singleDeploy', 'healthCheck', 'auditLogging']
      });
      
      await orchestrator.onInitialize();
      
      const results = orchestrator.phaseResults.get('initialize');
      expect(results.status).toBe('success');
      expect(results.capabilitiesCount).toBeGreaterThan(0);
    });

    it('should execute validation phase with enabled capabilities', async () => {
      const orchestrator = new UnifiedDeploymentOrchestrator({
        capabilities: ['basicValidation', 'standardValidation']
      });
      
      await orchestrator.onValidation();
      
      const results = orchestrator.phaseResults.get('validation');
      expect(results).toBeDefined();
    });

  });

  describe('Metadata and Reporting', () => {
    
    it('should provide unified metadata', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator({
        capabilities: ['singleDeploy', 'healthCheck', 'complianceCheck'],
        deploymentMode: 'enterprise'
      });
      
      orchestrator.setDeploymentMode('enterprise');
      const metadata = orchestrator.getMetadata();
      
      expect(metadata.orchestratorType).toBe('unified');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.deploymentMode).toBe('enterprise');
      expect(metadata.enabledCapabilities).toContain('singleDeploy');
      expect(metadata.capabilityCount).toBeGreaterThan(0);
    });

    it('should generate capability report', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      
      orchestrator.enableCapability('singleDeploy');
      orchestrator.enableCapability('healthCheck');
      
      const report = orchestrator.getCapabilityReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.orchestrator).toBe('unified');
      expect(report.totalAvailable).toBeGreaterThan(15);
      expect(report.totalEnabled).toBe(2);
      expect(report.capabilities).toBeDefined();
    });

  });

  describe('Union Set Properties - Real World Scenarios', () => {
    
    it('should support small service deployment with all single capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      orchestrator.setDeploymentMode('single', true);
      
      const capabilities = orchestrator.getEnabledCapabilities();
      
      // Should have single service capabilities
      expect(capabilities).toContain('singleDeploy');
      expect(capabilities).toContain('standardValidation');
      expect(capabilities).toContain('healthCheck');
    });

    it('should support portfolio deployment with multi-service capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      orchestrator.setDeploymentMode('portfolio', true);
      
      const capabilities = orchestrator.getEnabledCapabilities();
      
      // Should have portfolio capabilities
      expect(capabilities).toContain('portfolioDeploy');
      expect(capabilities).toContain('multiDeploy');
      expect(capabilities).toContain('secretCoordination');
    });

    it('should support enterprise deployment with all enterprise capabilities', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator();
      orchestrator.setDeploymentMode('enterprise', true);
      
      const capabilities = orchestrator.getEnabledCapabilities();
      
      // Should have enterprise capabilities
      expect(capabilities).toContain('highAvailability');
      expect(capabilities).toContain('disasterRecovery');
      expect(capabilities).toContain('complianceCheck');
      expect(capabilities).toContain('multiRegionDb');
    });

    it('should support custom capability combination', () => {
      const orchestrator = new UnifiedDeploymentOrchestrator({
        capabilities: [
          // From single system
          'singleDeploy',
          // From portfolio system
          'secretCoordination',
          // From enterprise system
          'disasterRecovery',
          // From all systems
          'comprehensiveValidation',
          'productionTesting',
          'auditLogging'
        ]
      });
      
      const capabilities = orchestrator.getEnabledCapabilities();
      
      // Verify all custom capabilities are enabled
      expect(capabilities).toContain('singleDeploy');
      expect(capabilities).toContain('secretCoordination');
      expect(capabilities).toContain('disasterRecovery');
      expect(capabilities).toContain('comprehensiveValidation');
      expect(capabilities).toContain('productionTesting');
      expect(capabilities).toContain('auditLogging');
      
      // Verify union set is preserved
      expect(capabilities.length).toBe(6);
    });

  });

});
