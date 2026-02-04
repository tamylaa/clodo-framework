import { ServiceOrchestrator } from '../service-management/ServiceOrchestrator.js';

export async function validateServiceProgrammatic(servicePath = '.', options = {}) {
  return await ServiceOrchestrator.validate(servicePath, options);
}

export const validateService = validateServiceProgrammatic; // Backwards-compatible alias