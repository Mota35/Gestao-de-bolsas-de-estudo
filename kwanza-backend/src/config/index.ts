import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    DATABASE_URL: z.string().min(1),

    // Origem(ns) do frontend autorizadas (CORS + verificação de Origin/CSRF), separadas por vírgula.
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    // URL base única usada para construir links de email. Nunca é derivada do pedido.
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),

    // Autenticação: access token JWT de curta duração + refresh token opaco rotativo (hash na BD)
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres.'),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().positive().default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().positive().default(30),
    ACCESS_COOKIE_NAME: z.string().default('kw_access'),
    REFRESH_COOKIE_NAME: z.string().default('kw_refresh'),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional(),

    // Hash de senhas (Argon2id) - valores por omissão seguem recomendações OWASP
    ARGON2_MEMORY_KIB: z.coerce.number().int().positive().default(19456),
    ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),
    ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),

    // Tokens de email
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().positive().default(30),
    EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().positive().default(48),

    // Bloqueio de tentativas de login
    LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().positive().default(15),

    // Rate limiting (por IP)
    RATE_LIMIT_ENABLED: bool.default(true),
    RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(300),
    RATE_LIMIT_GLOBAL_WINDOW_MIN: z.coerce.number().positive().default(15),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_AUTH_WINDOW_MIN: z.coerce.number().positive().default(15),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    // Limites de pedidos
    BODY_LIMIT_KB: z.coerce.number().positive().default(100),

    // Email
    MAIL_TRANSPORT: z.enum(['smtp', 'outbox']).default('outbox'),
    MAIL_FROM: z.string().default('Kwanza Oportunidades <no-reply@localhost>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: bool.default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    // Em desenvolvimento, o transporte "outbox" escreve os emails neste directório (não vai para os logs).
    MAIL_OUTBOX_DIR: z.string().optional(),

    // Integrações
    // URL de um feed oficial AUTORIZADO do INAGBE. Vazio por omissão: não existe API pública assumida.
    INAGBE_AUTHORIZED_FEED_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),
    INTEGRATION_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    INTEGRATION_MAX_BYTES: z.coerce.number().int().positive().default(1_000_000),

    // Tarefas de manutenção
    MAINTENANCE_INTERVAL_MINUTES: z.coerce.number().positive().default(15),
    SCHOLARSHIP_STALE_DAYS: z.coerce.number().int().positive().default(30),

    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    DEFAULT_TIMEZONE: z.string().default('Africa/Luanda'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.FRONTEND_URL.startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'Em produção FRONTEND_URL tem de usar HTTPS.' });
      }
      for (const origin of env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)) {
        if (!origin.startsWith('https://')) {
          ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: `Em produção a origem ${origin} tem de usar HTTPS.` });
        }
      }
      const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
      const frontendOrigin = new URL(env.FRONTEND_URL).origin;
      if (!origins.includes(frontendOrigin)) {
        ctx.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'FRONTEND_URL tem de pertencer a CORS_ORIGINS.' });
      }
      if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
        ctx.addIssue({ code: 'custom', path: ['SMTP_HOST'], message: 'SMTP_HOST é obrigatório com MAIL_TRANSPORT=smtp.' });
      }
      if (env.MAIL_TRANSPORT === 'outbox') {
        ctx.addIssue({ code: 'custom', path: ['MAIL_TRANSPORT'], message: 'Em produção use MAIL_TRANSPORT=smtp.' });
      }
    }
    if (env.COOKIE_SAMESITE === 'none' && env.NODE_ENV !== 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SAMESITE'],
        message: 'SameSite=None requer cookies Secure (HTTPS); use apenas em produção.',
      });
    }
  });

export type AppConfig = ReturnType<typeof buildConfig>;

export function buildConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuração inválida:\n${issues}`);
  }
  const e = parsed.data;
  return {
    env: e.NODE_ENV,
    isProduction: e.NODE_ENV === 'production',
    isTest: e.NODE_ENV === 'test',
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    corsOrigins: e.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
    frontendUrl: e.FRONTEND_URL.replace(/\/+$/, ''),
    auth: {
      jwtSecret: e.JWT_SECRET,
      accessTtlMs: e.ACCESS_TOKEN_TTL_MINUTES * 60_000,
      refreshTtlMs: e.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
      accessCookie: e.ACCESS_COOKIE_NAME,
      refreshCookie: e.REFRESH_COOKIE_NAME,
      sameSite: e.COOKIE_SAMESITE,
      domain: e.COOKIE_DOMAIN,
      secure: e.NODE_ENV === 'production',
    },
    argon2: {
      memoryCost: e.ARGON2_MEMORY_KIB,
      timeCost: e.ARGON2_TIME_COST,
      parallelism: e.ARGON2_PARALLELISM,
    },
    tokens: {
      passwordResetTtlMs: e.PASSWORD_RESET_TTL_MINUTES * 60_000,
      emailVerificationTtlMs: e.EMAIL_VERIFICATION_TTL_HOURS * 3_600_000,
    },
    login: {
      maxFailures: e.LOGIN_MAX_FAILURES,
      lockMs: e.LOGIN_LOCK_MINUTES * 60_000,
    },
    rateLimit: {
      enabled: e.RATE_LIMIT_ENABLED,
      globalMax: e.RATE_LIMIT_GLOBAL_MAX,
      globalWindowMs: e.RATE_LIMIT_GLOBAL_WINDOW_MIN * 60_000,
      authMax: e.RATE_LIMIT_AUTH_MAX,
      authWindowMs: e.RATE_LIMIT_AUTH_WINDOW_MIN * 60_000,
    },
    trustProxy: e.TRUST_PROXY,
    bodyLimit: `${e.BODY_LIMIT_KB}kb`,
    mail: {
      transport: e.MAIL_TRANSPORT,
      from: e.MAIL_FROM,
      smtp: {
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_SECURE,
        user: e.SMTP_USER,
        pass: e.SMTP_PASS,
      },
      outboxDir: e.MAIL_OUTBOX_DIR,
    },
    integrations: {
      inagbeFeedUrl: e.INAGBE_AUTHORIZED_FEED_URL,
      timeoutMs: e.INTEGRATION_TIMEOUT_MS,
      maxBytes: e.INTEGRATION_MAX_BYTES,
    },
    maintenanceIntervalMs: e.MAINTENANCE_INTERVAL_MINUTES * 60_000,
    scholarshipStaleDays: e.SCHOLARSHIP_STALE_DAYS,
    logLevel: e.LOG_LEVEL,
    defaultTimezone: e.DEFAULT_TIMEZONE,
  };
}
