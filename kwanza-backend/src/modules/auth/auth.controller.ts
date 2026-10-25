import type { CookieOptions, Request, Response } from 'express';
import type { AppConfig } from '../../config/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { unauthenticated } from '../../utils/errors.js';
import type { AuthService, ClientMeta, IssuedSession } from './auth.service.js';

const neutralReset = {
  data: { message: 'Se o email estiver registado, enviámos instruções para redefinir a senha.' },
};

export function createAuthController(authService: AuthService, config: AppConfig) {
  const base = (): CookieOptions => ({
    httpOnly: true,
    secure: config.auth.secure,
    sameSite: config.auth.sameSite,
    domain: config.auth.domain,
  });

  function setAuthCookies(res: Response, s: IssuedSession) {
    res.cookie(config.auth.accessCookie, s.accessToken, { ...base(), path: '/', maxAge: config.auth.accessTtlMs });
    // o refresh token só é enviado aos endpoints de autenticação
    res.cookie(config.auth.refreshCookie, s.refreshToken, {
      ...base(),
      path: '/api/v1/auth',
      expires: s.refreshExpiresAt,
    });
  }

  function clearAuthCookies(res: Response) {
    res.clearCookie(config.auth.accessCookie, { ...base(), path: '/' });
    res.clearCookie(config.auth.refreshCookie, { ...base(), path: '/api/v1/auth' });
  }

  const meta = (req: Request): ClientMeta => ({ userAgent: req.header('user-agent') ?? undefined, ip: req.ip });

  return {
    registerStudent: asyncHandler(async (req, res) => {
      const user = await authService.register('STUDENT', req.body);
      res.status(201).json({ data: user });
    }),
    registerMentor: asyncHandler(async (req, res) => {
      const user = await authService.register('MENTOR', req.body);
      res.status(201).json({ data: user });
    }),
    login: asyncHandler(async (req, res) => {
      const { user, session } = await authService.login(req.body.email, req.body.password, meta(req));
      setAuthCookies(res, session);
      res.json({ data: { user } });
    }),
    refresh: asyncHandler(async (req, res) => {
      const token = req.cookies?.[config.auth.refreshCookie] as string | undefined;
      if (!token) throw unauthenticated();
      try {
        const { user, session } = await authService.refresh(token, meta(req));
        setAuthCookies(res, session);
        res.json({ data: { user } });
      } catch (err) {
        clearAuthCookies(res);
        throw err;
      }
    }),
    logout: asyncHandler(async (req, res) => {
      if (req.user) await authService.logoutBySessionId(req.user.sessionId);
      const refresh = req.cookies?.[config.auth.refreshCookie] as string | undefined;
      if (refresh) await authService.logoutByRefreshToken(refresh);
      clearAuthCookies(res);
      res.status(204).end();
    }),
    logoutAll: asyncHandler(async (req, res) => {
      await authService.logoutAll(req.user!.id);
      clearAuthCookies(res);
      res.status(204).end();
    }),
    listSessions: asyncHandler(async (req, res) => {
      res.json({ data: await authService.listSessions(req.user!.id, req.user!.sessionId) });
    }),
    revokeSession: asyncHandler(async (req, res) => {
      await authService.revokeSession(req.user!.id, String(req.params.id));
      res.status(204).end();
    }),
    forgotPassword: asyncHandler(async (req, res) => {
      await authService.requestPasswordReset(req.body.email);
      res.status(202).json(neutralReset);
    }),
    resetPassword: asyncHandler(async (req, res) => {
      await authService.resetPassword(req.body.token, req.body.newPassword);
      clearAuthCookies(res);
      res.json({ data: { message: 'Senha redefinida. Inicie sessão com a nova senha.' } });
    }),
    verifyEmail: asyncHandler(async (req, res) => {
      await authService.verifyEmail(req.body.token);
      res.json({ data: { message: 'Email confirmado.' } });
    }),
    resendVerification: asyncHandler(async (req, res) => {
      await authService.resendVerification(req.user!.id);
      res.status(202).json({ data: { message: 'Se o email ainda não estiver confirmado, enviámos um novo link.' } });
    }),
    changePassword: asyncHandler(async (req, res) => {
      await authService.changePassword(req.user!.id, req.user!.sessionId, req.body.currentPassword, req.body.newPassword);
      res.json({ data: { message: 'Senha alterada. As outras sessões foram terminadas.' } });
    }),
  };
}
