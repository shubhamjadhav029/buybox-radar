import { Router } from 'express';
import { StatusUpdateSchema } from '@radar/shared';
import { validateBody } from '../middleware/validate';
import type { CompanyService } from '../services/company.service';

export function companyRoutes(service: CompanyService): Router {
  const router = Router();

  router.patch(
    '/companies/:id/status',
    validateBody(StatusUpdateSchema),
    async (req, res, next) => {
      try {
        const result = await service.updateStatus(req.params['id']!, req.body.status);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
