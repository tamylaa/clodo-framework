import { describe, it, expect } from '@jest/globals';
import { MiddlewareComposer } from '../../../src/middleware/Composer.js';

describe('MiddlewareComposer', () => {
  it('executes middleware in order and calls handler', async () => {
    const events = [];
    const m1 = { preprocess: async () => { events.push('m1'); return null; } };
    const m2 = { preprocess: async () => { events.push('m2'); return null; } };

    const chain = MiddlewareComposer.compose(m1, m2);

    const handler = async (request) => new Response('ok', { status: 200 });

    const res = await chain.execute(new Request('https://example.com/'), handler);
    expect(res.status).toBe(200);
    expect(events).toEqual(['m1','m2']);
  });

  it('short-circuits when middleware returns a Response', async () => {
    const m1 = { preprocess: async () => new Response('blocked', { status: 403 }) };
    const m2 = { preprocess: async () => { throw new Error('should not be called'); } };

    const chain = MiddlewareComposer.compose(m1, m2);
    const handler = async () => new Response('ok');

    const res = await chain.execute(new Request('https://example.com/'), handler);
    expect(res.status).toBe(403);
  });
});
