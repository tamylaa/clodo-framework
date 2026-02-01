# Programmatic CreateService Example

This example demonstrates how to use the programmatic API to create a service and handle validation results.

Usage (Node.js):

```js
import { createService } from '@tamyla/clodo-framework/programmatic/createService.js';

const payload = {
  serviceName: 'example-service',
  serviceType: 'generic',
  domain: 'example.com',
  features: ['metrics']
};

(async () => {
  const res = await createService(payload, { dryRun: true, outputDir: './tmp/example' });

  if (!res.success) {
    console.error('Create failed:', res.errors, res.validationReport);
    return;
  }

  console.log('Create succeeded:', res.servicePath);
  console.log('Validation report:', res.validationReport);
})();
```
