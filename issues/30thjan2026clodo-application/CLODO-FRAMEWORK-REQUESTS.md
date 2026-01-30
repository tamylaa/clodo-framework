# Clodo-Framework Integration Requirements

**Date**: January 30, 2026  
**Version**: 1.0  
**Focus**: API enhancements needed to support programmatic integration with clodo-application

---

## Executive Summary

This document specifies comprehensive API enhancements required in clodo-framework to enable 100% parameter synchronization and establish effective feedback loops with clodo-application. The current framework APIs are designed for interactive CLI usage but lack programmatic integration capabilities.

---

## Current State Analysis

### Framework API Limitations

1. **Interactive-Only APIs**: `createService()` launches CLI wizard, not suitable for programmatic use
2. **No Parameter Discovery**: No way for applications to discover accepted parameters
3. **Validation Fragmentation**: Individual field validators but no unified payload validation
4. **Enum Inconsistencies**: Validation functions reject valid clodo-application enum values
5. **Passthrough Issues**: `clodo` field handling is unclear and potentially broken
6. **No Compatibility APIs**: No version checking or compatibility validation

### Integration Impact

- **Programmatic Integration**: ❌ Impossible - falls back to CLI mode
- **Parameter Utilization**: ⚠️ Limited to framework's current API surface
- **Error Visibility**: ❌ Poor error messages for integration issues
- **Future Compatibility**: ❌ No version checking or capability discovery

---

## Detailed API Enhancement Requirements

### Phase 1: Core Programmatic APIs (High Priority)

#### 1.1 Programmatic Service Creation API

**Problem**: `createService()` launches interactive CLI, breaking programmatic integration

**Requirement**: Add programmatic service creation method to ServiceOrchestrator

**API Specification**:

```typescript
// src/service-management/ServiceOrchestrator.ts

export interface ServicePayload {
  serviceName: string;
  serviceType: string;
  domain: string;
  description?: string;
  template?: string;
  features?: string[];
  bindings?: string[];
  resources?: Record<string, any>;
  specs?: Record<string, any>;
  clodo?: Record<string, any>; // Passthrough data
  bindingsDetail?: Record<string, any>;
}

export interface ServiceCreationResult {
  success: boolean;
  serviceId?: string;
  servicePath?: string;
  errors?: string[];
  warnings?: string[];
}

export class ServiceOrchestrator {
  // EXISTING: Interactive service creation
  async runInteractive(): Promise<void> { /* ... */ }

  // NEW: Programmatic service creation
  async createService(payload: ServicePayload): Promise<ServiceCreationResult> {
    try {
      // Validate payload
      const validation = await this.validateServicePayload(payload);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Create service programmatically
      const serviceId = await this.createServiceInternal(payload);
      const servicePath = await this.generateServiceFiles(payload);

      // Apply features and configurations
      await this.applyFeatures(payload);
      await this.applyBindings(payload);
      await this.applyResources(payload);

      // Handle passthrough data
      if (payload.clodo) {
        await this.applyClodoConfiguration(payload.clodo);
      }

      return {
        success: true,
        serviceId,
        servicePath,
        warnings: validation.warnings
      };
    } catch (error) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  // Helper methods (implementation details)
  private async validateServicePayload(payload: ServicePayload): Promise<ValidationResult> { /* ... */ }
  private async createServiceInternal(payload: ServicePayload): Promise<string> { /* ... */ }
  private async generateServiceFiles(payload: ServicePayload): Promise<string> { /* ... */ }
  private async applyFeatures(payload: ServicePayload): Promise<void> { /* ... */ }
  private async applyBindings(payload: ServicePayload): Promise<void> { /* ... */ }
  private async applyResources(payload: ServicePayload): Promise<void> { /* ... */ }
  private async applyClodoConfiguration(clodoData: Record<string, any>): Promise<void> { /* ... */ }
}
```

**Implementation Notes**:
- Method should be non-interactive and return structured results
- Should handle all payload fields comprehensively
- Should preserve and utilize `clodo` passthrough data
- Should provide detailed error and warning information

**Testing Requirements**:
```typescript
// test/service-orchestrator-programmatic.test.ts
describe('ServiceOrchestrator.createService', () => {
  it('should create service programmatically', async () => {
    const payload: ServicePayload = {
      serviceName: 'test-service',
      serviceType: 'api-service',
      domain: 'test.example.com',
      features: ['d1', 'metrics']
    };

    const result = await orchestrator.createService(payload);
    expect(result.success).toBe(true);
    expect(result.serviceId).toBeDefined();
  });
});
```

#### 1.2 Standalone Programmatic Creation Function

**Problem**: Class-based API may not be suitable for all integration scenarios

**Requirement**: Provide standalone function for service creation

**API Specification**:

```typescript
// src/simple-api.ts

export interface ServiceCreationOptions {
  dryRun?: boolean;
  outputDir?: string;
  templateDir?: string;
  skipValidation?: boolean;
}

export async function createServiceProgrammatic(
  payload: ServicePayload,
  options: ServiceCreationOptions = {}
): Promise<ServiceCreationResult> {
  const orchestrator = new ServiceOrchestrator();

  // Apply options
  if (options.dryRun) {
    orchestrator.setDryRunMode(true);
  }
  if (options.outputDir) {
    orchestrator.setOutputDirectory(options.outputDir);
  }

  return await orchestrator.createService(payload);
}

// Maintain backward compatibility
export const createService = createServiceProgrammatic;
```

**Benefits**:
- Easier to import and use
- Consistent with existing `createService` export
- Flexible options for different use cases

#### 1.3 Enum and Validation Alignment

**Problem**: Validation functions reject valid clodo-application enum values

**Requirement**: Align validation functions with clodo-application expectations

**API Specification**:

```typescript
// src/validation/service-validation.ts

// Updated service type validation
export function validateServiceType(serviceType: string): boolean {
  const validTypes = [
    'api-service',  // Align with clodo-application
    'data-service', // Align with clodo-application
    'worker',       // Align with clodo-application
    'pages',        // Align with clodo-application
    'gateway'       // Align with clodo-application
  ];
  return validTypes.includes(serviceType);
}

// Updated feature validation
export function validateFeatures(features: string[]): boolean {
  const validFeatures = [
    'd1',            // Align with clodo-application
    'upstash',       // Align with clodo-application
    'r2',            // Align with clodo-application
    'pages',         // Align with clodo-application
    'ws',            // Align with clodo-application
    'durableObject', // Align with clodo-application
    'cron',          // Align with clodo-application
    'metrics'        // Align with clodo-application
  ];

  return features.every(feature => validFeatures.includes(feature));
}

// Updated individual feature validation
export function validateFeature(feature: string): boolean {
  return validateFeatures([feature]);
}
```

**Breaking Change Notice**: This may affect existing framework users. Consider deprecation warnings.

### Phase 2: Parameter Discovery and Introspection (Medium Priority)

#### 2.1 Parameter Discovery API

**Problem**: Applications cannot discover what parameters are accepted

**Requirement**: Provide API for parameter introspection

**API Specification**:

```typescript
// src/types/parameter-definition.ts

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  enum?: string[];
  defaultValue?: any;
  validationRules?: ValidationRule[];
  sinceVersion?: string;
}

export interface ValidationRule {
  rule: string;
  value?: any;
  message: string;
}
```

```typescript
// src/api/parameter-discovery.ts

export async function getAcceptedParameters(): Promise<Record<string, ParameterDefinition>> {
  return {
    serviceName: {
      name: 'serviceName',
      type: 'string',
      required: true,
      description: 'Unique identifier for the service',
      validationRules: [
        { rule: 'pattern', value: '^[a-z0-9-]+$', message: 'Must contain only lowercase letters, numbers, and hyphens' },
        { rule: 'minLength', value: 3, message: 'Must be at least 3 characters' },
        { rule: 'maxLength', value: 50, message: 'Must be at most 50 characters' }
      ]
    },
    serviceType: {
      name: 'serviceType',
      type: 'string',
      required: true,
      description: 'Type of service to create',
      enum: ['api-service', 'data-service', 'worker', 'pages', 'gateway']
    },
    domain: {
      name: 'domain',
      type: 'string',
      required: true,
      description: 'Domain for the service',
      validationRules: [
        { rule: 'pattern', value: '^([a-z0-9]+(-[a-z0-9]+)*\\.)+[a-z]{2,}$', message: 'Must be a valid domain name' }
      ]
    },
    description: {
      name: 'description',
      type: 'string',
      required: false,
      description: 'Human-readable description of the service'
    },
    template: {
      name: 'template',
      type: 'string',
      required: false,
      description: 'Template to use for service generation',
      defaultValue: 'generic'
    },
    features: {
      name: 'features',
      type: 'array',
      required: false,
      description: 'Features to enable for the service',
      enum: ['d1', 'upstash', 'r2', 'pages', 'ws', 'durableObject', 'cron', 'metrics']
    },
    bindings: {
      name: 'bindings',
      type: 'array',
      required: false,
      description: 'Resource bindings for the service'
    },
    resources: {
      name: 'resources',
      type: 'object',
      required: false,
      description: 'Resource configuration'
    },
    specs: {
      name: 'specs',
      type: 'object',
      required: false,
      description: 'Service specifications (memory, CPU, etc.)'
    },
    clodo: {
      name: 'clodo',
      type: 'object',
      required: false,
      description: 'Passthrough data for clodo-application specific configuration'
    }
  };
}

export async function getFrameworkCapabilities(): Promise<FrameworkCapabilities> {
  return {
    version: FRAMEWORK_VERSION,
    supportsProgrammaticCreation: true,
    supportedServiceTypes: ['api-service', 'data-service', 'worker', 'pages', 'gateway'],
    supportedFeatures: ['d1', 'upstash', 'r2', 'pages', 'ws', 'durableObject', 'cron', 'metrics'],
    hasParameterDiscovery: true,
    hasUnifiedValidation: true,
    supportsPassthrough: true
  };
}
```

#### 2.2 Unified Payload Validation

**Problem**: Individual validators exist but no comprehensive payload validation

**Requirement**: Add unified payload validation function

**API Specification**:

```typescript
// src/validation/payload-validation.ts

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
  expected?: any;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export async function validateServicePayload(payload: ServicePayload): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required field validation
  const requiredFields = ['serviceName', 'serviceType', 'domain'];
  for (const field of requiredFields) {
    if (!payload[field]) {
      errors.push({
        field,
        code: 'REQUIRED_FIELD_MISSING',
        message: `Required field '${field}' is missing`
      });
    }
  }

  // Field-specific validation
  if (payload.serviceName) {
    if (typeof payload.serviceName !== 'string') {
      errors.push({
        field: 'serviceName',
        code: 'INVALID_TYPE',
        message: 'serviceName must be a string',
        value: payload.serviceName,
        expected: 'string'
      });
    } else if (!/^[a-z0-9-]+$/.test(payload.serviceName)) {
      errors.push({
        field: 'serviceName',
        code: 'INVALID_FORMAT',
        message: 'serviceName must contain only lowercase letters, numbers, and hyphens'
      });
    }
  }

  if (payload.serviceType) {
    if (!validateServiceType(payload.serviceType)) {
      errors.push({
        field: 'serviceType',
        code: 'INVALID_ENUM_VALUE',
        message: `Invalid serviceType: ${payload.serviceType}`,
        value: payload.serviceType,
        expected: ['api-service', 'data-service', 'worker', 'pages', 'gateway']
      });
    }
  }

  if (payload.features) {
    if (!Array.isArray(payload.features)) {
      errors.push({
        field: 'features',
        code: 'INVALID_TYPE',
        message: 'features must be an array',
        value: payload.features,
        expected: 'array'
      });
    } else if (!validateFeatures(payload.features)) {
      const invalidFeatures = payload.features.filter(f => !validateFeature(f));
      errors.push({
        field: 'features',
        code: 'INVALID_ENUM_VALUES',
        message: `Invalid features: ${invalidFeatures.join(', ')}`,
        value: invalidFeatures,
        expected: ['d1', 'upstash', 'r2', 'pages', 'ws', 'durableObject', 'cron', 'metrics']
      });
    }
  }

  // Cross-field validation
  if (payload.serviceType === 'pages' && payload.features?.includes('d1')) {
    warnings.push({
      field: 'features',
      code: 'POTENTIAL_CONFLICT',
      message: 'Pages services typically don\'t use D1 database',
      suggestion: 'Consider using R2 for static asset storage instead'
    });
  }

  // Passthrough validation
  if (payload.clodo) {
    if (typeof payload.clodo !== 'object') {
      warnings.push({
        field: 'clodo',
        code: 'INVALID_PASSTHROUGH_TYPE',
        message: 'clodo passthrough should be an object',
        suggestion: 'Ensure clodo data is properly structured'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Phase 3: Enhanced Integration Support (Low Priority)

#### 3.1 Version Compatibility API

**Problem**: No way to check version compatibility

**Requirement**: Add version checking and compatibility APIs

**API Specification**:

```typescript
// src/api/version-compatibility.ts

export interface CompatibilityResult {
  compatible: boolean;
  frameworkVersion: string;
  minimumApplicationVersion?: string;
  breakingChanges?: string[];
  recommendations?: string[];
}

export function getFrameworkVersion(): string {
  return FRAMEWORK_VERSION;
}

export function checkApplicationCompatibility(applicationVersion: string): CompatibilityResult {
  const frameworkVersion = getFrameworkVersion();

  // Version compatibility logic
  const result: CompatibilityResult = {
    compatible: true,
    frameworkVersion,
    minimumApplicationVersion: '0.1.0'
  };

  // Check for known compatibility issues
  if (applicationVersion < '0.1.0') {
    result.compatible = false;
    result.breakingChanges = [
      'Programmatic API requires application version 0.1.0 or higher'
    ];
  }

  // Framework version specific checks
  if (frameworkVersion >= '5.0.0') {
    result.recommendations = [
      'Update to latest application version for full feature support'
    ];
  }

  return result;
}

export function getSupportedApplicationVersions(): string[] {
  return ['0.1.0', '0.2.0', '1.0.0']; // Supported application versions
}
```

#### 3.2 Enhanced Error Messages

**Problem**: Poor error messages for integration issues

**Requirement**: Provide detailed, actionable error messages

**API Specification**:

```typescript
// src/errors/integration-errors.ts

export class IntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class PayloadValidationError extends IntegrationError {
  constructor(validationResult: ValidationResult) {
    super(
      `Service payload validation failed: ${validationResult.errors.length} errors`,
      'PAYLOAD_VALIDATION_FAILED',
      { validationResult }
    );
  }
}

export class ParameterNotSupportedError extends IntegrationError {
  constructor(parameterName: string, frameworkVersion: string) {
    super(
      `Parameter '${parameterName}' not supported in framework version ${frameworkVersion}`,
      'PARAMETER_NOT_SUPPORTED',
      { parameterName, frameworkVersion }
    );
  }
}

export class VersionCompatibilityError extends IntegrationError {
  constructor(applicationVersion: string, frameworkVersion: string) {
    super(
      `Application version ${applicationVersion} not compatible with framework version ${frameworkVersion}`,
      'VERSION_INCOMPATIBILITY',
      { applicationVersion, frameworkVersion }
    );
  }
}
```

#### 3.3 Integration Testing Support

**Problem**: No utilities for integration testing

**Requirement**: Provide test utilities and mock services

**API Specification**:

```typescript
// src/testing/integration-testing.ts

export class MockServiceOrchestrator {
  private createdServices: ServicePayload[] = [];

  async createService(payload: ServicePayload): Promise<ServiceCreationResult> {
    // Validate payload
    const validation = await validateServicePayload(payload);
    if (!validation.valid) {
      return { success: false, errors: validation.errors.map(e => e.message) };
    }

    // Store for testing
    this.createdServices.push(payload);

    return {
      success: true,
      serviceId: `mock-${payload.serviceName}`,
      servicePath: `/mock/path/${payload.serviceName}`
    };
  }

  getCreatedServices(): ServicePayload[] {
    return this.createdServices;
  }

  reset(): void {
    this.createdServices = [];
  }
}

export function createMockFramework(): {
  ServiceOrchestrator: typeof MockServiceOrchestrator;
  createService: (payload: ServicePayload) => Promise<ServiceCreationResult>;
  getAcceptedParameters: () => Promise<Record<string, ParameterDefinition>>;
} {
  const mockOrchestrator = new MockServiceOrchestrator();

  return {
    ServiceOrchestrator: MockServiceOrchestrator,
    createService: (payload) => mockOrchestrator.createService(payload),
    getAcceptedParameters: () => Promise.resolve({
      // Mock parameter definitions
      serviceName: { name: 'serviceName', type: 'string', required: true },
      serviceType: { name: 'serviceType', type: 'string', required: true, enum: ['api-service'] },
      domain: { name: 'domain', type: 'string', required: true }
    })
  };
}
```

---

## Implementation Timeline

### Month 1: Core APIs
- [ ] Implement `ServiceOrchestrator.createService(payload)`
- [ ] Add `createServiceProgrammatic()` function
- [ ] Align enum validation functions
- [ ] Fix `clodo` passthrough handling

### Month 2: Discovery and Validation
- [ ] Add `getAcceptedParameters()` API
- [ ] Implement `validateServicePayload()` function
- [ ] Add `getFrameworkCapabilities()` API
- [ ] Create parameter definitions

### Month 3: Enhanced Integration
- [ ] Add version compatibility APIs
- [ ] Implement enhanced error messages
- [ ] Create integration testing utilities
- [ ] Update documentation

---

## Success Metrics

1. **Programmatic API**: ✅ `ServiceOrchestrator.createService(payload)` works without CLI
2. **Parameter Discovery**: ✅ Applications can discover accepted parameters
3. **Unified Validation**: ✅ Complete payload validation with detailed errors
4. **Enum Alignment**: ✅ Validation accepts clodo-application enum values
5. **Passthrough Support**: ✅ `clodo` field properly handled
6. **Version Compatibility**: ✅ Version checking and compatibility warnings

---

## Backward Compatibility

### Breaking Changes
- Enum validation changes may affect existing users
- New required parameters for programmatic API

### Mitigation Strategies
- Deprecation warnings for 2-3 releases
- Feature flags for new validation behavior
- Clear migration guides
- Backward compatibility mode

---

## Testing Requirements

### Unit Tests
- Parameter validation functions
- Payload validation
- Service creation logic
- Error handling

### Integration Tests
- End-to-end service creation
- Parameter discovery
- Version compatibility
- Error scenarios

### Compatibility Tests
- Multiple application versions
- Framework version matrix
- Parameter mapping edge cases

---

## Documentation Requirements

1. **API Reference**: Complete API documentation for new methods
2. **Integration Guide**: How to integrate with clodo-application
3. **Migration Guide**: For existing framework users
4. **Parameter Reference**: Complete parameter specifications
5. **Error Reference**: Error codes and resolution steps

---

## Risk Assessment

### High Risk
- Enum changes may break existing integrations
- Programmatic API implementation complexity

### Medium Risk
- Parameter discovery API design
- Version compatibility logic

### Low Risk
- Enhanced error messages
- Testing utilities

---

## Dependencies

### Internal Dependencies
- Existing ServiceOrchestrator class
- Validation functions
- Service creation logic

### External Dependencies
- None (framework should remain independent)

This comprehensive enhancement plan will provide clodo-framework with the APIs needed for robust, programmatic integration with clodo-application while maintaining backward compatibility and providing clear upgrade paths.