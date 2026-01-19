import { describe, it, expect } from '@jest/globals';
import { cors } from '../../../src/middleware/shared/cors.js';

describe('CORS middleware', () => {
  it('responds to OPTIONS with 204 and headers', async () => {
    const mw = cors();
    const res = await mw.preprocess(new Request('https://example.com/', { method: 'OPTIONS' }));
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('adds header in postprocess', async () => {
    const mw = cors({ origin: 'https://foo.test' });
    const init = { status: 200, headers: { 'Content-Type': 'text/plain' } };
    const original = new Response('hello', init);
    const res = await mw.postprocess(original);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://foo.test');
  });
});
