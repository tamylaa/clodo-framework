/**
 * Clodo Framework - Validation Module
 * Payload validation, parameter discovery, and config schema validation
 */

export { validateServicePayload, getAcceptedParameters, getParameterDefinitions } from './payloadValidation.js';

// Config schema validation
export { ConfigSchemaValidator } from './ConfigSchemaValidator.js';
export {
  CreateConfigSchema,
  DeployConfigSchema,
  ValidateConfigSchema,
  UpdateConfigSchema,
  CONFIG_SCHEMAS,
  getConfigSchema,
  getRegisteredConfigTypes
} from './configSchemas.js';