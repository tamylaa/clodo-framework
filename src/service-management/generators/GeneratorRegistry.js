/**
 * GeneratorRegistry - Registry for managing and executing generators
 * 
 * Provides a centralized registry for all generators, organized by category.
 * Controls execution order and manages generator lifecycle.
 */
export class GeneratorRegistry {
  /**
   * Create a new generator registry
   */
  constructor() {
    this.categories = new Map();
    this.executionOrder = [
      'core',          // Core configuration files (package.json, wrangler.toml, etc.)
      'config',        // Environment and config files
      'code',          // Source code (schemas, handlers, middleware, utils)
      'scripts',       // Utility scripts (deploy, setup, health-check)
      'tests',         // Test files and test configuration
      'docs',          // Documentation files
      'ci',            // CI/CD workflows
      'service-types'  // Service-type specific generation
    ];
  }

  /**
   * Register one or more generators in a category
   * @param {string} category - Category name (e.g., 'core', 'config', 'code')
   * @param {BaseGenerator|BaseGenerator[]} generators - Generator instance(s) to register
   * @throws {Error} If category or generators are invalid
   */
  register(category, generators) {
    if (!category || typeof category !== 'string') {
      throw new Error('Category must be a non-empty string');
    }

    if (!generators) {
      throw new Error('Generators must be provided');
    }

    // Ensure generators is an array
    const generatorArray = Array.isArray(generators) ? generators : [generators];

    if (generatorArray.length === 0) {
      throw new Error('At least one generator must be provided');
    }

    // Validate all generators have a generate() method
    for (const generator of generatorArray) {
      if (!generator || typeof generator.generate !== 'function') {
        throw new Error(`Invalid generator: must have a generate() method. Got: ${generator?.constructor?.name || typeof generator}`);
      }
    }

    // Get existing generators for this category or create new array
    const existing = this.categories.get(category) || [];
    
    // Add new generators
    this.categories.set(category, [...existing, ...generatorArray]);
  }

  /**
   * Unregister a specific generator from a category
   * @param {string} category - Category name
   * @param {string} generatorName - Name of the generator to remove
   * @returns {boolean} - True if generator was found and removed
   */
  unregister(category, generatorName) {
    if (!this.categories.has(category)) {
      return false;
    }

    const generators = this.categories.get(category);
    const initialLength = generators.length;
    
    const filtered = generators.filter(gen => gen.name !== generatorName);
    
    if (filtered.length === 0) {
      this.categories.delete(category);
    } else {
      this.categories.set(category, filtered);
    }

    return filtered.length < initialLength;
  }

  /**
   * Get all generators for a specific category
   * @param {string} category - Category name
   * @returns {BaseGenerator[]} - Array of generators (empty if category not found)
   */
  getGenerators(category) {
    return this.categories.get(category) || [];
  }

  /**
   * Get all registered categories in execution order
   * @returns {string[]} - Array of category names
   */
  getCategories() {
    const registeredCategories = Array.from(this.categories.keys());
    
    // Return categories in execution order, followed by any unordered categories
    const ordered = this.executionOrder.filter(cat => registeredCategories.includes(cat));
    const unordered = registeredCategories.filter(cat => !this.executionOrder.includes(cat));
    
    return [...ordered, ...unordered];
  }

  /**
   * Get total count of registered generators across all categories
   * @returns {number} - Total generator count
   */
  getCount() {
    let count = 0;
    for (const generators of this.categories.values()) {
      count += generators.length;
    }
    return count;
  }

  /**
   * Get count of generators in a specific category
   * @param {string} category - Category name
   * @returns {number} - Generator count for category
   */
  getCategoryCount(category) {
    return this.getGenerators(category).length;
  }

  /**
   * Check if a category has any generators
   * @param {string} category - Category name
   * @returns {boolean} - True if category has generators
   */
  hasCategory(category) {
    return this.categories.has(category) && this.categories.get(category).length > 0;
  }

  /**
   * Clear all generators from a category
   * @param {string} category - Category name
   * @returns {boolean} - True if category existed and was cleared
   */
  clearCategory(category) {
    return this.categories.delete(category);
  }

  /**
   * Clear all generators from all categories
   */
  clearAll() {
    this.categories.clear();
  }

  /**
   * Execute all generators in order
   * @param {Object} context - Generation context to pass to all generators
   * @param {Object} options - Execution options
   * @param {Function} options.logger - Logger for progress tracking
   * @param {boolean} options.stopOnError - Whether to stop execution on first error (default: false)
   * @returns {Promise<Object>} - Execution results { success, failed, skipped }
   */
  async execute(context, options = {}) {
    const logger = options.logger || console;
    const stopOnError = options.stopOnError !== false; // Default to true for safety

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    const categories = this.getCategories();
    
    logger.info(`Starting generator execution: ${this.getCount()} generators in ${categories.length} categories`);

    for (const category of categories) {
      const generators = this.getGenerators(category);
      
      logger.info(`Executing category: ${category} (${generators.length} generators)`);

      for (const generator of generators) {
        const name = generator.name || generator.constructor.name;

        try {
          // Check if generator should run
          if (generator.shouldGenerate && !generator.shouldGenerate(context)) {
            logger.info(`Skipping ${name}: shouldGenerate() returned false`);
            results.skipped.push({ name, category, reason: 'shouldGenerate() returned false' });
            continue;
          }

          // Execute generator
          logger.info(`Running ${name}...`);
          await generator.generate(context);
          
          results.success.push({ name, category });
          logger.info(`✓ ${name} completed successfully`);

        } catch (error) {
          const errorInfo = {
            name,
            category,
            error: error.message,
            stack: error.stack
          };

          results.failed.push(errorInfo);
          logger.error(`✗ ${name} failed: ${error.message}`);

          if (stopOnError) {
            logger.error('Stopping execution due to error (stopOnError=true)');
            throw new Error(`Generator execution stopped: ${name} failed - ${error.message}`);
          }
        }
      }
    }

    // Log summary
    logger.info('\n=== Generator Execution Summary ===');
    logger.info(`Total: ${this.getCount()} generators`);
    logger.info(`✓ Success: ${results.success.length}`);
    logger.info(`✗ Failed: ${results.failed.length}`);
    logger.info(`⊘ Skipped: ${results.skipped.length}`);

    if (results.failed.length > 0) {
      logger.error('\nFailed generators:');
      results.failed.forEach(({ name, error }) => {
        logger.error(`  - ${name}: ${error}`);
      });
    }

    return results;
  }

  /**
   * Get a summary of all registered generators
   * @returns {Object} - Summary with categories and generator counts
   */
  getSummary() {
    const categories = this.getCategories();
    const summary = {
      totalCategories: categories.length,
      totalGenerators: this.getCount(),
      categories: {}
    };

    for (const category of categories) {
      const generators = this.getGenerators(category);
      summary.categories[category] = {
        count: generators.length,
        generators: generators.map(g => g.name || g.constructor.name)
      };
    }

    return summary;
  }
}

export default GeneratorRegistry;
