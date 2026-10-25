import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ORIGIN, PASSWORD, anon, createCtx, insertUser, loginAgent, resetDb, tokenFromMail } from './helpers.js';

const ctx = createCtx({ LOGIN_MAX_FAILURES: '3', LOGIN_LOCK_MINUTES: '15' });
beforeEach(async () => { await resetDb(ctx.db); ctx.mailer.clear(); });
afterAll(() => ctx.close());

describe('registo', () => {
  it('regista estudante, cria perfil e envia email de verificação', async () => {
    const r = await anon(ctx).post('/api/v1/auth/register/student').send({ name: 'Maria Silva', email: 'Maria@Exemplo.com', password: PASSWORD }).expect(201);
    expect(r.body.data).toMatchObject({ email: 'maria@exemplo.com', role: 'STUDENT', emailVerified: false });
    expect(r.body.data.passwordHash).toBeUndefined();
    await ctx.authService.drain();
    expect(ctx.mailer.last('maria@exemplo.com')?.text).toContain('/verify-email?token=');
    expect(await ctx.db.studentProfile.count()).toBe(1);
  });

  it('regista mentor como PENDING (nunca verificado)', async () => {
    await anon(ctx).post('/api/v1/auth/register/mentor').send({ name: 'João', email: 'joao@exemplo.com', password: PASSWORD, specialties: ['candidaturas'] }).expect(201);
    const p = await ctx.db.mentorProfile.findFirstOrThrow();
    expect(p.verificationStatus).toBe('PENDING');
  });

  it('não permite escolher o papel ADMIN', async () => {
    const r = await anon(ctx).post('/api/v1/auth/register/student').send({ name: 'Eve', email: 'eve@exemplo.com', password: PASSWORD, role: 'ADMIN' });
    expect(r.status).toBe(400); // .strict() rejeita campos desconhecidos
    expect(await ctx.db.user.count({ where: { role: 'ADMIN' } })).toBe(0);
  });

  it('rejeita senha fraca e email duplicado', async () => {
    await anon(ctx).post('/api/v1/auth/register/student').send({ name: 'Ana', email: 'ana@exemplo.com', password: 'curta1' }).expect(400);
    await anon(ctx).post('/api/v1/auth/register/student').send({ name: 'Ana', email: 'ana@exemplo.com', password: PASSWORD }).expect(201);
    const dup = await anon(ctx).post('/api/v1/auth/register/mentor').send({ name: 'Ana', email: 'ana@exemplo.com', password: PASSWORD }).expect(409);
    expect(dup.body.error.code).toBe('EMAIL_IN_USE');
  });
});

describe('login / sessão', () => {
  it('login define cookies HttpOnly e /users/me funciona', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    expect(a.cookies.join(';')).toMatch(/kw_access=.*HttpOnly/);
    expect(a.cookies.join(';')).toMatch(/kw_refresh=[^;]*; Path=\/api\/v1\/auth;.*HttpOnly/s);
    const me = await a.get('/api/v1/users/me').expect(200);
    expect(me.body.data.email).toBe('a@exemplo.com');
  });

  it('credenciais inválidas: mesma mensagem para email inexistente e senha errada', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const wrong = await anon(ctx).post('/api/v1/auth/login').send({ email: 'a@exemplo.com', password: 'Errada12345' }).expect(401);
    const none = await anon(ctx).post('/api/v1/auth/login').send({ email: 'x@exemplo.com', password: 'Errada12345' }).expect(401);
    expect(wrong.body.error.message).toBe(none.body.error.message);
  });

  it('bloqueia temporariamente após tentativas excessivas (mesmo com a senha certa)', async () => {
    await insertUser(ctx, { email: 'lock@exemplo.com', role: 'STUDENT' });
    for (let i = 0; i < 3; i++) await anon(ctx).post('/api/v1/auth/login').send({ email: 'lock@exemplo.com', password: 'Errada12345' }).expect(401);
    const locked = await anon(ctx).post('/api/v1/auth/login').send({ email: 'lock@exemplo.com', password: PASSWORD }).expect(429);
    expect(locked.body.error.code).toBe('ACCOUNT_TEMPORARILY_LOCKED');
  });

  it('logout invalida imediatamente o access token', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    const cookie = a.cookies.find((c) => c.startsWith('kw_access='))!.split(';')[0]!;
    await a.post('/api/v1/auth/logout').expect(204);
    // reutilizar o cookie antigo manualmente
    await anon(ctx).get('/api/v1/users/me').set('Cookie', cookie).expect(401);
  });

  it('refresh rotaciona o token e detecta reutilização (revoga tudo)', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    const oldRefresh = a.cookies.find((c) => c.startsWith('kw_refresh='))!.split(';')[0]!;
    await a.post('/api/v1/auth/refresh').expect(200);
    // token antigo reutilizado -> 401 e todas as sessões revogadas
    await anon(ctx).post('/api/v1/auth/refresh').set('Origin', ORIGIN).set('Cookie', oldRefresh).expect(401);
    await a.get('/api/v1/users/me').expect(401);
  });

  it('conta desactivada não consegue autenticar', async () => {
    const u = await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    await ctx.db.user.update({ where: { id: u.id }, data: { isActive: false } });
    await anon(ctx).post('/api/v1/auth/login').send({ email: 'a@exemplo.com', password: PASSWORD }).expect(403);
  });

  it('CSRF: pedido com cookie e Origin não autorizada é rejeitado', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    const r = await a.raw.patch('/api/v1/users/me').set('Origin', 'https://evil.example').send({ name: 'Hack' }).expect(403);
    expect(r.body.error.code).toBe('CSRF_REJECTED');
    await a.raw.patch('/api/v1/users/me').send({ name: 'Sem Origin' }).expect(403);
  });

  it('CORS não autoriza origens desconhecidas', async () => {
    const r = await anon(ctx).options('/api/v1/auth/login').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('verificação de email', () => {
  it('confirma o email com token de uso único', async () => {
    await anon(ctx).post('/api/v1/auth/register/student').send({ name: 'Ana', email: 'ana@exemplo.com', password: PASSWORD }).expect(201);
    await ctx.authService.drain();
    const token = tokenFromMail(ctx.mailer.last('ana@exemplo.com')!.text);
    await anon(ctx).post('/api/v1/auth/verify-email').send({ token }).expect(200);
    expect((await ctx.db.user.findUniqueOrThrow({ where: { email: 'ana@exemplo.com' } })).emailVerifiedAt).not.toBeNull();
    await anon(ctx).post('/api/v1/auth/verify-email').send({ token }).expect(400);
  });
});

describe('recuperação de senha', () => {
  async function requestReset(email: string) {
    await anon(ctx).post('/api/v1/auth/forgot-password').send({ email }).expect(202);
    await ctx.authService.drain();
  }

  it('resposta neutra: igual para emails registados e não registados', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const known = await anon(ctx).post('/api/v1/auth/forgot-password').send({ email: 'a@exemplo.com' }).expect(202);
    const unknown = await anon(ctx).post('/api/v1/auth/forgot-password').send({ email: 'nao@exemplo.com' }).expect(202);
    expect(known.body).toEqual(unknown.body);
    await ctx.authService.drain();
    expect(ctx.mailer.sent).toHaveLength(1);
  });

  it('guarda apenas o hash do token e usa a FRONTEND_URL configurada', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    await requestReset('a@exemplo.com');
    const mail = ctx.mailer.last('a@exemplo.com')!;
    const token = tokenFromMail(mail.text);
    expect(mail.text).toContain(`${ctx.config.frontendUrl}/reset-password?token=`);
    const row = await ctx.db.passwordResetToken.findFirstOrThrow();
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('redefine a senha, consome o token e revoga as sessões anteriores', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const session = await loginAgent(ctx, 'a@exemplo.com');
    await requestReset('a@exemplo.com');
    const token = tokenFromMail(ctx.mailer.last('a@exemplo.com')!.text);

    await anon(ctx).post('/api/v1/auth/reset-password').send({ token, newPassword: 'NovaSenha12345' }).expect(200);
    await session.get('/api/v1/users/me').expect(401); // sessão antiga revogada
    await anon(ctx).post('/api/v1/auth/login').send({ email: 'a@exemplo.com', password: PASSWORD }).expect(401);
    await anon(ctx).post('/api/v1/auth/login').send({ email: 'a@exemplo.com', password: 'NovaSenha12345' }).expect(200);

    // uso único
    const again = await anon(ctx).post('/api/v1/auth/reset-password').send({ token, newPassword: 'OutraSenha12345' }).expect(400);
    expect(again.body.error.code).toBe('INVALID_TOKEN');
  });

  it('token expirado é rejeitado', async () => {
    const u = await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    await requestReset('a@exemplo.com');
    const token = tokenFromMail(ctx.mailer.last('a@exemplo.com')!.text);
    await ctx.db.passwordResetToken.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await anon(ctx).post('/api/v1/auth/reset-password').send({ token, newPassword: 'NovaSenha12345' }).expect(400);
  });

  it('consumo atómico: dois pedidos simultâneos, só um tem sucesso', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    await requestReset('a@exemplo.com');
    const token = tokenFromMail(ctx.mailer.last('a@exemplo.com')!.text);
    const results = await Promise.all([
      anon(ctx).post('/api/v1/auth/reset-password').send({ token, newPassword: 'NovaSenha12345' }),
      anon(ctx).post('/api/v1/auth/reset-password').send({ token, newPassword: 'NovaSenha67890' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });

  it('um novo pedido invalida o token anterior; token inválido/forjado é rejeitado', async () => {
    const u = await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    await requestReset('a@exemplo.com');
    const first = tokenFromMail(ctx.mailer.last('a@exemplo.com')!.text);
    await ctx.db.passwordResetToken.updateMany({ where: { userId: u.id }, data: { createdAt: new Date(Date.now() - 120_000) } }); // fora do cooldown
    await requestReset('a@exemplo.com');
    await anon(ctx).post('/api/v1/auth/reset-password').send({ token: first, newPassword: 'NovaSenha12345' }).expect(400);
    await anon(ctx).post('/api/v1/auth/reset-password').send({ token: 'x'.repeat(43), newPassword: 'NovaSenha12345' }).expect(400);
  });
});

describe('alteração de senha e sessões', () => {
  it('exige a senha actual e termina as outras sessões', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const s1 = await loginAgent(ctx, 'a@exemplo.com');
    const s2 = await loginAgent(ctx, 'a@exemplo.com');
    await s1.post('/api/v1/auth/change-password').send({ currentPassword: 'Errada12345', newPassword: 'NovaSenha12345' }).expect(400);
    await s1.post('/api/v1/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'NovaSenha12345' }).expect(200);
    await s1.get('/api/v1/users/me').expect(200);
    await s2.get('/api/v1/users/me').expect(401);
  });

  it('não é possível revogar sessões de outro utilizador', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    await insertUser(ctx, { email: 'b@exemplo.com', role: 'STUDENT' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    const b = await loginAgent(ctx, 'b@exemplo.com');
    const sessionsB = await b.get('/api/v1/auth/sessions').expect(200);
    await a.delete(`/api/v1/auth/sessions/${sessionsB.body.data[0].id}`).expect(404);
    await b.get('/api/v1/users/me').expect(200);
  });
});

describe('rate limiting', () => {
  it('limita login por IP (429)', async () => {
    const limited = createCtx({ RATE_LIMIT_ENABLED: 'true', RATE_LIMIT_AUTH_MAX: '3', LOGIN_MAX_FAILURES: '100' });
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i++) {
        statuses.push((await anon(limited).post('/api/v1/auth/login').send({ email: 'z@exemplo.com', password: 'Errada12345' })).status);
      }
      expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
      expect(statuses.slice(3)).toEqual([429, 429]);
    } finally {
      await limited.close();
    }
  });
});
