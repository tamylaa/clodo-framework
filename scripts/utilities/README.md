# Utility Scripts

General utility scripts for maintenance, validation, and operations.

## Scripts

### check-bundle.js
Validate and check bundle integrity for deployments.

**Features:**
- Bundle size validation
- Dependency checking
- Asset verification
- Performance metrics

**Usage:**
```bash
node scripts/utilities/check-bundle.js
```

### cleanup-cli.js
Clean up CLI tools and temporary files.

**Features:**
- Remove temporary files
- Clean build artifacts
- Clear cache directories
- Disk space optimization

**Usage:**
```bash
node scripts/utilities/cleanup-cli.js
```

### generate-secrets.js
Generate secure secrets and tokens for services.

**Features:**
- Cryptographically secure random generation
- Multiple secret types (API keys, JWT secrets, etc.)
- Configurable entropy levels
- Secure storage recommendations

**Usage:**
```bash
node scripts/utilities/generate-secrets.js --type jwt --length 256
```

### validate-schema.js
Validate configuration schemas and data structures.

**Features:**
- JSON schema validation
- Configuration file checking
- Data structure verification
- Error reporting and suggestions

**Usage:**
```bash
node scripts/utilities/validate-schema.js --file config/domains.js --schema domain-schema.json
```