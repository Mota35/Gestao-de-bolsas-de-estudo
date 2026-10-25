import pino, { type Logger } from 'pino';

// Campos que nunca devem aparecer nos registos.
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.currentPassword',
  '*.passwordHash',
  '*.token',
  '*.refreshToken',
  '*.tokenHash',
  '*.whatsapp',
  '*.whatsappE164',
];

export function createLogger(level: string, isProduction: boolean): Logger {
  return pino({
    level,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    ...(isProduction
      ? {}
      : level === 'silent'
        ? {}
        : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
  });
}
