/**
 * Command Configuration Manager
 * Loads and manages configurable system commands from validation-config.json
 * 
 * Ensures all commands are configurable and platform-specific
 * No hardcoded commands in the codebase
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this module (framework's bin directory)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Navigate up to framework root, then to config directory
const FRAMEWORK_CONFIG_PATH = join(__dirname, '../../../config/validation-config.json');

export class CommandConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath || join(process.cwd(), 'validation-config.json');
    this.config = null;
    this.loadConfig();
  }

  /**
   * Load configuration from JSON file
   */
  loadConfig() {
    try {
      // First try to load from service directory
      const configData = readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
      console.log('📋 Loaded command configuration from validation-config.json');
    } catch (error) {
      // If service config not found, try framework's internal config
      try {
        const frameworkConfigData = readFileSync(FRAMEWORK_CONFIG_PATH, 'utf-8');
        this.config = JSON.parse(frameworkConfigData);
        console.log('📋 Loaded command configuration from framework defaults');
      } catch (frameworkError) {
        // If neither exists, use hardcoded defaults
        console.log('⚠️ Could not load command config, using minimal defaults');
        this.config = this.getDefaultConfig();
      }
    }
  }

  /**
   * Get default configuration fallback
   */
  getDefaultConfig() {
    return {
      requiredCommands: {
        npx: 'npx',
        node: 'node',
        npm: 'npm',
        wrangler: 'npx wrangler'
      },
      cloudflareCommands: {
        whoami: 'npx wrangler whoami',
        auth_login: 'npx wrangler auth login',
        deployments_list: 'npx wrangler deployments list',
        list_workers: 'npx wrangler dev --help',
        deploy: 'npx wrangler deploy',
        list_zones: 'npx wrangler zone list',
        worker_status: 'npx wrangler status'
      },
      systemCommands: {
        powershell_web_request: 'powershell -Command "try { Invoke-WebRequest -Uri \'{url}\' -TimeoutSec 10 -UseBasicParsing | Out-Null } catch { exit 1 }"',
        curl_test: 'curl -s --connect-timeout 10 {url} -o /dev/null'
      }
    };
  }

  /**
   * Get a Cloudflare command
   */
  getCloudflareCommand(commandName, params = {}) {
    const command = this.config?.cloudflareCommands?.[commandName];
    if (!command) {
      throw new Error(`Cloudflare command '${commandName}' not found in configuration`);
    }
    
    return this.interpolateParams(command, params);
  }

  /**
   * Get a system command
   */
  getSystemCommand(commandName, params = {}) {
    const command = this.config?.systemCommands?.[commandName];
    if (!command) {
      throw new Error(`System command '${commandName}' not found in configuration`);
    }
    
    return this.interpolateParams(command, params);
  }

  /**
   * Get a required command
   */
  getRequiredCommand(commandName) {
    const command = this.config?.requiredCommands?.[commandName];
    if (!command) {
      throw new Error(`Required command '${commandName}' not found in configuration`);
    }
    
    return command;
  }

  /**
   * Get network test command for current platform
   */
  getNetworkTestCommand(url) {
    const isWindows = process.platform === 'win32';
    const commandName = isWindows ? 'powershell_web_request' : 'curl_test';
    
    return this.getSystemCommand(commandName, { url });
  }

  /**
   * Interpolate parameters in command strings
   */
  interpolateParams(command, params) {
    let result = command;
    
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), value);
    }
    
    return result;
  }

  /**
   * Get all available commands for debugging
   */
  getAllCommands() {
    return {
      requiredCommands: this.config?.requiredCommands || {},
      cloudflareCommands: this.config?.cloudflareCommands || {},
      systemCommands: this.config?.systemCommands || {}
    };
  }

  /**
   * Validate command configuration
   */
  validateConfig() {
    const errors = [];
    
    // Check required sections
    const requiredSections = ['requiredCommands', 'cloudflareCommands', 'systemCommands'];
    
    for (const section of requiredSections) {
      if (!this.config[section] || typeof this.config[section] !== 'object') {
        errors.push(`Missing or invalid section: ${section}`);
      }
    }

    // Check essential Cloudflare commands
    const essentialCfCommands = ['whoami', 'auth_login', 'deployments_list'];
    
    for (const cmd of essentialCfCommands) {
      if (!this.config?.cloudflareCommands?.[cmd]) {
        errors.push(`Missing essential Cloudflare command: ${cmd}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Command configuration validation failed:\\n${errors.join('\\n')}`);
    }

    return true;
  }

  /**
   * Reload configuration
   */
  reload() {
    this.loadConfig();
    this.validateConfig();
  }
}

// Singleton instance
let commandConfigInstance = null;

/**
 * Get singleton instance of command config manager
 */
export function getCommandConfig(configPath = null) {
  if (!commandConfigInstance || configPath) {
    commandConfigInstance = new CommandConfigManager(configPath);
  }
  return commandConfigInstance;
}

export default CommandConfigManager;