import { MultiDomainOrchestrator } from '../orchestration/multi-domain-orchestrator.js';

export async function deployServiceProgrammatic(options = {}) {
  return await MultiDomainOrchestrator.deploy(options);
}

export const deployService = deployServiceProgrammatic; // Backwards-compatible alias