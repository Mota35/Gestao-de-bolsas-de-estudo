import { Router } from 'express';
import type { AuthMiddlewares } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import type { createAuthController } from './auth.controller.js';
import * as v from './auth.validators.js';

type Limiters = { auth: import('express').RequestHandler; sensitive: import('express').RequestHandler };

export function createAuthRoutes(
  c: ReturnType<typeof createAuthController>,
  mw: AuthMiddlewares,
  limiters: Limiters,
) {
  const r = Router();
  r.post('/register/student', limiters.auth, validate({ body: v.registerStudentSchema }), c.registerStudent);
  r.post('/register/mentor', limiters.auth, validate({ body: v.registerMentorSchema }), c.registerMentor);
  r.post('/login', limiters.auth, validate({ body: v.loginSchema }), c.login);
  r.post('/refresh', limiters.auth, c.refresh);
  r.post('/logout', mw.optionalAuth, c.logout);
  r.post('/logout-all', mw.requireAuth, c.logoutAll);
  r.get('/sessions', mw.requireAuth, c.listSessions);
  r.delete('/sessions/:id', mw.requireAuth, validate({ params: v.sessionIdParams }), c.revokeSession);
  r.post('/forgot-password', limiters.auth, validate({ body: v.forgotPasswordSchema }), c.forgotPassword);
  r.post('/reset-password', limiters.auth, validate({ body: v.resetPasswordSchema }), c.resetPassword);
  r.post('/verify-email', limiters.auth, validate({ body: v.verifyEmailSchema }), c.verifyEmail);
  r.post('/resend-verification', mw.requireAuth, limiters.sensitive, c.resendVerification);
  r.post('/change-password', mw.requireAuth, limiters.sensitive, validate({ body: v.changePasswordSchema }), c.changePassword);
  return r;
}
