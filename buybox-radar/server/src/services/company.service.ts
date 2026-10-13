import type { PrismaClient } from '@prisma/client';
import type { CompanyStatus } from '@radar/shared';
import type { SearchCache } from '../lib/cache';
import { notFound } from '../lib/errors';

export interface CompanyService {
  updateStatus(id: string, status: CompanyStatus): Promise<{ id: string; status: CompanyStatus }>;
}

export function createCompanyService(deps: {
  prisma: PrismaClient;
  cache: SearchCache;
}): CompanyService {
  const { prisma, cache } = deps;

  return {
    async updateStatus(id, status) {
      const existing = await prisma.company.findUnique({ where: { id } });
      if (!existing) throw notFound(`Company ${id} not found`);

      const updated = await prisma.company.update({
        where: { id },
        data: { status },
        select: { id: true, status: true },
      });

      // Invalidate cache so future searches reflect the status change
      cache.clear();

      return { id: updated.id, status: updated.status as CompanyStatus };
    },
  };
}
