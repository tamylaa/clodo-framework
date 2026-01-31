import { validateServicePayload } from '../src/validation/payloadValidation.js';

const cases = [
  { payload: { serviceName: 'Invalid Name', serviceType: 'generic', domain: 'example.com' }, name: 'invalid name' },
  { payload: { serviceName: 'svc2', serviceType: 'unknown-type', domain: 'example.com' }, name: 'invalid type' },
  { payload: { serviceName: 'svc3', serviceType: 'generic', domain: 'example.com', features: ['d1','nonsense'] }, name: 'invalid feature' }
];

for (const c of cases) {
  const res = validateServicePayload(c.payload);
  console.log('CASE:', c.name, JSON.stringify(res, null, 2));
}
