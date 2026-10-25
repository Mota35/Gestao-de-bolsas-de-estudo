import type { Logger } from 'pino';
import type { Db, Tx } from '../../db/prisma.js';

export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'UNPUBLISH' | 'VERIFY' | 'REJECT'
  | 'LOGIN' | 'LOGOUT' | 'TOKEN_REVOKE' | 'ROLE_CHANGE' | 'EXPORT' | 'OTHER';
export type AuditEntityType =
  | 'USER' | 'STUDENT_PROFILE' | 'MENTOR_PROFILE' | 'SCHOLARSHIP' | 'SCHOLARSHIP_SOURCE'
  | 'MENTOR_SERVICE' | 'COURSE' | 'APPLICATION' | 'INQUIRY' | 'TOKEN' | 'SESSION' | 'OTHER';

export interface AuditEntry {
  actorUserId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEY = /pass(word)?|token|secret|hash|authorization|cookie|whatsapp/i;

/** Remove recursivamente chaves sensíveis antes de persistir. */
export function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeMetadata(v, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SENSITIVE_KEY.test(k) ? '[REDACTED]' : sanitizeMetadata(v, depth + 1),
      ]),
    );
  }
  if (typeof value === 'string' && value.length > 1000) return `${value.slice(0, 1000)}…`;
  return value;
}

export class AuditService {
  constructor(private readonly db: Db, private readonly logger: Logger) {}

  /** Regista na mesma transacção quando `tx` é fornecido; caso contrário falhas não interrompem o pedido. */
  async record(entry: AuditEntry, tx?: Tx): Promise<void> {
    const data = {
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ? (sanitizeMetadata(entry.metadata) as object) : undefined,
    };
    if (tx) {
      await tx.auditLog.create({ data });
      return;
    }
    try {
      await this.db.auditLog.create({ data });
    } catch (err) {
      this.logger.error({ err }, 'Falha ao registar auditoria');
    }
  }
}
