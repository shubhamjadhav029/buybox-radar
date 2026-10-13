import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawCompany, Industry, StateCode } from '@radar/shared';
import { INDUSTRIES } from '@radar/shared';
import { normalizeName, normalizeDomain, normalizePhone } from '../src/domain/dedupe/normalize';

faker.seed(42);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── State data ────────────────────────────────────────────────────────────────
const STATE_DATA: Record<StateCode, { cities: string[]; areaCodes: number[] }> = {
  TX: { cities: ['Austin', 'Dallas', 'Houston', 'San Antonio', 'Fort Worth'], areaCodes: [512, 214, 713, 210] },
  FL: { cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Myers'], areaCodes: [305, 407, 813, 904] },
  CA: { cities: ['Sacramento', 'San Diego', 'Fresno', 'San Jose', 'Long Beach'], areaCodes: [916, 619, 559, 408] },
  AZ: { cities: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale'], areaCodes: [602, 520, 480] },
  GA: { cities: ['Atlanta', 'Savannah', 'Augusta', 'Macon', 'Marietta'], areaCodes: [404, 912, 706] },
  NC: { cities: ['Charlotte', 'Raleigh', 'Durham', 'Greensboro', 'Asheville'], areaCodes: [704, 919, 336] },
  OH: { cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Dayton', 'Toledo'], areaCodes: [614, 216, 513] },
  IL: { cities: ['Chicago', 'Naperville', 'Springfield', 'Peoria', 'Rockford'], areaCodes: [312, 630, 217] },
  PA: { cities: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Harrisburg'], areaCodes: [215, 412, 610] },
  TN: { cities: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Franklin'], areaCodes: [615, 901, 865] },
};

const STATES = Object.keys(STATE_DATA) as StateCode[];

// ── Industry nouns and revenue per employee ───────────────────────────────────
const INDUSTRY_NOUNS: Record<Industry, string[]> = {
  hvac: ['Heating & Air', 'Climate Control', 'HVAC Solutions'],
  plumbing: ['Plumbing', 'Pipe Works', 'Plumbing & Drain'],
  electrical: ['Electric', 'Electrical Services', 'Power Solutions'],
  roofing: ['Roofing', 'Roof & Gutter', 'Roofing Solutions'],
  landscaping: ['Landscaping', 'Lawn & Garden', 'Green Services'],
  'pest-control': ['Pest Control', 'Exterminating', 'Bug Busters'],
  'cleaning-services': ['Cleaning Services', 'Janitorial', 'Clean Team'],
  'auto-repair': ['Auto Repair', 'Auto Service', 'Automotive'],
  'dental-practice': ['Dental', 'Family Dentistry', 'Dental Care'],
  'veterinary-clinic': ['Veterinary', 'Animal Clinic', 'Pet Care'],
  laundromat: ['Laundromat', 'Coin Laundry', 'Wash & Dry'],
  'self-storage': ['Self Storage', 'Storage Solutions', 'Mini Storage'],
};

const REV_PER_EMPLOYEE: Record<Industry, number> = {
  hvac: 180_000,
  plumbing: 160_000,
  electrical: 170_000,
  roofing: 150_000,
  landscaping: 100_000,
  'pest-control': 120_000,
  'cleaning-services': 80_000,
  'auto-repair': 140_000,
  'dental-practice': 250_000,
  'veterinary-clinic': 200_000,
  laundromat: 90_000,
  'self-storage': 110_000,
};

const SUFFIXES = ['LLC', 'Inc', '& Sons', 'Co', 'Services', ''];
const OWNER_TITLES = ['Owner', 'Founder', 'President', 'Co-Owner'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function randInt(min: number, max: number): number {
  return Math.floor(faker.number.float({ min, max }));
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '').replace(/^-+/, '');
}

function generatePhone(areaCodes: number[]): string {
  const areaCode = areaCodes[randInt(0, areaCodes.length - 1)]!;
  const suffix = String(randInt(0, 99)).padStart(2, '0');
  return `(${areaCode}) 555-01${suffix}`;
}

// ── Base company generator ────────────────────────────────────────────────────
function generateBase(): RawCompany[] {
  const companies: RawCompany[] = [];
  const usedDomains = new Set<string>();
  const usedPhones = new Set<string>();
  const usedNameCities = new Set<string>();

  const perIndustryPerState = Math.ceil(1200 / (INDUSTRIES.length * STATES.length));

  for (const industry of INDUSTRIES) {
    for (const state of STATES) {
      const { cities, areaCodes } = STATE_DATA[state]!;

      for (let i = 0; i < perIndustryPerState; i++) {
        const city = cities[randInt(0, cities.length - 1)]!;
        const surname = faker.person.lastName();
        const noun = INDUSTRY_NOUNS[industry]![randInt(0, INDUSTRY_NOUNS[industry]!.length - 1)]!;
        const suffix = SUFFIXES[randInt(0, SUFFIXES.length - 1)]!;
        const baseName = `${surname} ${noun}`;
        const fullName = suffix ? `${baseName} ${suffix}` : baseName;

        // Ensure unique (normalizedName, city)
        const nameKey = `${normalizeName(fullName)}|${city.toLowerCase()}`;
        if (usedNameCities.has(nameKey)) continue;
        usedNameCities.add(nameKey);

        // Generate unique domain
        let domainSlug = slug(normalizeName(fullName));
        let domainAttempts = 0;
        while (usedDomains.has(domainSlug) && domainAttempts < 10) {
          domainSlug = slug(normalizeName(fullName)) + randInt(1, 99);
          domainAttempts++;
        }
        usedDomains.add(domainSlug);
        const website = `https://www.${domainSlug}.example`;

        // Generate unique phone
        let phone = generatePhone(areaCodes);
        let phoneNorm = normalizePhone(phone);
        let phoneAttempts = 0;
        while (phoneNorm && usedPhones.has(phoneNorm) && phoneAttempts < 20) {
          phone = generatePhone(areaCodes);
          phoneNorm = normalizePhone(phone);
          phoneAttempts++;
        }
        if (phoneNorm) usedPhones.add(phoneNorm);

        // Employee count: log-normal, clamp 3-150
        const rawEmp = Math.round(Math.exp(faker.number.float({ min: 1.5, max: 4.5 })));
        const employeeCount = Math.min(150, Math.max(3, rawEmp));

        // Revenue
        const revPerEmp = REV_PER_EMPLOYEE[industry]!;
        const jitter = faker.number.float({ min: 0.7, max: 1.3 });
        const estimatedRevenue = Math.round((employeeCount * revPerEmp * jitter) / 10_000) * 10_000;
        const revenueConfidence = Math.round(faker.number.float({ min: 0.5, max: 0.95 }) * 100) / 100;

        // Year founded: 1975-2022, skew older
        const yearFounded = randInt(1975, 2022);

        // Rating
        const rating = Math.round(faker.number.float({ min: 3.2, max: 5.0 }) * 10) / 10;
        const reviewCount = randInt(3, 800);

        // Owner
        const hasOwner = faker.number.float() > 0.35;
        let ownerName: string | null = null;
        let ownerTitle: string | null = null;
        let ownerLinkedinUrl: string | null = null;
        let email: string | null = null;

        if (hasOwner) {
          const firstName = faker.person.firstName();
          const lastName = faker.person.lastName();
          ownerName = `${firstName} ${lastName}`;
          ownerTitle = OWNER_TITLES[randInt(0, OWNER_TITLES.length - 1)]!;
          ownerLinkedinUrl = `https://www.linkedin.example/in/${slug(`${firstName}-${lastName}`)}`;
          email = faker.number.float() > 0.25
            ? `${slug(firstName)}@${domainSlug}.example`
            : null;
        } else {
          email = faker.number.float() > 0.25 ? `info@${domainSlug}.example` : null;
        }

        // Apply missing-data rates
        const c: RawCompany = {
          name: fullName,
          industry,
          website: faker.number.float() > 0.12 ? website : null,
          phone: faker.number.float() > 0.10 ? phone : null,
          email,
          street: null,
          city,
          state,
          zip: null,
          employeeCount: faker.number.float() > 0.15 ? employeeCount : null,
          estimatedRevenue: faker.number.float() > 0.20 ? estimatedRevenue : null,
          revenueConfidence: faker.number.float() > 0.20 ? revenueConfidence : null,
          yearFounded: faker.number.float() > 0.10 ? yearFounded : null,
          ownerName,
          ownerTitle,
          ownerLinkedinUrl,
          rating,
          reviewCount,
          sources: ['directory_a'],
        };

        companies.push(c);
        if (companies.length >= 1200) break;
      }
      if (companies.length >= 1200) break;
    }
    if (companies.length >= 1200) break;
  }

  return companies;
}

// ── Duplicate injector ────────────────────────────────────────────────────────
function injectDuplicates(base: RawCompany[]): { companies: RawCompany[]; injectedCount: number } {
  const targetDups = Math.ceil(base.length * 0.08); // 8%
  const duplicates: RawCompany[] = [];

  for (let i = 0; i < targetDups; i++) {
    const source = base[randInt(0, base.length - 1)]!;
    const dup = { ...source, sources: ['directory_b'] };

    // Apply 1-2 mutations, always keeping at least one matching key
    const mutations = randInt(1, 2);
    let mutation = randInt(0, 4);

    for (let m = 0; m < mutations; m++) {
      mutation = (mutation + 1) % 5;
      switch (mutation) {
        case 0: // swap & ↔ and
          dup.name = dup.name.replace(/ & /, ' and ').replace(' and ', ' & ');
          break;
        case 1: // add/remove LLC/Inc
          if (dup.name.endsWith(' LLC')) dup.name = dup.name.slice(0, -4);
          else if (dup.name.endsWith(' Inc')) dup.name = dup.name.slice(0, -4);
          else dup.name = dup.name + ' LLC';
          break;
        case 2: // reformat phone (keeping same digits)
          if (dup.phone) {
            const norm = normalizePhone(dup.phone);
            if (norm) dup.phone = `+1 ${norm.slice(0, 3)}-${norm.slice(3, 6)}-${norm.slice(6)}`;
          }
          break;
        case 3: // website with/without www
          if (dup.website) {
            dup.website = dup.website.includes('www.')
              ? dup.website.replace('www.', '')
              : dup.website.replace('https://', 'https://www.');
          }
          break;
        case 4: // blank 2-3 optional fields
          dup.employeeCount = null;
          dup.estimatedRevenue = null;
          break;
      }
    }

    // Ensure at least one matching key exists
    const hasMatchKey =
      (source.website && normalizeDomain(source.website) && normalizeDomain(source.website) === normalizeDomain(dup.website)) ||
      (source.phone && normalizePhone(source.phone) && normalizePhone(source.phone) === normalizePhone(dup.phone)) ||
      normalizeName(source.name) === normalizeName(dup.name);

    if (!hasMatchKey) {
      // Force phone match
      dup.phone = source.phone;
    }

    duplicates.push(dup);
  }

  return { companies: duplicates, injectedCount: duplicates.length };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('Generating seed data...');
  const base = generateBase();
  console.log(`Generated ${base.length} base companies`);

  const { companies: dups, injectedCount } = injectDuplicates(base);
  console.log(`Injected ${injectedCount} duplicates`);

  // Shuffle with seeded RNG
  const all = [...base, ...dups];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }

  const outputDir = join(__dirname, '../prisma/seed-data');
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(join(outputDir, 'companies.json'), JSON.stringify(all, null, 2));
  writeFileSync(
    join(outputDir, 'manifest.json'),
    JSON.stringify({
      baseCount: base.length,
      injectedDuplicates: injectedCount,
      generatedAt: new Date().toISOString(),
    }, null, 2),
  );

  console.log(`Wrote ${all.length} records to prisma/seed-data/companies.json`);
  console.log(`Wrote manifest.json (base=${base.length}, dups=${injectedCount})`);
}

main();
