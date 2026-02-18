/**
 * Config Schema Validator
 * Validates CLI configuration files against Zod schemas
 * 
 * Integrates with existing infrastructure:
 * - ConfigLoader for file loading
 * - configSchemas.js for Zod schema definitions
 * - service-schema-config.js for canonical enums
 * - payloadValidation.js patterns for result format
 * 
 * Usage:
 *   const validator = new ConfigSchemaValidator();
 *   const result = validator.validateConfig(config, 'create');
 *   // result: { valid, errors[], warnings[], schema, commandType }
 * 
 *   const result = await validator.validateConfigFile('/path/to/config.json', 'deploy');
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  CONFIG_SCHEMAS,
  getConfigSchema,
  getRegisteredConfigTypes,
  CreateConfigSchema,
  DeployConfigSchema,
  ValidateConfigSchema,
  UpdateConfigSchema
} from './configSchemas.js';
import { getConfig } from '../config/service-schema-config.js';

export class ConfigSchemaValidator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.strict = options.strict || false;
  }

  /**
   * Validate a config object against the schema for a given command type
   * @param {Object} config - Configuration object to validate
   * @param {string} commandType - Command type (create, deploy, validate, update)
   * @returns {Object} Validation result { valid, errors[], warnings[], commandType }
   */
  validateConfig(config, commandType) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      commandType,
      fieldCount: 0
    };

    // Get the schema for this command type
    const schema = getConfigSchema(commandType);
    if (!schema) {
      result.valid = false;
      result.errors.push({
        field: 'commandType',
        code: 'UNKNOWN_COMMAND_TYPE',
        message: `Unknown command type: '${commandType}'. Valid types: ${getRegisteredConfigTypes().join(', ')}`
      });
      return result;
    }

    // Basic type check
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      result.valid = false;
      result.errors.push({
        field: '_root',
        code: 'INVALID_CONFIG_TYPE',
        message: 'Configuration must be a non-null object'
      });
      return result;
    }

    // Filter out comment keys (e.g., "// Comment") before validation
    const cleanConfig = this._stripComments(config);
    result.fieldCount = Object.keys(cleanConfig).length;

    // Run Zod validation (safeParse for non-throwing)
    const zodResult = schema.safeParse(cleanConfig);

    if (!zodResult.success) {
      result.valid = false;

      for (const issue of zodResult.error.issues) {
        const field = issue.path.length > 0 ? issue.path.join('.') : '_root';
        result.errors.push({
          field,
          code: this._mapZodCode(issue.code),
          message: issue.message,
          expected: issue.expected,
          received: issue.received
        });
      }
    }

    // Add semantic warnings (non-blocking)
    this._addSemanticWarnings(cleanConfig, commandType, result);

    return result;
  }

  /**
   * Load and validate a config file
   * @param {string} filePath - Path to JSON config file
   * @param {string} commandType - Command type (create, deploy, validate, update)
   * @returns {Object} Validation result with parsed config
   */
  validateConfigFile(filePath, commandType) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      commandType,
      filePath,
      config: null,
      fieldCount: 0
    };

    // Resolve and check file existence
    const fullPath = resolve(filePath);
    if (!existsSync(fullPath)) {
      result.valid = false;
      result.errors.push({
        field: '_file',
        code: 'FILE_NOT_FOUND',
        message: `Configuration file not found: ${fullPath}`
      });
      return result;
    }

    // Parse JSON
    let config;
    try {
      const content = readFileSync(fullPath, 'utf8');
      config = JSON.parse(content);
    } catch (parseError) {
      result.valid = false;
      result.errors.push({
        field: '_file',
        code: 'INVALID_JSON',
        message: `Invalid JSON in configuration file: ${parseError.message}`
      });
      return result;
    }

    // Validate against schema
    const validation = this.validateConfig(config, commandType);
    result.valid = validation.valid;
    result.errors = validation.errors;
    result.warnings = validation.warnings;
    result.fieldCount = validation.fieldCount;
    result.config = config;

    return result;
  }

  /**
   * Auto-detect the command type from a config object based on its fields
   * @param {Object} config - Configuration object
   * @returns {Object} Detection result { detected, commandType, confidence, candidates[] }
   */
  detectConfigType(config) {
    if (!config || typeof config !== 'object') {
      return { detected: false, commandType: null, confidence: 0, candidates: [] };
    }

    const cleanConfig = this._stripComments(config);
    const keys = Object.keys(cleanConfig);

    // Signature fields for each command type
    const signatures = {
      create: {
        strong: ['projectName', 'serviceName', 'serviceType', 'template', 'typescript'],
        moderate: ['features', 'advanced', 'metadata', 'middlewareStrategy']
      },
      deploy: {
        strong: ['deployment', 'routing', 'monitoring', 'dryRun', 'skipDoctor', 'doctorStrict'],
        moderate: ['security', 'token', 'servicePath']
      },
      validate: {
        strong: ['deepScan', 'checks', 'requirements', 'reporting'],
        moderate: ['validation', 'exportReport']
      },
      update: {
        strong: ['updates', 'migration', 'notification', 'performance'],
        moderate: ['preview', 'interactive']
      }
    };

    const candidates = [];

    for (const [type, sig] of Object.entries(signatures)) {
      let score = 0;
      const matchedFields = [];

      for (const key of keys) {
        if (sig.strong.includes(key)) {
          score += 3;
          matchedFields.push(key);
        } else if (sig.moderate.includes(key)) {
          score += 1;
          matchedFields.push(key);
        }
      }

      if (score > 0) {
        candidates.push({ commandType: type, score, matchedFields });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      return { detected: false, commandType: null, confidence: 0, candidates: [] };
    }

    const best = candidates[0];
    const confidence = Math.min(best.score / 6, 1); // Normalize to 0-1

    return {
      detected: true,
      commandType: best.commandType,
      confidence,
      candidates
    };
  }

  /**
   * Get human-readable schema definition for a command type
   * @param {string} commandType - Command type
   * @returns {Object} Schema definition with field descriptions
   */
  getSchemaDefinition(commandType) {
    const schema = getConfigSchema(commandType);
    if (!schema) return null;

    const schemaConfig = getConfig();
    const definitions = {};

    // Extract shape from Zod schema
    const shape = schema.shape;
    for (const [key, fieldSchema] of Object.entries(shape)) {
      definitions[key] = this._describeZodField(key, fieldSchema, schemaConfig);
    }

    return {
      commandType,
      description: schema.description || `Configuration schema for '${commandType}' command`,
      fields: definitions,
      fieldCount: Object.keys(definitions).length,
      validServiceTypes: schemaConfig.serviceTypes,
      validFeatures: schemaConfig.features
    };
  }

  /**
   * Validate all example config files in the config directory
   * @param {string} configDir - Path to config directory
   * @returns {Object} Results for each example file
   */
  validateExampleConfigs(configDir) {
    const results = {};
    const exampleFiles = {
      'clodo-create.example.json': 'create',
      'clodo-deploy.example.json': 'deploy',
      'clodo-validate.example.json': 'validate',
      'clodo-update.example.json': 'update'
    };

    for (const [filename, commandType] of Object.entries(exampleFiles)) {
      const filePath = resolve(configDir, filename);
      if (existsSync(filePath)) {
        results[filename] = this.validateConfigFile(filePath, commandType);
      } else {
        results[filename] = {
          valid: false,
          errors: [{ field: '_file', code: 'FILE_NOT_FOUND', message: `Example file not found: ${filename}` }],
          warnings: [],
          commandType
        };
      }
    }

    return results;
  }

  /**
   * Get all registered config types
   * @returns {string[]}
   */
  getRegisteredTypes() {
    return getRegisteredConfigTypes();
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Strip comment keys (e.g., "// Comment") from config objects
   */
  _stripComments(config) {
    const clean = {};
    for (const [key, value] of Object.entries(config)) {
      if (!key.startsWith('//')) {
        clean[key] = value;
      }
    }
    return clean;
  }

  /**
   * Map Zod error codes to our error codes
   */
  _mapZodCode(zodCode) {
    const codeMap = {
      invalid_type: 'INVALID_TYPE',
      invalid_string: 'INVALID_STRING',
      too_small: 'VALUE_TOO_SMALL',
      too_big: 'VALUE_TOO_BIG',
      invalid_enum_value: 'INVALID_ENUM',
      custom: 'CUSTOM_VALIDATION',
      invalid_union: 'INVALID_UNION',
      unrecognized_keys: 'UNRECOGNIZED_KEYS'
    };
    return codeMap[zodCode] || 'SCHEMA_VALIDATION';
  }

  /**
   * Add semantic warnings (non-blocking checks)
   */
  _addSemanticWarnings(config, commandType, result) {
    // Warn about env var placeholders that weren't substituted
    this._checkEnvVarPlaceholders(config, result);

    // Command-specific warnings
    switch (commandType) {
      case 'create':
        this._addCreateWarnings(config, result);
        break;
      case 'deploy':
        this._addDeployWarnings(config, result);
        break;
      case 'update':
        this._addUpdateWarnings(config, result);
        break;
    }
  }

  /**
   * Check for unsubstituted environment variable placeholders
   */
  _checkEnvVarPlaceholders(config, result, prefix = '') {
    for (const [key, value] of Object.entries(config)) {
      const field = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string' && /\$\{[^}]+\}/.test(value)) {
        result.warnings.push({
          field,
          code: 'ENV_VAR_PLACEHOLDER',
          message: `Field '${field}' contains environment variable placeholder: ${value}. Ensure env vars are set at runtime.`
        });
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        this._checkEnvVarPlaceholders(value, result, field);
      }
    }
  }

  /**
   * Warnings specific to create configs
   */
  _addCreateWarnings(config, result) {
    if (config.features && Array.isArray(config.features)) {
      const duplicates = config.features.filter((v, i, a) => a.indexOf(v) !== i);
      if (duplicates.length) {
        result.warnings.push({
          field: 'features',
          code: 'DUPLICATE_FEATURES',
          message: `Duplicate features: ${[...new Set(duplicates)].join(', ')}`
        });
      }
    }

    // Both projectName and serviceName provided — potential confusion
    if (config.projectName && config.serviceName && config.projectName !== config.serviceName) {
      result.warnings.push({
        field: 'serviceName',
        code: 'NAME_MISMATCH',
        message: `projectName ('${config.projectName}') differs from serviceName ('${config.serviceName}'). serviceName is used for the service identifier.`
      });
    }
  }

  /**
   * Warnings specific to deploy configs
   */
  _addDeployWarnings(config, result) {
    // Production without security settings
    if (config.environment === 'production') {
      if (!config.security) {
        result.warnings.push({
          field: 'security',
          code: 'MISSING_SECURITY',
          message: 'Production deployment without security configuration. Consider adding security settings.'
        });
      }
      if (!config.monitoring) {
        result.warnings.push({
          field: 'monitoring',
          code: 'MISSING_MONITORING',
          message: 'Production deployment without monitoring configuration. Consider adding monitoring settings.'
        });
      }
    }

    // Dry-run with force is contradictory
    if (config.dryRun && config.force) {
      result.warnings.push({
        field: 'dryRun',
        code: 'CONTRADICTORY_FLAGS',
        message: 'Both dryRun and force are set. dryRun simulates without changes, force skips confirmations — these are contradictory.'
      });
    }
  }

  /**
   * Warnings specific to update configs
   */
  _addUpdateWarnings(config, result) {
    // Update without backup
    if (config.migration && config.migration.runMigrations && !config.migration.backupBeforeUpdate) {
      result.warnings.push({
        field: 'migration.backupBeforeUpdate',
        code: 'NO_BACKUP',
        message: 'Running migrations without backupBeforeUpdate enabled. Consider enabling backups for safety.'
      });
    }
  }

  /**
   * Describe a Zod field for human-readable output
   */
  _describeZodField(key, fieldSchema, schemaConfig) {
    const def = {
      name: key,
      required: !fieldSchema.isOptional(),
      type: this._getZodType(fieldSchema)
    };

    // Add description if available
    if (fieldSchema.description) {
      def.description = fieldSchema.description;
    }

    return def;
  }

  /**
   * Get human-readable type from Zod schema
   */
  _getZodType(schema) {
    if (!schema || !schema._def) return 'unknown';

    // Zod v4 uses _def.type (string), Zod v3 uses _def.typeName
    const typeName = schema._def.type || schema._def.typeName;

    switch (typeName) {
      case 'string': case 'ZodString': return 'string';
      case 'number': case 'ZodNumber': return 'number';
      case 'boolean': case 'ZodBoolean': return 'boolean';
      case 'array': case 'ZodArray': return 'array';
      case 'object': case 'ZodObject': return 'object';
      case 'enum': case 'ZodEnum': {
        const values = schema._def.entries || schema._def.values;
        return values ? `enum(${Array.isArray(values) ? values.join(', ') : Object.keys(values).join(', ')})` : 'enum';
      }
      case 'optional': case 'ZodOptional': return this._getZodType(schema._def.innerType);
      case 'default': case 'ZodDefault': return this._getZodType(schema._def.innerType);
      case 'pipe': case 'ZodEffects': return this._getZodType(schema._def.in || schema._def.schema);
      case 'record': case 'ZodRecord': return 'record';
      case 'any': case 'ZodAny': return 'any';
      default: {
        const name = String(typeName || '');
        return name.replace('Zod', '').toLowerCase() || 'unknown';
      }
    }
  }
}
