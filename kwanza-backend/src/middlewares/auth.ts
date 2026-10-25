import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/index.js';
import type { Db } from '../db/prisma.js';
import type { JwtService } from '../modules/auth/jwt.service.js';
import type { UserRole } from '../types/enums.js';
import { forbidden, unauthenticated } from '../utils/errors.js';

export function createAuthMiddlewares(deps: { config: AppConfig; db: Db; jwt: JwtService }) {
  const { config, db, jwt } = deps;

  function extractToken(req: Parameters<RequestHandler>[0]): string | undefined {
    const header = req.header('authorization');
    if (header?.startsWith('Bearer ')) return header.slice(7).trim();
    return req.cookies?.[config.auth.accessCookie] as string | undefined;
  }

  /** Resolve o utilizador (se houver token válido). A sessão é verificada na BD: logout/revogação é imediato. */
  async function resolve(req: Parameters<RequestHandler>[0]) {
    const token = extractToken(req);
    if (!token) return null;
    const claims = await jwt.verifyAccess(token);
    if (!claims) return null;
    const session = await db.refreshToken.findUnique({
      where: { id: claims.sessionId },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.userId !== claims.userId ||
      !session.user.isActive
    ) {
      return null;
    }
    const u = session.user;
    return {
      id: u.id as string,
      email: u.email as string,
      name: u.name as string,
      role: u.role as UserRole,
      emailVerified: u.emailVerifiedAt !== null,
      sessionId: session.id as string,
    };
  }

  const requireAuth: RequestHandler = async (req, _res, next) => {
    try {
      const user = await resolve(req);
      if (!user) return next(unauthenticated());
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };

  const optionalAuth: RequestHandler = async (req, _res, next) => {
    try {
      const user = await resolve(req);
      if (user) req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };

  /** Autorização no servidor por papel. Deve ser usado depois de requireAuth. */
  const requireRole =
    (...roles: UserRole[]): RequestHandler =>
    (req, _res, next) => {
      if (!req.user) return next(unauthenticated());
      if (!roles.includes(req.user.role)) return next(forbidden());
      next();
    };

  const requireVerifiedEmail: RequestHandler = (req, _res, next) => {
    if (!req.user) return next(unauthenticated());
    if (!req.user.emailVerified) return next(forbidden('Confirme o seu email para continuar.'));
    next();
  };

  return { requireAuth, optionalAuth, requireRole, requireVerifiedEmail };
}

export type AuthMiddlewares = ReturnType<typeof createAuthMiddlewares>;
