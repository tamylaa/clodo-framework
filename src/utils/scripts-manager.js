/**
 * Scripts Manager
 *
 * Manages and executes development scripts from the scripts/ directory
 * Provides interactive access to generated deployment and utility scripts
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ScriptsManager {
  constructor() {
    this.scriptsDir = path.join(process.cwd(), 'scripts');
    this.scripts = new Map();
  }

  /**
   * Load available scripts from scripts/ directory
   */
  async loadScripts() {
    if (!fs.existsSync(this.scriptsDir)) {
      return;
    }

    const subdirs = ['database', 'deployment', 'service-management', 'testing', 'utilities'];

    for (const subdir of subdirs) {
      const subdirPath = path.join(this.scriptsDir, subdir);
      if (fs.existsSync(subdirPath)) {
        await this.loadScriptsFromDir(subdirPath, subdir);
      }
    }
  }

  /**
   * Load scripts from a specific directory
   */
  async loadScriptsFromDir(dirPath, category) {
    const files = fs.readdirSync(dirPath).filter(f =>
      f.endsWith('.js') || f.endsWith('.ps1') || f.endsWith('.sh')
    );

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const scriptName = path.basename(file, path.extname(file));
      const scriptKey = `${category}/${scriptName}`;

      this.scripts.set(scriptKey, {
        name: scriptName,
        path: filePath,
        category,
        extension: path.extname(file),
        description: await this.getScriptDescription(filePath)
      });
    }
  }

  /**
   * Get script description from file content or comments
   */
  async getScriptDescription(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').slice(0, 10);

      for (const line of lines) {
        const commentMatch = line.match(/^\s*\/\*\*\s*@description\s+(.+)\s*\*\//) ||
                            line.match(/^\s*#\s*@description\s+(.+)/) ||
                            line.match(/^\s*\/\/\s*@description\s+(.+)/);
        if (commentMatch) {
          return commentMatch[1].trim();
        }
      }

      // Fallback: first comment line
      for (const line of lines) {
        const commentMatch = line.match(/^\s*\/\*\*\s*(.+)\s*\*\//) ||
                            line.match(/^\s*#\s*(.+)/) ||
                            line.match(/^\s*\/\/\s*(.+)/);
        if (commentMatch && !commentMatch[1].includes('@')) {
          return commentMatch[1].trim();
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return 'No description available';
  }

  /**
   * Get all available scripts
   */
  getAllScripts() {
    return Array.from(this.scripts.values());
  }

  /**
   * Get scripts by category
   */
  getScriptsByCategory(category) {
    return Array.from(this.scripts.values()).filter(script => script.category === category);
  }

  /**
   * Execute a script
   */
  async executeScript(scriptKey, args = []) {
    const script = this.scripts.get(scriptKey);
    if (!script) {
      throw new Error(`Script not found: ${scriptKey}`);
    }

    const command = this.buildCommand(script, args);

    try {
      const { stdout, stderr } = await execAsync(command);
      return { stdout, stderr, success: true };
    } catch (error) {
      return { stdout: error.stdout, stderr: error.stderr, success: false, error: error.message };
    }
  }

  /**
   * Build execution command based on script type
   */
  buildCommand(script, args) {
    const argsStr = args.join(' ');

    switch (script.extension) {
      case '.js':
        return `node "${script.path}" ${argsStr}`;
      case '.ps1':
        return `powershell -ExecutionPolicy Bypass -File "${script.path}" ${argsStr}`;
      case '.sh':
        return `bash "${script.path}" ${argsStr}`;
      default:
        throw new Error(`Unsupported script type: ${script.extension}`);
    }
  }

  /**
   * List available scripts in a formatted way
   */
  listScripts() {
    const scripts = this.getAllScripts();
    const categories = {};

    scripts.forEach(script => {
      if (!categories[script.category]) {
        categories[script.category] = [];
      }
      categories[script.category].push(script);
    });

    let output = 'Available Scripts:\n\n';

    for (const [category, scripts] of Object.entries(categories)) {
      output += `${category.toUpperCase()}:\n`;
      scripts.forEach(script => {
        output += `  ${script.name}: ${script.description}\n`;
      });
      output += '\n';
    }

    return output;
  }
}

// Export singleton instance
export const scriptsManager = new ScriptsManager();
export default scriptsManager;
