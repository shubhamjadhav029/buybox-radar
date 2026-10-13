import { env } from './config/env';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';
import { createSearchCache } from './lib/cache';
import { createSearchService } from './services/search.service';
import { createCompanyService } from './services/company.service';
import { createApp } from './app';

const cache = createSearchCache({
  max: env.CACHE_MAX_ENTRIES,
  ttlMs: env.CACHE_TTL_SECONDS * 1000,
});

const searchService = createSearchService({ prisma, cache });
const companyService = createCompanyService({ prisma, cache });

const app = createApp({ searchService, companyService });

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'BuyBox Radar API started');
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
