import { PrismaClient } from '@prisma/client';

export type Db = InstanceType<typeof PrismaClient>;
/** Cliente transaccional (dentro de $transaction). */
export type Tx = Omit<Db, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/** `adapter` é opcional: só necessário se o cliente for gerado com driver adapters (engineType = "client"). */
export function createDb(databaseUrl: string, adapter?: unknown): Db {
  if (adapter) return new (PrismaClient as any)({ adapter });
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}
