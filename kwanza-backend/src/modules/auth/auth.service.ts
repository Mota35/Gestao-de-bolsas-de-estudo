import { createHmac } from 'node:crypto';
import type { Logger } from 'pino';
import type { AppConfig } from '../../config/index.js';
import type { Db, Tx } from '../../db/prisma.js';
import { isUniqueViolation } from '../../db/prisma.js';
import {
  emailVerificationEmail,
  passwordChangedEmail,
  passwordResetEmail,
} from '../../integrations/mail/templates.js';
import type { Mailer } from '../../integrations/mail/mailer.js';
import type { UserRole } from '../../types/enums.js';
import { AppError, conflict, forbidden, notFound, unauthenticated } from '../../utils/errors.js';
import type { PasswordHasher } from '../../utils/password.js';
import { generateToken, hashToken } from '../../utils/tokens.js';
import type { AuditService } from '../admin/audit.service.js';
import type { JwtService } from './jwt.service.js';
import type { LoginThrottle } from './loginThrottle.js';

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  refreshExpiresAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
}

export function toPublicUser(u: {
  id: string; name: string; email: string; role: UserRole; emailVerifiedAt: Date | null; createdAt: Date;
}): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerifiedAt !== null,
    createdAt: u.createdAt,
  };
}

const GENERIC_RESET_COOLDOWN_MS = 60_000;

export class AuthService {
  private pending = new Set<Promise<unknown>>();

  constructor(
    private readonly deps: {
      config: AppConfig;
      db: Db;
      logger: Logger;
      mailer: Mailer;
      hasher: PasswordHasher;
      jwt: JwtService;
      throttle: LoginThrottle;
      audit: AuditService;
    },
  ) {}

  /** Aguarda tarefas em segundo plano (envio de emails). Usado em testes e no encerramento. */
  async drain(): Promise<void> {
    await Promise.allSettled([...this.pending]);
  }

  private background(task: Promise<unknown>, what: string): void {
    const p = task.catch((err) => this.deps.logger.error({ err, what }, 'Tarefa em segundo plano falhou'));
    this.pending.add(p);
    void p.finally(() => this.pending.delete(p));
  }

  private hashIp(ip?: string): string | null {
    if (!ip) return null;
    return createHmac('sha256', this.deps.config.auth.jwtSecret).update(`ip:${ip}`).digest('hex');
  }

  // ------------------------------------------------------------------ registo

  async register(
    role: Extract<UserRole, 'STUDENT' | 'MENTOR'>,
    input: { name: string; email: string; password: string; termsAccepted?: true; newsletterConsent?: boolean; bio?: string; specialties?: string[] },
  ): Promise<PublicUser> {
    const { db, hasher } = this.deps;
    const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) throw conflict('Este email já está registado.', 'EMAIL_IN_USE');

    const passwordHash = await hasher.hash(input.password);
    let user;
    try {
      user = await db.$transaction(async (tx: Tx) => {
        const created = await tx.user.create({
          data: { name: input.name, email: input.email, passwordHash, role, termsAcceptedAt: input.termsAccepted ? new Date() : null, newsletterConsent: input.newsletterConsent ?? false },
        });
        if (role === 'STUDENT') {
          await tx.studentProfile.create({ data: { userId: created.id } });
        } else {
          // O mentor nasce PENDING: só aparece como verificado após aprovação administrativa.
          await tx.mentorProfile.create({
            data: {
              userId: created.id,
              bio: input.bio ?? null,
              specialties: input.specialties ?? [],
              verificationStatus: 'PENDING',
            },
          });
        }
        return created;
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict('Este email já está registado.', 'EMAIL_IN_USE');
      throw err;
    }

    this.background(this.sendVerificationEmail(user.id, user.name, user.email), 'verification-email');
    return toPublicUser(user);
  }

  // -------------------------------------------------------------------- login

  async login(email: string, password: string, meta: ClientMeta) {
    const { db, hasher, throttle, audit } = this.deps;

    const state = throttle.check(email);
    if (state.locked) {
      throw new AppError(
        429,
        'ACCOUNT_TEMPORARILY_LOCKED',
        'Demasiadas tentativas de autenticação. Tente novamente mais tarde.',
        { retryAfterSeconds: state.retryAfterSeconds },
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    let valid = false;
    if (user) {
      valid = await hasher.verify(user.passwordHash, password);
    } else {
      await hasher.verifyDummy(password); // iguala o tempo de resposta
    }

    if (!user || !valid) {
      throttle.recordFailure(email);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha incorrectos.');
    }
    if (!user.isActive) throw forbidden('A conta está desactivada.');

    throttle.reset(email);
    const session = await this.issueSession(user.id, meta);
    if (user.role === 'ADMIN') {
      await audit.record({ actorUserId: user.id, action: 'LOGIN', entityType: 'SESSION', entityId: session.sessionId });
    }
    return { user: toPublicUser(user), session };
  }

  private async issueSession(userId: string, meta: ClientMeta, tx?: Tx): Promise<IssuedSession> {
    const { db, config, jwt } = this.deps;
    const client = tx ?? db;
    const refreshToken = generateToken(48);
    const refreshExpiresAt = new Date(Date.now() + config.auth.refreshTtlMs);
    const row = await client.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiresAt,
        userAgent: meta.userAgent?.slice(0, 500) ?? null,
        ipHash: this.hashIp(meta.ip),
      },
    });
    const accessToken = await jwt.signAccess(userId, row.id);
    return { accessToken, refreshToken, sessionId: row.id, refreshExpiresAt };
  }

  // ------------------------------------------------------------------ refresh

  /** Rotação de refresh token com detecção de reutilização. */
  async refresh(refreshToken: string, meta: ClientMeta) {
    const { db, audit } = this.deps;
    const tokenHash = hashToken(refreshToken);
    const row = await db.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!row) throw unauthenticated('Sessão inválida.');

    if (row.revokedAt) {
      // Token já rotacionado/revogado a ser reutilizado: possível roubo -> revoga todas as sessões.
      await db.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await audit.record({
        actorUserId: row.userId,
        action: 'TOKEN_REVOKE',
        entityType: 'SESSION',
        entityId: row.id,
        metadata: { reason: 'refresh_token_reuse_detected' },
      });
      throw unauthenticated('Sessão inválida.');
    }
    if (row.expiresAt <= new Date()) throw unauthenticated('Sessão expirada.');
    if (!row.user.isActive) throw unauthenticated('Sessão inválida.');

    const session = await db.$transaction(async (tx: Tx) => {
      // Revogação atómica: só uma de várias chamadas concorrentes consegue rotacionar.
      const res = await tx.refreshToken.updateMany({
        where: { id: row.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (res.count !== 1) throw unauthenticated('Sessão inválida.');
      return this.issueSession(row.userId, meta, tx);
    });
    return { user: toPublicUser(row.user), session };
  }

  // ------------------------------------------------------------------- logout

  async logoutBySessionId(sessionId: string): Promise<void> {
    await this.deps.db.refreshToken.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutByRefreshToken(refreshToken: string): Promise<void> {
    await this.deps.db.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<number> {
    const res = await this.deps.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.deps.audit.record({ actorUserId: userId, action: 'TOKEN_REVOKE', entityType: 'SESSION', metadata: { scope: 'all' } });
    return res.count;
  }

  async listSessions(userId: string, currentSessionId: string) {
    const rows = await this.deps.db.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
    });
    return rows.map((r: { id: string; userAgent: string | null; createdAt: Date; expiresAt: Date }) => ({
      ...r,
      current: r.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    // O filtro por userId impede revogar sessões de outros utilizadores.
    const res = await this.deps.db.refreshToken.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (res.count === 0) throw notFound('Sessão não encontrada.');
  }

  // --------------------------------------------------------- email verification

  private async sendVerificationEmail(userId: string, name: string, email: string): Promise<void> {
    const { db, config, mailer } = this.deps;
    const token = generateToken(32);
    await db.$transaction(async (tx: Tx) => {
      // invalida tokens anteriores ainda não usados
      await tx.emailVerificationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.emailVerificationToken.create({
        data: {
          userId,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + config.tokens.emailVerificationTtlMs),
        },
      });
    });
    const link = `${config.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const mail = emailVerificationEmail(name, link, Math.round(config.tokens.emailVerificationTtlMs / 3_600_000));
    await mailer.send({ to: email, ...mail });
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.deps.db.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('Utilizador não encontrado.');
    if (user.emailVerifiedAt) return; // idempotente
    this.background(this.sendVerificationEmail(user.id, user.name, user.email), 'verification-email');
  }

  async verifyEmail(token: string): Promise<void> {
    const { db } = this.deps;
    const tokenHash = hashToken(token);
    const now = new Date();
    await db.$transaction(async (tx: Tx) => {
      // consumo atómico: só uma chamada consegue marcar o token como usado
      const res = await tx.emailVerificationToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (res.count !== 1) throw new AppError(400, 'INVALID_TOKEN', 'Link inválido ou expirado.');
      const row = await tx.emailVerificationToken.findUnique({ where: { tokenHash } });
      if (!row) throw new AppError(400, 'INVALID_TOKEN', 'Link inválido ou expirado.');
      await tx.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: now } });
    });
  }

  // ----------------------------------------------------------- password reset

  /** Resposta sempre neutra: nunca revela se o email existe. */
  async requestPasswordReset(email: string): Promise<void> {
    const { db, config } = this.deps;
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return;

    // Limita a frequência de emails por conta (evita spam/abuso)
    const recent = await db.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - GENERIC_RESET_COOLDOWN_MS) } },
      select: { id: true },
    });
    if (recent) return;

    const token = generateToken(32);
    await db.$transaction(async (tx: Tx) => {
      await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + config.tokens.passwordResetTtlMs),
        },
      });
    });

    // O link usa exclusivamente a URL configurada (nunca o Host/Origin do pedido).
    const link = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const mail = passwordResetEmail(user.name, link, Math.round(config.tokens.passwordResetTtlMs / 60_000));
    this.background(this.deps.mailer.send({ to: user.email, ...mail }), 'password-reset-email');
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const { db, hasher, audit } = this.deps;
    const tokenHash = hashToken(token);
    const now = new Date();

    // verificação barata antes do hash (evita gastar CPU com tokens inválidos)
    const probe = await db.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!probe || probe.usedAt || probe.expiresAt <= now) {
      throw new AppError(400, 'INVALID_TOKEN', 'Link inválido ou expirado.');
    }

    const passwordHash = await hasher.hash(newPassword);
    const userId: string = await db.$transaction(async (tx: Tx) => {
      const res = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (res.count !== 1) throw new AppError(400, 'INVALID_TOKEN', 'Link inválido ou expirado.');
      const row = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!row) throw new AppError(400, 'INVALID_TOKEN', 'Link inválido ou expirado.');
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
      // outros pedidos de recuperação pendentes deixam de funcionar
      await tx.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } });
      // política explícita: todas as sessões anteriores são revogadas
      await tx.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit.record(
        { actorUserId: row.userId, action: 'TOKEN_REVOKE', entityType: 'USER', entityId: row.userId, metadata: { reason: 'password_reset' } },
        tx,
      );
      return row.userId as string;
    });

    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) {
      // ter recebido o link por email prova controlo da caixa de correio
      if (!user.emailVerifiedAt) await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
      const mail = passwordChangedEmail(user.name);
      this.background(this.deps.mailer.send({ to: user.email, ...mail }), 'password-changed-email');
    }
  }

  // ---------------------------------------------------------- change password

  async changePassword(userId: string, currentSessionId: string, currentPassword: string, newPassword: string) {
    const { db, hasher, audit } = this.deps;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthenticated();
    if (!(await hasher.verify(user.passwordHash, currentPassword))) {
      throw new AppError(400, 'INVALID_CREDENTIALS', 'A senha actual está incorrecta.');
    }
    if (await hasher.verify(user.passwordHash, newPassword)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A nova senha deve ser diferente da actual.');
    }
    const passwordHash = await hasher.hash(newPassword);
    await db.$transaction(async (tx: Tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      // mantém apenas a sessão actual
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null, id: { not: currentSessionId } },
        data: { revokedAt: new Date() },
      });
      await audit.record(
        { actorUserId: userId, action: 'TOKEN_REVOKE', entityType: 'USER', entityId: userId, metadata: { reason: 'password_change' } },
        tx,
      );
    });
    this.background(this.deps.mailer.send({ to: user.email, ...passwordChangedEmail(user.name) }), 'password-changed-email');
  }

  // ----------------------------------------------------------------- limpeza

  /** Remove tokens expirados/usados há mais de 7 dias. */
  async purgeExpiredTokens(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 86_400_000);
    const { db } = this.deps;
    await Promise.all([
      db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
      db.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
      db.refreshToken.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    ]);
  }
}
