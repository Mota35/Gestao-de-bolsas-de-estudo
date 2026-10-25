// Variáveis de ambiente para testes (nenhum segredo real). A BD de teste é APAGADA entre testes.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://kwanza:kwanza_dev@localhost:5432/kwanza_test?schema=public';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-test-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.LOG_LEVEL = 'silent';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.ARGON2_MEMORY_KIB = '4096';
process.env.ARGON2_TIME_COST = '1';
process.env.MAIL_TRANSPORT = 'outbox';
