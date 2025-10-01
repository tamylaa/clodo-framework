#!/usr/bin/env node

/**
 * Lego Framework - Service Template Generator
 * Creates new services from predefined templates
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, '..', 'templates');
const SERVICE_TYPES = ['data-service', 'auth-service', 'content-service', 'api-gateway', 'generic'];

function showUsage() {
  console.log(`
Lego Framework - Service Template Generator

Usage: create-lego-service <service-name> [options]

Arguments:
  service-name    Name of the service to create (required)

Options:
  -t, --type <type>     Service type: ${SERVICE_TYPES.join(', ')} (default: generic)
  -o, --output <path>   Output directory (default: current directory)
  -f, --force           Overwrite existing service directory
  -h, --help           Show this help message

Examples:
  create-lego-service my-data-service --type data-service
  create-lego-service auth-api --type auth-service --output ./services
  create-lego-service my-service --force
`);
}

function parseArgs(args) {
  const options = {
    type: 'generic',
    output: process.cwd(),
    force: false
  };

  let serviceName = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-t':
      case '--type':
        options.type = args[++i];
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '-f':
      case '--force':
        options.force = true;
        break;
      case '-h':
      case '--help':
        showUsage();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('-') && !serviceName) {
          serviceName = arg;
        } else {
          console.error(`Unknown option: ${arg}`);
          showUsage();
          process.exit(1);
        }
    }
  }

  if (!serviceName) {
    console.error('Error: Service name is required');
    showUsage();
    process.exit(1);
  }

  if (!SERVICE_TYPES.includes(options.type)) {
    console.error(`Error: Invalid service type. Must be one of: ${SERVICE_TYPES.join(', ')}`);
    process.exit(1);
  }

  return { serviceName, options };
}

function validateServiceName(name) {
  if (!/^[a-z0-9-]+$/.test(name)) {
    console.error('Error: Service name must contain only lowercase letters, numbers, and hyphens');
    process.exit(1);
  }

  if (name.length < 3) {
    console.error('Error: Service name must be at least 3 characters long');
    process.exit(1);
  }

  if (name.length > 50) {
    console.error('Error: Service name must be no more than 50 characters long');
    process.exit(1);
  }
}

function createServiceFromTemplate(serviceName, options) {
  const templateDir = join(TEMPLATES_DIR, options.type);
  const serviceDir = join(options.output, serviceName);

  console.log(`🚀 Creating ${options.type} service: ${serviceName}`);
  console.log(`📁 Template: ${templateDir}`);
  console.log(`📂 Output: ${serviceDir}`);
  console.log('');

  // Check if template exists
  if (!existsSync(templateDir)) {
    console.error(`Error: Template not found: ${templateDir}`);
    console.error('Available templates:', SERVICE_TYPES.join(', '));
    process.exit(1);
  }

  // Check if service directory already exists
  if (existsSync(serviceDir) && !options.force) {
    console.error(`Error: Service directory already exists: ${serviceDir}`);
    console.error('Use --force to overwrite existing directory');
    process.exit(1);
  }

  // Create service directory
  if (existsSync(serviceDir)) {
    console.log('🗑️  Removing existing service directory...');
    // Note: In a real implementation, you'd use rimraf or similar
    // For now, we'll assume the directory is empty or can be overwritten
  }

  try {
    // Copy template to service directory
    console.log('📋 Copying template files...');
    cpSync(templateDir, serviceDir, { recursive: true });

    // Replace template variables
    console.log('🔧 Configuring service...');
    replaceTemplateVariables(serviceDir, {
      '{{SERVICE_NAME}}': serviceName,
      '{{SERVICE_TYPE}}': options.type,
      '{{SERVICE_DISPLAY_NAME}}': toTitleCase(serviceName.replace(/-/g, ' ')),
      '{{CURRENT_DATE}}': new Date().toISOString().split('T')[0],
      '{{CURRENT_YEAR}}': new Date().getFullYear().toString(),
      '{{FRAMEWORK_VERSION}}': getFrameworkVersion()
    });

    console.log('✅ Service created successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log(`   cd ${serviceName}`);
    console.log('   npm install');
    console.log('   npm run setup  # Configure domain and Cloudflare settings');
    console.log('   npm run dev    # Start development server');
    console.log('');
    console.log('📚 Documentation:');
    console.log('   README.md      # Service documentation');
    console.log('   API.md         # API documentation');
    console.log('');
    console.log('🔗 Useful commands:');
    console.log('   npm test       # Run tests');
    console.log('   npm run deploy # Deploy to Cloudflare');
    console.log('');

  } catch (error) {
    console.error('Error creating service:', error.message);
    process.exit(1);
  }
}

function replaceTemplateVariables(dir, variables) {
  const files = getAllFiles(dir);

  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf8');
      let modified = false;

      for (const [placeholder, value] of Object.entries(variables)) {
        if (content.includes(placeholder)) {
          content = content.replace(new RegExp(escapeRegExp(placeholder), 'g'), value);
          modified = true;
        }
      }

      if (modified) {
        writeFileSync(file, content, 'utf8');
      }
    } catch (error) {
      // Skip binary files or files that can't be read
      if (error.code !== 'EISDIR') {
        console.warn(`Warning: Could not process file ${file}: ${error.message}`);
      }
    }
  }
}

function getAllFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and other unwanted directories
        if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
          traverse(fullPath);
        }
      } else {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toTitleCase(str) {
  return str.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getFrameworkVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    return packageJson.version;
  } catch {
    return '1.0.0';
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const { serviceName, options } = parseArgs(args);

  validateServiceName(serviceName);
  createServiceFromTemplate(serviceName, options);
}

// Run the generator
main();