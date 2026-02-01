import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createService } from '../../src/programmatic/createService.js';

(async () => {
  const tmpDir = path.join(os.tmpdir(), `prog-create-example-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  const payload = {
    serviceName: 'example-service',
    serviceType: 'generic',
    domain: 'example.com'
  };

  const result = await createService(payload, { dryRun: true, outputDir: tmpDir });

  console.log('Result:', result);
})();
