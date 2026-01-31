import { z } from 'zod';

// Allowed enums
import { getConfig } from '../config/service-schema-config.js';

export const VALID_SERVICE_TYPES = () => getConfig().serviceTypes;
export const VALID_FEATURES = () => getConfig().features;

// Zod schema with refined validations
export const ServicePayloadSchema = z.object({
  serviceName: z.string().min(3).max(50).regex(/^[a-z0-9\-]+$/, 'serviceName must be lowercase letters, numbers and hyphens only'),
  serviceType: z.string().refine(v => VALID_SERVICE_TYPES().includes(v), { message: `Invalid serviceType. Expected one of: ${VALID_SERVICE_TYPES().join(', ')}` }),
  domain: z.string().min(3).regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, 'domain must be a valid domain name'),
  description: z.string().optional(),
  template: z.string().optional(),
  features: z.array(z.string().refine(v => VALID_FEATURES().includes(v), { message: `Invalid feature. Expected one of: ${VALID_FEATURES().join(', ')}` })).optional(),
  bindings: z.array(z.string()).optional(),
  resources: z.record(z.any()).optional(),
  specs: z.record(z.any()).optional(),
  clodo: z.record(z.any()).optional()
});

export function validateServicePayload(payload) {
  const result = { valid: true, errors: [], warnings: [] };
  try {
    ServicePayloadSchema.parse(payload);

    // Additional semantic checks
    if (payload.features && Array.isArray(payload.features)) {
      const duplicates = payload.features.filter((v, i, a) => a.indexOf(v) !== i);
      if (duplicates.length) {
        result.warnings.push({ field: 'features', code: 'DUPLICATE_FEATURES', message: `Duplicate features: ${[...new Set(duplicates)].join(', ')}` });
      }

      // Check for unknown features if config changed at runtime
      const configured = VALID_FEATURES();
      const unknown = payload.features.filter(f => !configured.includes(f));
      if (unknown.length) {
        result.warnings.push({ field: 'features', code: 'UNKNOWN_FEATURES', message: `Unknown features: ${[...new Set(unknown)].join(', ')}` });
      }
    }

  } catch (err) {
    result.valid = false;

    // Handle Zod-like errors with an errors array
    if (err && err.errors && Array.isArray(err.errors)) {
      for (const e of err.errors) {
        result.errors.push({ field: (e.path || []).join('.'), code: 'SCHEMA_VALIDATION', message: e.message });
      }
    }
    // Some environments stringify Zod errors into err.message (JSON array) - try to parse
    else if (typeof err?.message === 'string' && err.message.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(err.message);
        if (Array.isArray(parsed)) {
          for (const e of parsed) {
            const field = (e.path || []).join('.');
            const msg = e.message || JSON.stringify(e);
            result.errors.push({ field, code: 'SCHEMA_VALIDATION', message: msg });
          }
        } else {
          result.errors.push({ code: 'UNKNOWN', message: err.message });
        }
      } catch (parseErr) {
        result.errors.push({ code: 'UNKNOWN', message: err.message });
      }
    } else {
      result.errors.push({ code: 'UNKNOWN', message: err.message });
    }
  }
  return result;
}

// Parameter metadata for discovery (derived from schema)
export function getParameterDefinitions() {
  return {
    serviceName: {
      name: 'serviceName',
      type: 'string',
      required: true,
      description: 'Unique identifier for the service',
      validationRules: [
        { rule: 'pattern', value: '^[a-z0-9-]+$', message: 'Lowercase letters, numbers and hyphens only' },
        { rule: 'minLength', value: 3, message: 'At least 3 characters' },
        { rule: 'maxLength', value: 50, message: 'At most 50 characters' }
      ]
    },
    serviceType: {
      name: 'serviceType',
      type: 'string',
      required: true,
      description: 'Type of service to create',
      enum: VALID_SERVICE_TYPES()
    },
    domain: {
      name: 'domain',
      type: 'string',
      required: true,
      description: 'Domain for the service',
      validationRules: [ { rule: 'pattern', value: '^([a-z0-9]+(-[a-z0-9]+)*\\.)+[a-z]{2,}$', message: 'Must be a valid domain' } ]
    },
    features: {
      name: 'features',
      type: 'array',
      required: false,
      description: 'Features to enable',
      enum: VALID_FEATURES
    },
    clodo: {
      name: 'clodo',
      type: 'object',
      required: false,
      description: 'Passthrough data for clodo-application specific configuration'
    }
  };
}
