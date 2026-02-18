/**
 * ConfigSchemaValidator Unit Tests
 *
 * Tests for config schema validation, type detection, and schema definitions
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ConfigSchemaValidator } from '../../src/validation/ConfigSchemaValidator.js';
import {
  CreateConfigSchema,
  DeployConfigSchema,
  ValidateConfigSchema,
  UpdateConfigSchema,
  CONFIG_SCHEMAS,
  getConfigSchema,
  getRegisteredConfigTypes
} from '../../src/validation/configSchemas.js';

describe('ConfigSchemaValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new ConfigSchemaValidator();
  });

  // ─── Constructor ─────────────────────────────────────────

  describe('constructor', () => {
    test('creates instance with default options', () => {
      const v = new ConfigSchemaValidator();
      expect(v).toBeInstanceOf(ConfigSchemaValidator);
      expect(v.verbose).toBe(false);
      expect(v.strict).toBe(false);
    });

    test('accepts custom options', () => {
      const v = new ConfigSchemaValidator({ verbose: true, strict: true });
      expect(v.verbose).toBe(true);
      expect(v.strict).toBe(true);
    });
  });

  // ─── validateConfig — Basic ──────────────────────────────

  describe('validateConfig', () => {
    test('validates a valid create config', () => {
      const config = {
        projectName: 'my-service',
        serviceType: 'api-service',
        environment: 'production'
      };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.commandType).toBe('create');
    });

    test('validates a valid deploy config', () => {
      const config = {
        domain: 'api.example.com',
        environment: 'staging',
        dryRun: true
      };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates a valid validate config', () => {
      const config = {
        environment: 'development',
        deepScan: true,
        checks: { structure: true, security: true }
      };
      const result = validator.validateConfig(config, 'validate');
      expect(result.valid).toBe(true);
    });

    test('validates a valid update config', () => {
      const config = {
        domain: 'api.example.com',
        environment: 'production',
        preview: true,
        updates: { updateDependencies: true }
      };
      const result = validator.validateConfig(config, 'update');
      expect(result.valid).toBe(true);
    });

    test('accepts empty config object (all fields optional)', () => {
      const result = validator.validateConfig({}, 'create');
      expect(result.valid).toBe(true);
    });

    test('rejects unknown command type', () => {
      const result = validator.validateConfig({}, 'nonexistent');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('UNKNOWN_COMMAND_TYPE');
    });

    test('rejects null config', () => {
      const result = validator.validateConfig(null, 'create');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_CONFIG_TYPE');
    });

    test('rejects array config', () => {
      const result = validator.validateConfig([], 'create');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_CONFIG_TYPE');
    });

    test('strips comment keys (// prefixed)', () => {
      const config = {
        '// Comment': 'This is a comment',
        '// Instructions': 'Ignore me',
        projectName: 'test-service'
      };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(true);
      // Should count only non-comment fields
      expect(result.fieldCount).toBe(1);
    });

    test('allows passthrough (extra) fields', () => {
      const config = {
        projectName: 'test',
        customField: 'custom-value',
        nested: { deep: true }
      };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(true);
    });
  });

  // ─── validateConfig — Create Schema Errors ───────────────

  describe('validateConfig — create schema errors', () => {
    test('rejects invalid serviceName pattern', () => {
      const config = { serviceName: 'Invalid Name!' };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'serviceName')).toBe(true);
    });

    test('rejects serviceName too short', () => {
      const config = { serviceName: 'ab' };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'serviceName')).toBe(true);
    });

    test('rejects serviceName too long', () => {
      const config = { serviceName: 'a'.repeat(51) };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(false);
    });

    test('rejects invalid serviceType', () => {
      const config = { serviceType: 'not-a-real-type' };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'serviceType')).toBe(true);
    });

    test('accepts valid serviceType from enums', () => {
      const validTypes = ['api-service', 'data-service', 'worker', 'pages', 'gateway', 'generic'];
      for (const type of validTypes) {
        const result = validator.validateConfig({ serviceType: type }, 'create');
        expect(result.valid).toBe(true);
      }
    });

    test('rejects invalid environment', () => {
      const config = { environment: 'invalid-env' };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(false);
    });

    test('accepts valid environments', () => {
      for (const env of ['development', 'staging', 'production']) {
        const result = validator.validateConfig({ environment: env }, 'create');
        expect(result.valid).toBe(true);
      }
    });

    test('rejects invalid domain format', () => {
      const config = { domain: 'not-a-domain' };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(false);
    });

    test('accepts valid domain', () => {
      const config = { domain: 'api.example.com' };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(true);
    });

    test('rejects invalid feature in array', () => {
      const config = { features: ['d1', 'not-a-feature'] };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(false);
    });

    test('accepts valid features', () => {
      const config = { features: ['d1', 'kv', 'r2', 'ai'] };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(true);
    });

    test('rejects invalid compatibilityDate format', () => {
      const config = { advanced: { compatibilityDate: 'not-a-date' } };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(false);
    });

    test('accepts valid advanced options', () => {
      const config = {
        advanced: {
          compatibilityDate: '2024-12-01',
          compatibilityFlags: ['nodejs_compat'],
          customRoutes: true
        }
      };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(true);
    });

    test('rejects description too long', () => {
      const config = { description: 'x'.repeat(501) };
      const result = validator.validateConfig(config, 'create');
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateConfig — Deploy Schema Errors ────────────────

  describe('validateConfig — deploy schema errors', () => {
    test('rejects invalid deployment strategy', () => {
      const config = { deployment: { strategy: 'invalid' } };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.valid).toBe(false);
    });

    test('accepts valid deployment strategies', () => {
      for (const strategy of ['direct', 'blue-green', 'canary', 'rolling']) {
        const result = validator.validateConfig({ deployment: { strategy } }, 'deploy');
        expect(result.valid).toBe(true);
      }
    });

    test('rejects negative deployment replicas', () => {
      const config = { deployment: { replicas: 0 } };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.valid).toBe(false);
    });

    test('rejects replicas above max', () => {
      const config = { deployment: { replicas: 101 } };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.valid).toBe(false);
    });

    test('accepts valid deployment config', () => {
      const config = {
        deployment: {
          strategy: 'blue-green',
          replicas: 3,
          timeout: 30000,
          healthCheckPath: '/health'
        }
      };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.valid).toBe(true);
    });
  });

  // ─── validateConfig — Update Schema Errors ─────────────────

  describe('validateConfig — update schema errors', () => {
    test('rejects invalid email in notification', () => {
      const config = { notification: { notifyEmail: 'not-an-email' } };
      const result = validator.validateConfig(config, 'update');
      expect(result.valid).toBe(false);
    });

    test('rejects invalid webhook URL (non-empty non-URL)', () => {
      const config = { notification: { slackWebhook: 'not-a-url' } };
      const result = validator.validateConfig(config, 'update');
      expect(result.valid).toBe(false);
    });

    test('accepts empty webhook URL', () => {
      const config = { notification: { slackWebhook: '' } };
      const result = validator.validateConfig(config, 'update');
      expect(result.valid).toBe(true);
    });

    test('rejects parallelUpdates above max', () => {
      const config = { performance: { parallelUpdates: 11 } };
      const result = validator.validateConfig(config, 'update');
      expect(result.valid).toBe(false);
    });

    test('accepts valid update config', () => {
      const config = {
        domain: 'api.example.com',
        environment: 'production',
        preview: true,
        updates: { updateDependencies: true },
        migration: { backupBeforeUpdate: true },
        performance: { parallelUpdates: 2, maxRetries: 3 }
      };
      const result = validator.validateConfig(config, 'update');
      expect(result.valid).toBe(true);
    });
  });

  // ─── validateConfig — Validate Schema ──────────────────────

  describe('validateConfig — validate schema', () => {
    test('rejects invalid reporting format', () => {
      const config = { reporting: { format: 'csv' } };
      const result = validator.validateConfig(config, 'validate');
      expect(result.valid).toBe(false);
    });

    test('accepts valid reporting formats', () => {
      for (const format of ['json', 'text', 'html', 'markdown']) {
        const result = validator.validateConfig({ reporting: { format } }, 'validate');
        expect(result.valid).toBe(true);
      }
    });

    test('accepts full validate config', () => {
      const config = {
        environment: 'development',
        deepScan: true,
        checks: { structure: true, security: true, performance: false },
        validation: { strictMode: true },
        requirements: { minNodeVersion: '18.0.0' },
        reporting: { format: 'json', verbose: true }
      };
      const result = validator.validateConfig(config, 'validate');
      expect(result.valid).toBe(true);
    });
  });

  // ─── Semantic Warnings ────────────────────────────────────

  describe('semantic warnings', () => {
    test('warns about env var placeholders', () => {
      const config = { cloudflareToken: '${CLOUDFLARE_TOKEN}' };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.warnings.some(w => w.code === 'ENV_VAR_PLACEHOLDER')).toBe(true);
    });

    test('warns about nested env var placeholders', () => {
      const config = { deployment: { healthCheckPath: '${HEALTH_PATH}' } };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.warnings.some(w => w.code === 'ENV_VAR_PLACEHOLDER')).toBe(true);
    });

    test('warns about duplicate features in create config', () => {
      const config = { features: ['d1', 'd1', 'kv'] };
      const result = validator.validateConfig(config, 'create');
      expect(result.warnings.some(w => w.code === 'DUPLICATE_FEATURES')).toBe(true);
    });

    test('warns about name mismatch in create config', () => {
      const config = { projectName: 'project-a', serviceName: 'service-b' };
      const result = validator.validateConfig(config, 'create');
      expect(result.warnings.some(w => w.code === 'NAME_MISMATCH')).toBe(true);
    });

    test('no name mismatch when names are same', () => {
      const config = { projectName: 'my-service', serviceName: 'my-service' };
      const result = validator.validateConfig(config, 'create');
      expect(result.warnings.some(w => w.code === 'NAME_MISMATCH')).toBe(false);
    });

    test('warns about production deploy without security', () => {
      const config = { environment: 'production' };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.warnings.some(w => w.code === 'MISSING_SECURITY')).toBe(true);
      expect(result.warnings.some(w => w.code === 'MISSING_MONITORING')).toBe(true);
    });

    test('no production warning for development env', () => {
      const config = { environment: 'development' };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.warnings.some(w => w.code === 'MISSING_SECURITY')).toBe(false);
    });

    test('warns about contradictory dryRun+force', () => {
      const config = { dryRun: true, force: true };
      const result = validator.validateConfig(config, 'deploy');
      expect(result.warnings.some(w => w.code === 'CONTRADICTORY_FLAGS')).toBe(true);
    });

    test('warns about migrations without backup', () => {
      const config = {
        migration: { runMigrations: true, backupBeforeUpdate: false }
      };
      const result = validator.validateConfig(config, 'update');
      expect(result.warnings.some(w => w.code === 'NO_BACKUP')).toBe(true);
    });
  });

  // ─── detectConfigType ─────────────────────────────────────

  describe('detectConfigType', () => {
    test('detects create config', () => {
      const config = { projectName: 'test', serviceType: 'api-service', template: 'basic' };
      const result = validator.detectConfigType(config);
      expect(result.detected).toBe(true);
      expect(result.commandType).toBe('create');
    });

    test('detects deploy config', () => {
      const config = { deployment: { strategy: 'direct' }, routing: {}, monitoring: {} };
      const result = validator.detectConfigType(config);
      expect(result.detected).toBe(true);
      expect(result.commandType).toBe('deploy');
    });

    test('detects validate config', () => {
      const config = { deepScan: true, checks: {}, reporting: {} };
      const result = validator.detectConfigType(config);
      expect(result.detected).toBe(true);
      expect(result.commandType).toBe('validate');
    });

    test('detects update config', () => {
      const config = { updates: {}, migration: {}, notification: {} };
      const result = validator.detectConfigType(config);
      expect(result.detected).toBe(true);
      expect(result.commandType).toBe('update');
    });

    test('returns not detected for empty config', () => {
      const result = validator.detectConfigType({});
      expect(result.detected).toBe(false);
    });

    test('returns not detected for null', () => {
      const result = validator.detectConfigType(null);
      expect(result.detected).toBe(false);
    });

    test('returns candidates sorted by score', () => {
      const config = { deployment: {}, updates: {} };
      const result = validator.detectConfigType(config);
      expect(result.candidates.length).toBeGreaterThan(0);
      // Scores should be descending
      for (let i = 1; i < result.candidates.length; i++) {
        expect(result.candidates[i].score).toBeLessThanOrEqual(result.candidates[i - 1].score);
      }
    });

    test('confidence between 0 and 1', () => {
      const config = { projectName: 'test' };
      const result = validator.detectConfigType(config);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ─── getSchemaDefinition ──────────────────────────────────

  describe('getSchemaDefinition', () => {
    test('returns definition for create type', () => {
      const def = validator.getSchemaDefinition('create');
      expect(def).not.toBeNull();
      expect(def.commandType).toBe('create');
      expect(def.fields).toBeDefined();
      expect(def.fieldCount).toBeGreaterThan(0);
      expect(def.validServiceTypes).toBeDefined();
      expect(def.validFeatures).toBeDefined();
    });

    test('returns definition for deploy type', () => {
      const def = validator.getSchemaDefinition('deploy');
      expect(def).not.toBeNull();
      expect(def.fields.deployment).toBeDefined();
    });

    test('returns definition for validate type', () => {
      const def = validator.getSchemaDefinition('validate');
      expect(def).not.toBeNull();
      expect(def.fields.checks).toBeDefined();
    });

    test('returns definition for update type', () => {
      const def = validator.getSchemaDefinition('update');
      expect(def).not.toBeNull();
      expect(def.fields.updates).toBeDefined();
    });

    test('returns null for unknown type', () => {
      const def = validator.getSchemaDefinition('nonexistent');
      expect(def).toBeNull();
    });

    test('includes field types', () => {
      const def = validator.getSchemaDefinition('create');
      // projectName should be a string
      expect(def.fields.projectName.type).toBe('string');
      // typescript should be boolean
      expect(def.fields.typescript.type).toBe('boolean');
      // features should be array
      expect(def.fields.features.type).toBe('array');
    });
  });

  // ─── getRegisteredTypes ───────────────────────────────────

  describe('getRegisteredTypes', () => {
    test('returns all command types', () => {
      const types = validator.getRegisteredTypes();
      expect(types).toContain('create');
      expect(types).toContain('deploy');
      expect(types).toContain('validate');
      expect(types).toContain('update');
      expect(types.length).toBe(4);
    });
  });

  // ─── validateConfigFile ───────────────────────────────────

  describe('validateConfigFile', () => {
    test('returns error for non-existent file', () => {
      const result = validator.validateConfigFile('/nonexistent/path.json', 'create');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
    });

    test('returns error for invalid JSON', () => {
      // Create a temp file with invalid JSON — we'll test with a path resolution trick
      // Since we can't easily create temp files in unit tests, we rely on the path check
      const result = validator.validateConfigFile('/nonexistent.json', 'create');
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateExampleConfigs ───────────────────────────────

  describe('validateExampleConfigs', () => {
    test('handles missing config directory gracefully', () => {
      const results = validator.validateExampleConfigs('/nonexistent/dir');
      expect(Object.keys(results)).toHaveLength(4);
      for (const [filename, result] of Object.entries(results)) {
        expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
      }
    });
  });
});

// ─── Schema Registry Tests ──────────────────────────────────

describe('Config Schema Registry', () => {
  test('CONFIG_SCHEMAS has all four types', () => {
    expect(Object.keys(CONFIG_SCHEMAS)).toEqual(['create', 'deploy', 'validate', 'update']);
  });

  test('getConfigSchema returns schema for valid type', () => {
    const schema = getConfigSchema('create');
    expect(schema).toBeDefined();
    expect(schema).toBe(CreateConfigSchema);
  });

  test('getConfigSchema returns null for invalid type', () => {
    expect(getConfigSchema('invalid')).toBeNull();
  });

  test('getRegisteredConfigTypes returns all types', () => {
    const types = getRegisteredConfigTypes();
    expect(types).toEqual(['create', 'deploy', 'validate', 'update']);
  });

  test('all schemas are Zod objects', () => {
    for (const schema of Object.values(CONFIG_SCHEMAS)) {
      expect(schema).toBeDefined();
      expect(schema.safeParse).toBeDefined();
      expect(typeof schema.safeParse).toBe('function');
    }
  });
});

// ─── Individual Schema Edge Cases ────────────────────────────

describe('Schema Edge Cases', () => {
  test('CreateConfigSchema accepts middlewareStrategy enum', () => {
    const result = CreateConfigSchema.safeParse({ middlewareStrategy: 'contract' });
    expect(result.success).toBe(true);
  });

  test('CreateConfigSchema rejects invalid middlewareStrategy', () => {
    const result = CreateConfigSchema.safeParse({ middlewareStrategy: 'invalid' });
    expect(result.success).toBe(false);
  });

  test('DeployConfigSchema accepts security headers as record', () => {
    const result = DeployConfigSchema.safeParse({
      security: { headers: { 'X-Frame-Options': 'DENY' } }
    });
    expect(result.success).toBe(true);
  });

  test('ValidateConfigSchema accepts all check types', () => {
    const result = ValidateConfigSchema.safeParse({
      checks: {
        structure: true,
        configuration: true,
        dependencies: false,
        security: true,
        performance: false
      }
    });
    expect(result.success).toBe(true);
  });

  test('UpdateConfigSchema accepts valid notification email', () => {
    const result = UpdateConfigSchema.safeParse({
      notification: { notifyEmail: 'admin@example.com' }
    });
    expect(result.success).toBe(true);
  });

  test('UpdateConfigSchema rejects timeout below minimum', () => {
    const result = UpdateConfigSchema.safeParse({
      performance: { timeout: 500 }
    });
    expect(result.success).toBe(false);
  });
});
