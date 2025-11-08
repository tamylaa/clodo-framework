// Test script to verify imports from the packaged clodo-framework
import { ClodoFramework } from '@tamyla/clodo-framework';
import { GenericDataService } from '@tamyla/clodo-framework';
import { SchemaManager } from '@tamyla/clodo-framework';
import { SecurityCLI } from '@tamyla/clodo-framework';

console.log('✅ All imports successful!');

// Test basic functionality
const framework = new ClodoFramework();
console.log('✅ Framework instantiated');

const dataService = new GenericDataService();
console.log('✅ DataService instantiated');

const schemaManager = new SchemaManager();
console.log('✅ SchemaManager instantiated');

const securityCLI = new SecurityCLI();
console.log('✅ SecurityCLI instantiated');

console.log('🎉 All tests passed! Package is working correctly.');