# Phase 1 Task 2: Unified CLI Orchestrator Design

## Overview

Successfully designed and implemented the foundation of the unified three-tier CLI orchestrator that consolidates the existing dual-tool architecture into a single conversational interface.

## Architecture Design

### Three-Tier System Structure
1. **Tier 1: Core Input Collection** - Collects 6 required inputs
2. **Tier 2: Smart Confirmations** - Generates and confirms 15 derived values
3. **Tier 3: Automated Generation** - Creates 67 configuration files and components

### Unified CLI Interface (`bin/clodo-service.js`)
- **Primary Command**: `clodo-service create` - Interactive service creation
- **Non-Interactive Mode**: Full parameter support for CI/CD pipelines
- **Legacy Compatibility**: Aliases for `create-service` and `init-service`
- **Additional Commands**:
  - `list-types` - Display available service types and features
  - `validate <path>` - Validate existing service configuration

### Service Orchestrator (`ServiceOrchestrator.js`)
- **Main Coordination Class**: Routes between interactive and non-interactive flows
- **Integration Hub**: Combines InputCollector, ConfirmationEngine, and GenerationEngine
- **Legacy Integration**: Wraps existing ServiceCreator and ServiceInitializer classes
- **Validation Support**: Service configuration validation for existing projects

### Input Collector (`InputCollector.js`)
- **Core Input Management**: Handles collection of all 6 required inputs
- **Interactive Prompts**: User-friendly console interface with validation
- **Non-Interactive Support**: Parameter validation for automated workflows
- **Input Types**:
  1. Service Name (with format validation)
  2. Service Type (menu-driven selection)
  3. Domain Name (format validation)
  4. Cloudflare API Token (secure input)
  5. Cloudflare Account ID (32-char hex validation)
  6. Cloudflare Zone ID (32-char hex validation)
  7. Target Environment (dev/staging/prod)

### Validation System (`src/utils/validation.js`)
- **Service Name Validation**: Lowercase, alphanumeric, hyphens only
- **Domain Name Validation**: RFC-compliant domain format checking
- **Cloudflare ID Validation**: 32-character hexadecimal format
- **Service Type Validation**: Enumerated type checking
- **Environment Validation**: Development/staging/production checking

## Integration Strategy

### Backward Compatibility
- **Legacy Commands**: Existing `clodo-create-service` and `clodo-init-service` remain functional
- **Deprecation Path**: Clear migration guidance to new unified command
- **API Preservation**: Existing programmatic APIs unchanged

### Forward Compatibility
- **Template System**: Extends existing {{VARIABLE}} replacement system
- **Configuration Management**: Builds on existing domain configuration patterns
- **Cloudflare Integration**: Leverages existing D1 database and Worker deployment logic

## Implementation Status

### Completed Components
- ✅ Unified CLI interface with Commander.js
- ✅ ServiceOrchestrator coordination class
- ✅ InputCollector with full validation
- ✅ Validation utility functions
- ✅ Package.json updates (bin entry, chalk dependency)
- ✅ Legacy command aliases

### Next Steps (Phase 1 Task 3-4)
- **ConfirmationEngine**: Smart confirmation system for 15 derived values
- **GenerationEngine**: Automated generation of 67 configuration components
- **UI Template Integration**: Load templates from ui-structures/ folders
- **Service Manifest**: Document all generated components

## Technical Decisions

### Dependency Choices
- **chalk**: For colored console output (already used in existing scripts)
- **Commander.js**: Consistent with existing CLI tools
- **Readline**: For interactive input collection

### Design Patterns
- **Class-based Architecture**: Matches existing ServiceCreator/ServiceInitializer pattern
- **Separation of Concerns**: Each tier has dedicated classes
- **Error Handling**: Comprehensive error propagation and user-friendly messages
- **Validation First**: Input validation before processing

### User Experience
- **Progressive Disclosure**: Information revealed as needed
- **Clear Feedback**: Step-by-step progress indication
- **Error Recovery**: Helpful error messages with correction guidance
- **Non-Interactive Support**: Full CI/CD pipeline compatibility

This design provides a solid foundation for the complete three-tier system while maintaining compatibility with existing workflows and codebases.</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\clodo-framework\docs\architecture\PHASE1_TASK2_DESIGN.md