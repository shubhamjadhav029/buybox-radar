import { describe, it, expect } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('includes UTF-8 BOM', () => {
    const csv = toCsv(['name'], [['test']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('uses CRLF line endings', () => {
    const csv = toCsv(['a', 'b'], [['1', '2']]);
    expect(csv).toContain('\r\n');
    expect(csv.split('\r\n').length).toBeGreaterThan(1);
  });

  it('quotes values containing commas', () => {
    const csv = toCsv(['name'], [['Smith, LLC']]);
    expect(csv).toContain('"Smith, LLC"');
  });

  it('quotes values containing double-quotes and doubles them', () => {
    const csv = toCsv(['name'], [['"Quoted"']]);
    expect(csv).toContain('"""Quoted"""');
  });

  it('CSV injection guard: = prefix gets single quote prefix', () => {
    const csv = toCsv(['formula'], [['=1+1']]);
    expect(csv).toContain("'=1+1");
  });

  it('CSV injection guard: + prefix', () => {
    const csv = toCsv(['f'], [['+evil']]);
    expect(csv).toContain("'+evil");
  });

  it('CSV injection guard: - prefix', () => {
    const csv = toCsv(['f'], [['-cmd']]);
    expect(csv).toContain("'-cmd");
  });

  it('CSV injection guard: @ prefix', () => {
    const csv = toCsv(['f'], [['@SUM']]);
    expect(csv).toContain("'@SUM");
  });

  it('null values render as empty string', () => {
    const csv = toCsv(['a', 'b'], [[null, null]]);
    expect(csv).toContain(',\r\n');
  });

  it('outputs correct number of rows', () => {
    const csv = toCsv(['x'], [['1'], ['2'], ['3']]);
    // BOM + header + 3 data rows + trailing CRLF = 5 CRLF-separated segments
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(4); // header + 3
  });
});
