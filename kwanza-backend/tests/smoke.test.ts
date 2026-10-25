import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { anon, createCtx, resetDb } from './helpers.js';

const ctx = createCtx();
beforeEach(() => resetDb(ctx.db));
afterAll(() => ctx.close());

describe('smoke', () => {
  it('health e 404 JSON', async () => {
    await anon(ctx).get('/health').expect(200);
    const r = await anon(ctx).get('/api/v1/nao-existe').expect(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
  });
  it('bd acessível', async () => {
    expect(await ctx.db.user.count()).toBe(0);
  });
});
