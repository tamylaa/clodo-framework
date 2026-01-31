import { ServiceOrchestrator } from '../service-management/ServiceOrchestrator.js';

export async function createServiceProgrammatic(payload, options = {}) {
  const orchestrator = new ServiceOrchestrator({ interactive: false, outputPath: options.outputDir || '.' });
  return await orchestrator.createService(payload, options);
}

export const createService = createServiceProgrammatic; // Backwards-compatible alias
