/**
 * Environment Guard — Validates Cloudflare Worker env bindings at startup
 * 
 * Catches missing bindings early with descriptive errors instead of
 * failing deep in handler logic with cryptic "Cannot read property of undefined".
 * 
 * @example
 * import { createEnvironmentGuard } from '@tamyla/clodo-framework';
 * 
 * const guard = createEnvironmentGuard({
 *   required: ['KV_DATA', 'AI', 'SECRET_KEY'],
 *   optional: ['DEBUG', 'ANTHROPIC_API_KEY'],
 *   validate: {
 *     SECRET_KEY: (v) => typeof v === 'string' && v.length >= 32
 *   }
 * });
 * 
 * // In your Worker fetch handler:
 * export default {
 *   async fetch(request, env, ctx) {
 *     guard.check(env); // throws if bindings are missing
 *     // ... handle request
 *   }
 * };
 * 
 * @module @tamyla/clodo-framework/validation/environmentGuard
 */

/**
 * @typedef {Object} EnvironmentGuardConfig
 * @property {string[]} required - Binding names that MUST be present
 * @property {string[]} [optional=[]] - Binding names that MAY be present
 * @property {Object<string, Function>} [validate={}] - Custom validators per binding
 * @property {boolean} [throwOnMissing=true] - Throw on missing required binding (false = return report)
 */

export class EnvironmentGuard {
  /**
   * @param {EnvironmentGuardConfig} config
   */
  constructor(config = {}) {
    this.required = config.required || [];
    this.optional = config.optional || [];
    this.validators = config.validate || {};
    this.throwOnMissing = config.throwOnMissing !== false;
    this._checked = false;
  }

  /**
   * Validate env bindings. Call once at startup or in the fetch handler.
   * @param {Object} env - Cloudflare Worker environment
   * @returns {{ valid: boolean, missing: string[], invalid: string[], present: string[], warnings: string[] }}
   * @throws {Error} If throwOnMissing is true and required bindings are missing
   */
  check(env) {
    const result = {
      valid: true,
      missing: [],
      invalid: [],
      present: [],
      warnings: []
    };

    // Check required bindings
    for (const name of this.required) {
      if (env[name] === undefined || env[name] === null) {
        result.missing.push(name);
        result.valid = false;
      } else {
        result.present.push(name);
      }
    }

    // Check optional bindings (warn if missing, don't fail)
    for (const name of this.optional) {
      if (env[name] === undefined || env[name] === null) {
        result.warnings.push(`Optional binding '${name}' is not configured`);
      } else {
        result.present.push(name);
      }
    }

    // Run custom validators
    for (const [name, validator] of Object.entries(this.validators)) {
      if (env[name] !== undefined && env[name] !== null) {
        try {
          const isValid = validator(env[name]);
          if (!isValid) {
            result.invalid.push(name);
            result.valid = false;
          }
        } catch (err) {
          result.invalid.push(name);
          result.valid = false;
        }
      }
    }

    this._checked = true;

    if (!result.valid && this.throwOnMissing) {
      const parts = [];
      if (result.missing.length) {
        parts.push(`Missing required bindings: ${result.missing.join(', ')}`);
      }
      if (result.invalid.length) {
        parts.push(`Invalid bindings: ${result.invalid.join(', ')}`);
      }
      throw new Error(
        `[EnvironmentGuard] Environment validation failed.\n${parts.join('\n')}\n\n` +
        `Hint: Check your wrangler.toml bindings and .dev.vars for secrets.`
      );
    }

    return result;
  }

  /**
   * Create a middleware-compatible object that validates env on each request (with caching).
   * Can be used with router.use() or composeMiddleware().
   * @returns {Object} Middleware object with preprocess method
   */
  asMiddleware() {
    const guard = this;
    return {
      preprocess(request, env) {
        if (!guard._checked) {
          guard.check(env);
        }
        return null; // pass through
      }
    };
  }

  /**
   * Generate a TypeScript Env interface from the configured bindings.
   * Useful for DX — generates type definitions from guard config.
   * @param {Object} [bindingTypes={}] - Map of binding name → TypeScript type
   * @returns {string} TypeScript interface definition
   */
  generateEnvType(bindingTypes = {}) {
    const lines = ['interface Env {'];

    // Known Cloudflare binding types
    const defaultTypes = {
      KVNamespace: 'KVNamespace',
      D1Database: 'D1Database',
      R2Bucket: 'R2Bucket',
      Ai: 'Ai',
      VectorizeIndex: 'VectorizeIndex',
      Queue: 'Queue',
      DurableObjectNamespace: 'DurableObjectNamespace',
      Fetcher: 'Fetcher',
      AnalyticsEngineDataset: 'AnalyticsEngineDataset',
      SendEmail: 'SendEmail',
      Hyperdrive: 'Hyperdrive'
    };

    for (const name of this.required) {
      const type = bindingTypes[name] || 'unknown';
      lines.push(`  ${name}: ${type};`);
    }

    for (const name of this.optional) {
      const type = bindingTypes[name] || 'string';
      lines.push(`  ${name}?: ${type};`);
    }

    lines.push('}');
    return lines.join('\n');
  }
}

/**
 * Create an environment guard — factory function
 * @param {EnvironmentGuardConfig} config
 * @returns {EnvironmentGuard}
 */
export function createEnvironmentGuard(config = {}) {
  return new EnvironmentGuard(config);
}
