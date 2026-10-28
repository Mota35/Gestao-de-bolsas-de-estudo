/**
 * Provisionamento seguro de administradores (não existe registo público de ADMIN).
 * Uso: ADMIN_EMAIL=... ADMIN_NAME="..." npm run admin:create
 * A senha é lida de ADMIN_PASSWORD ou pedida no terminal (sem eco). Nunca é registada em logs.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { createInterface } from 'node:readline';
import { buildConfig } from '../src/config/index.js';
import { createDb } from '../src/db/prisma.js';
import { PasswordHasher, passwordPolicyIssues } from '../src/utils/password.js';

function ask(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    (rl as any)._writeToOutput = () => {};
    process.stdout.write(prompt);
    rl.question('', (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}

async function main() {
  const config = buildConfig();
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? 'Administrador').trim();
  if (!email.includes('@')) throw new Error('Defina ADMIN_EMAIL.');
  const password = process.env.ADMIN_PASSWORD ?? (await ask('Senha do administrador: '));
  const issues = passwordPolicyIssues(password, email);
  if (issues.length) throw new Error(issues.join(' '));

  const db = createDb(config.databaseUrl, new PrismaPg({ connectionString: config.databaseUrl }));
  const hash = await new PasswordHasher(config.argon2).hash(password);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error('Já existe um utilizador com este email.');
  const user = await db.user.create({
    data: { email, name, passwordHash: hash, role: 'ADMIN', emailVerifiedAt: new Date() },
  });
  await db.auditLog.create({
    data: { actorUserId: null, action: 'CREATE', entityType: 'USER', entityId: user.id, metadata: { provisioned: 'cli', role: 'ADMIN' } },
  });
  console.log(`Administrador criado: ${email}`);
  await db.$disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
