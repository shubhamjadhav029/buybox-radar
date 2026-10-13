import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { BuyBoxSchema, ExportQuerySchema } from '@radar/shared';
import { validateBody, validateQuery } from '../middleware/validate';
import type { SearchService } from '../services/search.service';
import { AppError } from '../lib/errors';

const searchRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
});

export function searchRoutes(service: SearchService): Router {
  const router = Router();

  // POST /searches
  router.post(
    '/searches',
    searchRateLimiter,
    validateBody(BuyBoxSchema),
    async (req, res, next) => {
      try {
        const response = await service.run(req.body);
        const status = response.search.meta.cacheHit ? 200 : 201;
        res.status(status).json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /searches/:id
  router.get('/searches/:id', async (req, res, next) => {
    try {
      const response = await service.getById(req.params['id']!);
      if (!response) throw new AppError(404, 'NOT_FOUND', 'Search not found');
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // GET /searches/:id/export.csv
  router.get(
    '/searches/:id/export.csv',
    validateQuery(ExportQuerySchema),
    async (req, res, next) => {
      try {
        const { minScore, shortlistedOnly } = res.locals['query'] as {
          minScore: number;
          shortlistedOnly: boolean;
        };
        const csv = await service.exportCsv(req.params['id']!, { minScore, shortlistedOnly });
        if (csv == null) throw new AppError(404, 'NOT_FOUND', 'Search not found');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="buybox-radar-${req.params['id']}.csv"`,
        );
        res.send(csv);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
