import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import type { Logger } from 'pino';
import type { AppConfig } from './config/index.js';
import type { Db } from './db/prisma.js';
import { ConnectorRegistry } from './integrations/scholarships/registry.js';
import { InagbeConnector } from './integrations/scholarships/inagbe.connector.js';
import type { Mailer } from './integrations/mail/mailer.js';
import { openApiDocument } from './docs/openapi.js';
import { createAuthMiddlewares } from './middlewares/auth.js';
import { csrfOriginCheck } from './middlewares/csrf.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { createRateLimiters } from './middlewares/rateLimit.js';
import { requestId } from './middlewares/requestId.js';
import { AuditService } from './modules/admin/audit.service.js';
import { createAdminRoutes } from './modules/admin/admin.routes.js';
import { createAuthController } from './modules/auth/auth.controller.js';
import { AuthService } from './modules/auth/auth.service.js';
import { JwtService } from './modules/auth/jwt.service.js';
import { InMemoryLoginThrottle, type LoginThrottle } from './modules/auth/loginThrottle.js';
import { createAuthRoutes } from './modules/auth/auth.routes.js';
import { CatalogService } from './modules/catalog/catalog.service.js';
import { createCatalogRoutes } from './modules/catalog/catalog.routes.js';
import { InquiriesService } from './modules/inquiries/inquiries.service.js';
import { createInquiriesRoutes } from './modules/inquiries/inquiries.routes.js';
import { IntegrationsService } from './modules/integrations/integrations.service.js';
import { createIntegrationsRoutes } from './modules/integrations/integrations.routes.js';
import { MentorsService } from './modules/mentors/mentors.service.js';
import { createAdminMentorsRoutes, createMentorsRoutes } from './modules/mentors/mentors.routes.js';
import { ReportsService } from './modules/reports/reports.service.js';
import { createReportsRoutes } from './modules/reports/reports.routes.js';
import { createScholarshipsController } from './modules/scholarships/scholarships.controller.js';
import {
  createAdminScholarshipsRoutes,
  createFavoritesRoutes,
  createScholarshipsRoutes,
} from './modules/scholarships/scholarships.routes.js';
import { ScholarshipsService } from './modules/scholarships/scholarships.service.js';
import { UsersService } from './modules/users/users.service.js';
import { createUsersRoutes } from './modules/users/users.routes.js';
import { createSupportRoutes } from './modules/support/support.routes.js';
import { PasswordHasher } from './utils/password.js';

export interface AppDeps {
  config: AppConfig;
  db: Db;
  logger: Logger;
  mailer: Mailer;
  throttle?: LoginThrottle;
  registry?: ConnectorRegistry;
}

export function createApp(deps: AppDeps): { app: Express; authService: AuthService } {
  const { config, db, logger, mailer } = deps;
  const app = express();
  app.disable('x-powered-by');
  // Os dados autenticados do painel não devem ficar presos em respostas 304/cache do browser.
  app.disable('etag');
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

  // ---- serviços
  const audit = new AuditService(db, logger);
  const hasher = new PasswordHasher(config.argon2);
  const jwt = new JwtService(config.auth.jwtSecret, config.auth.accessTtlMs);
  const throttle = deps.throttle ?? new InMemoryLoginThrottle(config.login.maxFailures, config.login.lockMs);
  const registry = deps.registry ?? new ConnectorRegistry([new InagbeConnector(config.integrations)]);

  const authService = new AuthService({ config, db, logger, mailer, hasher, jwt, throttle, audit });
  const usersService = new UsersService(db);
  const scholarships = new ScholarshipsService({ config, db, audit });
  const mentors = new MentorsService({ db, audit });
  const catalog = new CatalogService({ db, audit });
  const inquiries = new InquiriesService(db);
  const reports = new ReportsService({ db, audit });
  const integrations = new IntegrationsService({ config, db, logger, audit, registry, scholarships });

  const mw = createAuthMiddlewares({ config, db, jwt });
  const limits = createRateLimiters(config);

  // ---- middlewares globais
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id,
      // não registar query strings (podem conter tokens)
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: String(req.url).split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // pedidos sem Origin (curl, server-to-server) não são pedidos de browser
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(limits.global);
  // Fotos de perfil são enviadas como data URL; isolamos o limite maior neste único endpoint.
  app.use('/api/v1/mentors/me/photo', express.json({ limit: '5mb', strict: true }));
  app.use(express.json({ limit: config.bodyLimit, strict: true }));
  app.use(cookieParser());
  app.use(csrfOriginCheck(config));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // ---- documentação
  app.get('/api/v1/openapi.json', (_req, res) => res.json(openApiDocument));
  if (!config.isProduction) {
    app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }

  // ---- rotas
  const v1 = express.Router();
  v1.use('/admin', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
  const authController = createAuthController(authService, config);
  v1.use('/auth', createAuthRoutes(authController, mw, limits));
  v1.use('/users', createUsersRoutes(usersService, mw));
  v1.use('/support', createSupportRoutes(db));

  const scholarshipsController = createScholarshipsController(scholarships);
  v1.use('/scholarships', createScholarshipsRoutes(scholarshipsController, mw));
  v1.use('/me/favorites', createFavoritesRoutes(scholarshipsController, mw));

  v1.use('/mentors', createMentorsRoutes(mentors, mw));
  v1.use('/mentor-services', createCatalogRoutes('service', catalog, mw));
  v1.use('/courses', createCatalogRoutes('course', catalog, mw));
  v1.use('/inquiries', createInquiriesRoutes(inquiries, mw, limits.sensitive));
  v1.use('/reports', createReportsRoutes(reports, mw, limits.sensitive));

  // administração (todas exigem ADMIN)
  v1.use('/admin/scholarships', createAdminScholarshipsRoutes(scholarshipsController, mw));
  v1.use('/admin/mentors', createAdminMentorsRoutes(mentors, mw));
  v1.use('/admin', createIntegrationsRoutes(integrations, mw, limits.sensitive));
  v1.use('/admin', createAdminRoutes({ db, audit, catalog, reports, mw }));
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return { app, authService };
}
