/**
 * Configuration Manager Module
 * Configuration file management and validation
 * 
 * Consolidates config management across 34+ scripts
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export function updateWranglerConfig(updates, configPath = 'wrangler.toml') {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  let config = readFileSync(configPath, 'utf8');
  let changesMade = [];

  // Apply updates systematically
  for (const [key, value] of Object.entries(updates)) {
    switch (key) {
      case 'workerName':
        // Update main worker name
        if (config.match(/^name = "[^"]*"/m)) {
          config = config.replace(/^name = "[^"]*"/m, `name = "${value}"`);
          changesMade.push(`Updated main worker name to: ${value}`);
        }
        
        // Update production environment name  
        if (config.match(/^\[env\.production\]\s*\nname = "[^"]*"/m)) {
          config = config.replace(/^\[env\.production\]\s*\nname = "[^"]*"/m, `[env.production]\nname = "${value}"`);
          changesMade.push(`Updated production worker name to: ${value}`);
        }
        break;
        
      case 'databaseName': {
        const dbNameRegex = /database_name = "[^"]*"/g;
        if (config.match(dbNameRegex)) {
          config = config.replace(dbNameRegex, `database_name = "${value}"`);
          changesMade.push(`Updated database name to: ${value}`);
        }
        break;
      }
        
      case 'databaseId': {
        const dbIdRegex = /database_id = "[^"]*"/g;
        if (config.match(dbIdRegex)) {
          config = config.replace(dbIdRegex, `database_id = "${value}"`);
          changesMade.push(`Updated database ID to: ${value}`);
        }
        break;
      }
        
      case 'serviceDomain': {
        const domainRegex = /SERVICE_DOMAIN = "[^"]*"/g;
        if (config.match(domainRegex)) {
          config = config.replace(domainRegex, `SERVICE_DOMAIN = "${value}"`);
          changesMade.push(`Updated service domain to: ${value}`);
        }
        break;
      }
        
      case 'compatibilityDate': {
        const dateRegex = /^compatibility_date = "[^"]*"/m;
        if (config.match(dateRegex)) {
          config = config.replace(dateRegex, `compatibility_date = "${value}"`);
          changesMade.push(`Updated compatibility date to: ${value}`);
        }
        break;
      }
        
      default:
        console.warn(`Unknown config update key: ${key}`);
    }
  }

  writeFileSync(configPath, config);
  
  return {
    configPath,
    changesMade,
    success: changesMade.length > 0
  };
}

export function backupConfig(configPath = 'wrangler.toml', suffix = null) {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  const timestamp = suffix || new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${configPath}.backup.${timestamp}`;
  
  copyFileSync(configPath, backupPath);
  
  return {
    originalPath: configPath,
    backupPath,
    timestamp: new Date().toISOString()
  };
}

export function validateConfig(configPath = 'wrangler.toml') {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const config = readFileSync(configPath, 'utf8');
  const issues = [];
  const warnings = [];
  
  // Required fields validation
  const requiredFields = [
    { pattern: /^name = "/m, description: 'Worker name' },
    { pattern: /^compatibility_date = "/m, description: 'Compatibility date' },
    { pattern: /^main = "/m, description: 'Main entry point' }
  ];

  requiredFields.forEach(field => {
    if (!config.match(field.pattern)) {
      issues.push(`Missing required field: ${field.description}`);
    }
  });

  // Database configuration validation
  const hasDatabaseBinding = config.includes('[[d1_databases]]');
  if (hasDatabaseBinding) {
    if (!config.includes('database_name =')) {
      issues.push('Database binding found but missing database_name');
    }
    if (!config.includes('database_id =')) {
      issues.push('Database binding found but missing database_id');
    }
  }

  // Environment validation
  const hasProductionEnv = config.includes('[env.production]');
  if (hasProductionEnv) {
    const prodSection = config.split('[env.production]')[1];
    if (prodSection && !prodSection.includes('name =')) {
      warnings.push('Production environment missing explicit name');
    }
  }

  // Compatibility date validation
  const compatMatch = config.match(/compatibility_date = "([^"]+)"/);
  if (compatMatch) {
    const date = new Date(compatMatch[1]);
    const now = new Date();
    const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 365) {
      warnings.push(`Compatibility date is ${Math.floor(daysDiff)} days old`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    summary: {
      errors: issues.length,
      warnings: warnings.length,
      status: issues.length === 0 ? 'valid' : 'invalid'
    }
  };
}

export function parseWranglerConfig(configPath = 'wrangler.toml') {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const config = readFileSync(configPath, 'utf8');
  const parsed = {};

  // Extract main fields
  const extractField = (pattern, key) => {
    const match = config.match(pattern);
    if (match) parsed[key] = match[1];
  };

  extractField(/^name = "([^"]+)"/m, 'name');
  extractField(/^compatibility_date = "([^"]+)"/m, 'compatibilityDate');
  extractField(/^main = "([^"]+)"/m, 'main');

  // Extract database configuration
  if (config.includes('[[d1_databases]]')) {
    parsed.database = {};
    extractField(/database_name = "([^"]+)"/m, 'name');
    extractField(/database_id = "([^"]+)"/m, 'id');
    
    if (parsed.name) parsed.database.name = parsed.name;
    if (parsed.id) parsed.database.id = parsed.id;
    delete parsed.name;
    delete parsed.id;
  }

  // Extract environment configurations
  parsed.environments = {};
  const envMatches = config.matchAll(/\[env\.([^\]]+)\]/g);
  for (const match of envMatches) {
    const envName = match[1];
    parsed.environments[envName] = {};
    
    // Extract env-specific settings (simplified parsing)
    const envSection = config.split(`[env.${envName}]`)[1];
    if (envSection) {
      const nextEnv = envSection.indexOf('[env.');
      const sectionContent = nextEnv > 0 ? envSection.substring(0, nextEnv) : envSection;
      
      const nameMatch = sectionContent.match(/name = "([^"]+)"/);
      if (nameMatch) parsed.environments[envName].name = nameMatch[1];
    }
  }

  return parsed;
}

export function generateWranglerConfig(options) {
  const {
    name,
    main = 'src/worker/index.js',
    compatibilityDate = new Date().toISOString().split('T')[0],
    database = null,
    environments = {},
    vars = {},
    secrets = []
  } = options;

  let config = `# Generated Wrangler Configuration
# Timestamp: ${new Date().toISOString()}

name = "${name}"
main = "${main}"
compatibility_date = "${compatibilityDate}"
`;

  // Add variables
  if (Object.keys(vars).length > 0) {
    config += '\n[vars]\n';
    Object.entries(vars).forEach(([key, value]) => {
      config += `${key} = "${value}"\n`;
    });
  }

  // Add database configuration
  if (database) {
    config += `
[[d1_databases]]
binding = "DB"
database_name = "${database.name}"
database_id = "${database.id}"
`;
  }

  // Add environments
  Object.entries(environments).forEach(([envName, envConfig]) => {
    config += `\n[env.${envName}]\n`;
    if (envConfig.name) config += `name = "${envConfig.name}"\n`;
    
    if (envConfig.vars) {
      Object.entries(envConfig.vars).forEach(([key, value]) => {
        config += `${key} = "${value}"\n`;
      });
    }
    
    if (envConfig.database) {
      config += `
[[env.${envName}.d1_databases]]
binding = "DB"
database_name = "${envConfig.database.name}"
database_id = "${envConfig.database.id}"
`;
    }
  });

  return config;
}

export function listConfigFiles(directory = '.') {
  const configFiles = [];
  const patterns = ['wrangler.toml', 'package.json', '.env*'];
  
  try {
    const items = readdirSync(directory);
    
    items.forEach(item => {
      const path = join(directory, item);
      const stat = statSync(path);
      
      if (stat.isFile()) {
        const matches = patterns.some(pattern => {
          if (pattern.includes('*')) {
            return item.startsWith(pattern.replace('*', ''));
          }
          return item === pattern;
        });
        
        if (matches) {
          configFiles.push({
            name: item,
            path,
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    });
    
    return configFiles.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return [];
  }
}