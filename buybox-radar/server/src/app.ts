import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { existsSync } from 'node:fs';
import { healthRouter } from './routes/health.routes';
import { metaRouter } from './routes/meta.routes';
import { searchRoutes } from './routes/search.routes';
import { companyRoutes } from './routes/company.routes';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';
import { env } from './config/env';
import type { SearchService } from './services/search.service';
import type { CompanyService } from './services/company.service';

export interface AppDeps {
  searchService: SearchService;
  companyService: CompanyService;
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  // API routes
  app.use('/api', healthRouter);
  app.use('/api', metaRouter);
  app.use('/api', searchRoutes(deps.searchService));
  app.use('/api', companyRoutes(deps.companyService));

  // 404 for unmatched /api/* routes
  app.use('/api', notFound);

  // Serve static web app if WEB_DIST_DIR is configured
  if (env.WEB_DIST_DIR && existsSync(env.WEB_DIST_DIR)) {
    app.use(express.static(env.WEB_DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: env.WEB_DIST_DIR });
    });
  }

  app.use(errorHandler);

  return app;
}
