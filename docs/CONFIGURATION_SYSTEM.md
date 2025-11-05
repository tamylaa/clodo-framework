# Clodo Framework Configuration System

## Overview

The Clodo Framework uses a **three-tier configuration fallback system** designed to provide sensible defaults while allowing advanced customization when needed.

## Architecture

### Configuration Tiers (Priority Order)

1. **Service-level config** (highest priority)
   - Location: `<your-service>/validation-config.json`
   - Created by: `npx clodo-service init-config`
   - Use case: Service-specific customization

2. **Framework bundled config** (middle priority)
   - Location: `@tamyla/clodo-framework/dist/config/validation-config.json`
   - Included in: npm package automatically
   - Use case: Framework defaults for CLI tools

3. **Hardcoded defaults** (lowest priority)
   - Location: Embedded in code
   - Use case: Minimal fallback if no config files exist

## Design Philosophy

### ✅ **The Normal Case: No Service Config Needed**

**Most services should NOT have their own `validation-config.json`.**

The framework is designed to work out-of-the-box with sensible defaults:

```bash
# This works perfectly without any config file
npx clodo-service deploy
npx clodo-service validate
```

**Why?**
- The framework's bundled config covers 99% of use cases
- Reduces setup complexity for new services
- Maintains consistency across all services
- Easier to upgrade (no local config files to migrate)

### ⚠️ **The Advanced Case: Service-Specific Config**

**Only create `validation-config.json` if you need to:**
- Customize timeout values for your specific use case
- Add service-specific endpoints for validation
- Override platform-specific commands
- Set environment-specific requirements

## How to Use

### For Most Services (No Config)

Just use the framework - it works automatically:

```bash
# Install framework
npm install @tamyla/clodo-framework

# Use commands - no setup needed
npx clodo-service deploy
npx clodo-service validate
```

**What happens:**
1. Framework looks for service's `validation-config.json` → not found
2. Framework uses bundled `dist/config/validation-config.json` → **works!**
3. No warnings, no errors, everything just works

### For Advanced Services (Custom Config)

If you need customization:

```bash
# Step 1: Initialize config in your service
npx clodo-service init-config

# Step 2: Edit the generated validation-config.json
# Customize timing, endpoints, commands, etc.

# Step 3: Use commands - they'll use your custom config
npx clodo-service deploy
```

**What happens:**
1. Framework looks for service's `validation-config.json` → **found!**
2. Framework uses your custom config
3. Logs: "📋 Loaded configuration from: ./validation-config.json"

### Overwriting Existing Config

```bash
# Force overwrite if you want to reset to framework defaults
npx clodo-service init-config --force
```

## Configuration File Structure

The `validation-config.json` file contains:

### Timing Configuration
```json
{
  "timing": {
    "deploymentTimeout": 30000,
    "retryAttempts": 3,
    "retryDelay": 1000,
    "connectionTimeout": 5000,
    "heartbeatInterval": 5000,
    // ... more timing settings
  }
}
```

### Command Definitions
```json
{
  "commands": {
    "required": {
      "npx": "npx",
      "node": "node",
      "npm": "npm",
      "wrangler": "npx wrangler"
    },
    "cloudflare": {
      "whoami": "npx wrangler whoami",
      "deploy": "npx wrangler deploy",
      // ... more Cloudflare commands
    }
  }
}
```

### Network Endpoints
```json
{
  "networking": {
    "endpoints": {
      "cloudflare_api": "https://api.cloudflare.com",
      "npm_registry": "https://registry.npmjs.org",
      // ... more endpoints
    }
  }
}
```

### Environment Presets
```json
{
  "environments": {
    "development": {
      "deploymentTimeout": 60000,
      "retryAttempts": 5
    },
    "production": {
      "deploymentTimeout": 30000,
      "retryAttempts": 3
    }
  }
}
```

## Understanding the Warning Message

### ❌ Old Warning (Confusing)
```
⚠️  validation-config.json not found. Using default configuration values.
```

**Problem:** This implied something was wrong or missing.

### ✅ New Behavior (Clear)
- **No warning** when using framework defaults (normal case)
- **Informational message** when loading custom config:
  ```
  📋 Loaded configuration from: ./validation-config.json
  ```

## Technical Implementation

### How the Fallback Works

#### In `FrameworkConfig` class:
```javascript
// 1. Try to find service's validation-config.json
findConfigFile() {
  const possiblePaths = [
    './validation-config.json',
    '../validation-config.json',
    // ... more paths in service directory
  ];
  
  for (const path of possiblePaths) {
    if (exists(path)) return path;  // Found service config
  }
  
  return null;  // No service config (this is NORMAL)
}

// 2. Load config with fallback
loadConfig() {
  if (!this.configPath) {
    return this.getDefaultConfig();  // Use framework defaults
  }
  // ... load service config
}
```

#### In `DeploymentValidator` class:
```javascript
loadValidationConfig() {
  try {
    // Try service directory
    const configData = readFileSync('./validation-config.json', 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    // Try framework's bundled config
    try {
      const frameworkConfigData = readFileSync(FRAMEWORK_CONFIG_PATH, 'utf-8');
      return JSON.parse(frameworkConfigData);
    } catch (frameworkError) {
      // Use hardcoded minimal defaults
      return this.getDefaultConfig();
    }
  }
}
```

## Best Practices

### ✅ DO:
- Start without `validation-config.json` (use framework defaults)
- Only add config if you have specific customization needs
- Use `init-config` command to get latest framework defaults
- Document why you need custom config in your service README

### ❌ DON'T:
- Create `validation-config.json` "just in case"
- Copy old config files between services
- Modify config without understanding what each setting does
- Commit config with hardcoded credentials or secrets

## Migration Guide

### If You Have Old `validation-config.json`

**Option 1: Remove it (recommended)**
```bash
# 1. Backup current config
cp validation-config.json validation-config.json.backup

# 2. Remove it
rm validation-config.json

# 3. Test - should work with framework defaults
npx clodo-service validate
npx clodo-service deploy --dry-run

# 4. If everything works, delete backup
rm validation-config.json.backup
```

**Option 2: Update it**
```bash
# 1. Backup current config
cp validation-config.json validation-config.json.backup

# 2. Get latest framework defaults
npx clodo-service init-config --force

# 3. Merge your custom settings back in
# (manually edit validation-config.json)

# 4. Test
npx clodo-service validate
```

## Troubleshooting

### "Could not load command config, using minimal defaults"

**Cause:** Neither service config nor framework config could be loaded.

**Solution:**
```bash
# Verify framework is properly installed
npm list @tamyla/clodo-framework

# Reinstall if needed
npm install @tamyla/clodo-framework

# Initialize config if you need customization
npx clodo-service init-config
```

### "Config file not found" but I have validation-config.json

**Cause:** Config file might be in wrong location or have wrong name.

**Solution:**
```bash
# Verify file exists in service root
ls -la validation-config.json

# Verify it's valid JSON
cat validation-config.json | jq .

# If corrupted, regenerate
npx clodo-service init-config --force
```

### Commands using wrong values

**Cause:** Multiple config files with different priorities.

**Solution:**
```bash
# Check which config is being loaded (look for log message)
npx clodo-service validate

# If wrong config is loaded, remove service config to use framework defaults
rm validation-config.json
```

## Summary

| Scenario | Config Location | Behavior |
|----------|----------------|----------|
| **New service** | None | ✅ Uses framework defaults (RECOMMENDED) |
| **Standard service** | None | ✅ Uses framework defaults |
| **Custom service** | `./validation-config.json` | ✅ Uses service-specific config |
| **Framework CLI** | `@tamyla/clodo-framework/dist/config/` | ✅ Bundled with npm package |

**Key Takeaway:** The framework is designed to work perfectly without any service-level config. Only create `validation-config.json` if you have specific customization needs.
