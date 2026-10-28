import { PrismaClient } from '@prisma/client';

export type Db = InstanceType<typeof PrismaClient>;
/** Cliente transaccional (dentro de $transaction). */
export type Tx = Omit<Db, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/** O cliente é gerado sem engine nativo e liga ao PostgreSQL através do driver adapter. */
export function createDb(_databaseUrl: string, adapter: unknown): Db {
  return new (PrismaClient as any)({ adapter });
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}
