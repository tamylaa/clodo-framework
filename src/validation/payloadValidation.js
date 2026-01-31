import { z } from 'zod';

const ServicePayloadSchema = z.object({
  serviceName: z.string().min(3).max(50).regex(/^[a-z0-9\-]+$/),
  serviceType: z.string().min(1),
  domain: z.string().min(3),
  description: z.string().optional(),
  template: z.string().optional(),
  features: z.array(z.string()).optional(),
  bindings: z.array(z.string()).optional(),
  resources: z.record(z.any()).optional(),
  specs: z.record(z.any()).optional(),
  clodo: z.record(z.any()).optional()
});

export function validateServicePayload(payload) {
  const result = { valid: true, errors: [], warnings: [] };
  try {
    ServicePayloadSchema.parse(payload);
  } catch (err) {
    result.valid = false;
    if (err.errors && Array.isArray(err.errors)) {
      for (const e of err.errors) {
        result.errors.push({ field: e.path.join('.'), message: e.message });
      }
    } else {
      result.errors.push({ message: err.message });
    }
  }
  return result;
}
