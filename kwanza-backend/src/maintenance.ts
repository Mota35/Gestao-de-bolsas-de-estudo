import type { Logger } from 'pino';
import type { Db } from './db/prisma.js';
import type { AuthService } from './modules/auth/auth.service.js';

/**
 * Tarefas periódicas. A expiração de bolsas NÃO depende deste job: a validade é calculada a partir
 * do prazo em cada consulta. Aqui apenas se limpam tokens expirados e se retiram da publicação
 * as bolsas cujo prazo terminou há muito (arquivo), para manter o catálogo limpo.
 */
export function startMaintenance(deps: { db: Db; auth: AuthService; logger: Logger; intervalMs: number }) {
  const run = async () => {
    try {
      await deps.auth.purgeExpiredTokens();
    } catch (err) {
      deps.logger.error({ err }, 'Falha na manutenção');
    }
  };
  void run();
  const timer = setInterval(run, deps.intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
