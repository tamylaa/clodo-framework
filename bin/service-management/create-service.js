#!/usr/bin/env node

/**
 * Lego Framework - Service Template Generator
 * Creates new services from predefined templates
 */

import { ServiceCreator } from '../../src/service-management/ServiceCreator.js';

const SERVICE_TYPES = ['data-service', 'auth-service', 'content-service', 'api-gateway', 'generic'];

function showUsage() {
  console.log(`
Lego Framework - Service Template Generator

Usage: lego-create-service <service-name> [options]

Arguments:
  service-name    Name of the service to create (required)

Options:
  -t, --type <type>     Service type: ${SERVICE_TYPES.join(', ')} (default: generic)
  -o, --output <path>   Output directory (default: current directory)
  -f, --force           Overwrite existing service directory
  -h, --help           Show this help message

Examples:
  lego-create-service my-data-service --type data-service
  lego-create-service auth-api --type auth-service --output ./services
  lego-create-service my-service --force
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

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    const { serviceName, options } = parseArgs(args);

    console.log(`🚀 Creating ${options.type} service: ${serviceName}`);
    console.log(`� Using Lego Framework ServiceCreator module`);
    console.log('');

    const creator = new ServiceCreator();
    const result = await creator.createService(serviceName, options);

    if (result.success) {
      console.log('✅ Service created successfully!');
      console.log('');
      console.log('📝 Next steps:');
      console.log(`   cd ${result.serviceDir.split('/').pop() || result.serviceDir.split('\\').pop()}`);
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
    } else {
      console.error('❌ Service creation failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the generator
main();