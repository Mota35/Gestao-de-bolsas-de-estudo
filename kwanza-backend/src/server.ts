import 'dotenv/config';
import { createApp } from './app.js';
import { buildConfig } from './config/index.js';
import { createDb } from './db/prisma.js';
import { createMailer } from './integrations/mail/mailer.js';
import { startMaintenance } from './maintenance.js';
import { createLogger } from './utils/logger.js';

const config = buildConfig();
const logger = createLogger(config.logLevel, config.isProduction);
const db = createDb(config.databaseUrl);
const mailer = createMailer(config.mail, logger);
const { app, authService } = createApp({ config, db, logger, mailer });

const server = app.listen(config.port, () => logger.info({ port: config.port }, 'API a escutar'));
const stopMaintenance = startMaintenance({ db, auth: authService, logger, intervalMs: config.maintenanceIntervalMs });

async function shutdown(signal: string) {
  logger.info({ signal }, 'A encerrar');
  stopMaintenance();
  server.close(async () => {
    await authService.drain();
    await db.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
