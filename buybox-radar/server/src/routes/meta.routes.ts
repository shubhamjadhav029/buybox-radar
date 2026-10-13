import { Router } from 'express';
import { INDUSTRIES, INDUSTRY_LABELS, SUPPORTED_STATES } from '@radar/shared';

export const metaRouter = Router();

metaRouter.get('/meta/options', (_req, res) => {
  const industries = INDUSTRIES.map((value) => ({ value, label: INDUSTRY_LABELS[value] }));
  res.json({ industries, states: [...SUPPORTED_STATES] });
});
