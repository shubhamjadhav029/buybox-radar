import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import type { SearchService } from '../services/search.service';
import type { CompanyService } from '../services/company.service';
import type { SearchResponse } from '@radar/shared';

// Minimal fake search service
const fakeSearchResponse: SearchResponse = {
  search: {
    id: 'test-search-id',
    buyBox: {
      industries: ['hvac'],
      states: ['TX'],
      cities: [],
      employees: { min: 10, max: 50 },
      revenue: { min: 1_000_000, max: 8_000_000 },
      minYearsInBusiness: 10,
      requireOwnerContact: false,
      limit: 100,
    },
    meta: {
      cacheHit: false,
      durationMs: 42,
      candidateCount: 5,
      resultCount: 1,
      createdAt: new Date().toISOString(),
    },
  },
  results: [],
};

const fakeSearchService: SearchService = {
  run: vi.fn().mockResolvedValue(fakeSearchResponse),
  getById: vi.fn().mockImplementation(async (id: string) =>
    id === 'test-search-id' ? fakeSearchResponse : null,
  ),
  exportCsv: vi.fn().mockImplementation(async (id: string) =>
    id === 'test-search-id'
      ? '\uFEFFrank,score,fit,name\r\n1,80,strong,Test Co\r\n'
      : null,
  ),
};

const fakeCompanyService: CompanyService = {
  updateStatus: vi.fn().mockResolvedValue({ id: 'cmp-1', status: 'SHORTLISTED' }),
};

describe('API tests', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp({
      searchService: fakeSearchService,
      companyService: fakeCompanyService,
    });
  });

  it('GET /api/health → 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body.time).toBeTruthy();
  });

  it('GET /api/meta/options → 200 with industries and states', async () => {
    const res = await request(app).get('/api/meta/options');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.industries)).toBe(true);
    expect(Array.isArray(res.body.states)).toBe(true);
    expect(res.body.industries[0]).toHaveProperty('value');
    expect(res.body.industries[0]).toHaveProperty('label');
  });

  it('POST /api/searches with invalid body → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/searches')
      .send({ industries: [] }); // fails min(1)
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error).toHaveProperty('details');
  });

  it('POST /api/searches with employees max < min → 400', async () => {
    const res = await request(app)
      .post('/api/searches')
      .send({
        industries: ['hvac'],
        states: ['TX'],
        employees: { min: 50, max: 10 },
        revenue: { min: 0, max: 1_000_000 },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/searches with valid body → 201 SearchResponse shape', async () => {
    const body = {
      industries: ['hvac'],
      states: ['TX'],
      cities: [],
      employees: { min: 10, max: 50 },
      revenue: { min: 1_000_000, max: 8_000_000 },
      minYearsInBusiness: 10,
      requireOwnerContact: false,
      limit: 100,
    };
    const res = await request(app).post('/api/searches').send(body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('search');
    expect(res.body).toHaveProperty('results');
    expect(res.body.search).toHaveProperty('id');
    expect(res.body.search).toHaveProperty('meta');
  });

  it('GET /api/searches/unknown-id → 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/searches/unknown-id');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/searches/test-search-id/export.csv → 200 with CSV content-type', async () => {
    const res = await request(app).get('/api/searches/test-search-id/export.csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('GET /api/searches/bad-id/export.csv → 404', async () => {
    const res = await request(app).get('/api/searches/bad-id/export.csv');
    expect(res.status).toBe(404);
  });
});
