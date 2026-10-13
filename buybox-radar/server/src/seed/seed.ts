import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { RawCompany } from '@radar/shared';
import { dedupe } from '../domain/dedupe/index';
import { normalizeName } from '../domain/dedupe/normalize';
import { normalizeDomain } from '../domain/dedupe/normalize';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const ifEmpty = args.includes('--if-empty');
const seedFile = process.env['SEED_FILE'] ?? join(process.cwd(), 'prisma/seed-data/companies.json');

async function main() {
  if (ifEmpty) {
    const count = await prisma.company.count();
    if (count > 0) {
      console.log(`Seed: skipping — ${count} companies already exist (--if-empty)`);
      await prisma.$disconnect();
      return;
    }
  } else {
    // Truncate in correct order (FK constraints)
    await prisma.searchResult.deleteMany();
    await prisma.search.deleteMany();
    await prisma.company.deleteMany();
    console.log('Seed: truncated existing data');
  }

  const raw: RawCompany[] = JSON.parse(readFileSync(seedFile, 'utf-8'));
  console.log(`Seed: read ${raw.length} records from ${seedFile}`);

  const { companies, stats } = dedupe(raw);
  console.log(
    `Seed: input ${stats.input} → output ${stats.output} (duplicatesRemoved ${stats.duplicatesRemoved})`,
  );

  // Insert in batches of 500
  const BATCH = 500;
  for (let i = 0; i < companies.length; i += BATCH) {
    const batch = companies.slice(i, i + BATCH);
    await prisma.company.createMany({
      data: batch.map((c) => ({
        name: c.name,
        normalizedName: normalizeName(c.name),
        industry: c.industry,
        website: c.website ?? null,
        domain: normalizeDomain(c.website) ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        street: c.street ?? null,
        city: c.city,
        state: c.state,
        zip: c.zip ?? null,
        employeeCount: c.employeeCount ?? null,
        estimatedRevenue: c.estimatedRevenue ?? null,
        revenueConfidence: c.revenueConfidence ?? null,
        yearFounded: c.yearFounded ?? null,
        ownerName: c.ownerName ?? null,
        ownerTitle: c.ownerTitle ?? null,
        ownerLinkedinUrl: c.ownerLinkedinUrl ?? null,
        rating: c.rating ?? null,
        reviewCount: c.reviewCount ?? null,
        sources: c.sources,
        status: 'NEW',
      })),
      skipDuplicates: true,
    });
  }

  console.log(`Seed: inserted ${companies.length} companies`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Seed error:', err);
  prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
