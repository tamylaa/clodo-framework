// Orchestration Module
// Enterprise-grade deployment orchestration and coordination

export { MultiDomainOrchestrator } from './multi-domain-orchestrator.js';

// NOTE: CrossDomainCoordinator has unresolved phantom dependencies:
// - DeploymentValidator (doesn't exist in src/)
// - DomainDiscovery (doesn't exist in src/)
// - DeploymentAuditor (doesn't exist in src/)
// - ProductionTester (doesn't exist in src/)
// It requires these enterprise modules from lib/, but lib modules are not
// compiled into dist/ for npm distribution. This is a known limitation.
// For now, the coordinator is not exported. Consider refactoring to use
// only available modules or marking it as enterprise-only.
