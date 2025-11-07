/**
 * DirectoryStructureService - Handles creation of directory structures for services
 * 
 * Provides standardized directory layout creation for generated services,
 * ensuring consistent project structure across all service types.
 */
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class DirectoryStructureService {
  /**
   * Create the standard directory structure for a service
   * @param {string} servicePath - Root path of the service
   */
  createStandardStructure(servicePath) {
    const directories = [
      'src',
      'src/config',
      'src/worker',
      'src/handlers',
      'src/middleware',
      'src/utils',
      'src/schemas',
      'scripts',
      'test',
      'test/unit',
      'test/integration',
      'docs',
      'config',
      'logs',
      '.github',
      '.github/workflows'
    ];

    for (const dir of directories) {
      const fullPath = join(servicePath, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  /**
   * Create a custom directory structure
   * @param {string} servicePath - Root path of the service
   * @param {string[]} directories - Array of directory paths to create
   */
  createCustomStructure(servicePath, directories) {
    for (const dir of directories) {
      const fullPath = join(servicePath, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  /**
   * Ensure a single directory exists
   * @param {string} directoryPath - Full path to the directory
   * @returns {boolean} - True if directory was created, false if it already existed
   */
  ensureDirectory(directoryPath) {
    if (!existsSync(directoryPath)) {
      mkdirSync(directoryPath, { recursive: true });
      return true;
    }
    return false;
  }
}

