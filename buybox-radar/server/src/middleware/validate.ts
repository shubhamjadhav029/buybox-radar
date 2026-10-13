import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../lib/errors';

/** Validates request body against a zod schema; on failure throws AppError 400. */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', result.error.flatten());
    }
    req.body = result.data;
    next();
  };
}

/** Validates query params against a zod schema; on success stores result in res.locals.query. */
export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query', result.error.flatten());
    }
    res.locals['query'] = result.data;
    next();
  };
}
