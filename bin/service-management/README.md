# Service Management Tools

Command-line tools for creating and initializing Clodo Framework services.

## Tools

### create-service.js
Create new services from predefined templates.

**Features:**
- Multiple service types (data-service, auth-service, content-service, api-gateway, generic)
- Template-based service generation
- Customizable service configurations
- Automatic directory structure creation

**Usage:**
```bash
node bin/service-management/create-service.js my-service --type api-gateway --output ./services
```

**Options:**
- `-t, --type <type>` - Service type (default: generic)
- `-o, --output <path>` - Output directory (default: current directory)
- `-f, --force` - Overwrite existing service directory
- `-h, --help` - Show help message

### init-service.js
Initialize services with auto-generated configurations and multi-domain support.

**Features:**
- Auto-generated wrangler.toml configurations
- Domain-specific settings for multiple domains
- Service type detection and optimization
- Cloudflare account and zone integration
- Multi-domain deployment support

**Usage:**
```bash
# Single domain
node bin/service-management/init-service.js my-service --type api-gateway --domains api.example.com

# Multiple domains with account/zone info
node bin/service-management/init-service.js my-service --type api-gateway \
  --domains "api.example.com:account1:zone1,staging.example.com:account2:zone2"
```

**Options:**
- `-t, --type <type>` - Service type (default: generic)
- `-d, --domains <domains>` - Comma-separated domains (can include account:zone)
- `-e, --env <environment>` - Target environment (default: development)
- `--api-token <token>` - Cloudflare API token for domain discovery
- `--account-id <id>` - Default Cloudflare account ID
- `--zone-id <id>` - Default Cloudflare zone ID
- `-o, --output <path>` - Output directory (services created in services/ subdirectory)
- `-f, --force` - Overwrite existing service directory
- `--dry-run` - Show what would be created without creating files
- `--multi-domain` - Generate configurations for multiple domains

## Directory Structure

Services are automatically organized as:

```
your-project/
├── services/                    # Auto-created services directory
│   ├── my-api-service/         # Individual service directories
│   │   ├── wrangler.toml       # Cloudflare config
│   │   ├── src/config/domains.js # Domain configurations
│   │   ├── src/worker/index.js # Service worker
│   │   └── package.json        # Dependencies
│   ├── auth-service/           # Another service
│   └── data-service/           # Another service
└── other-project-files/
```