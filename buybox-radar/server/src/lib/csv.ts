// CSV injection-unsafe starters
const INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/** Applies RFC 4180 quoting and CSV injection guard to a single cell value. */
function quoteCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);

  // CSV injection guard: prefix with single quote if starts with dangerous char
  const safe =
    str.length > 0 && INJECTION_PREFIXES.includes(str[0]!)
      ? `'${str}`
      : str;

  // RFC 4180: quote if contains comma, double-quote, CR, or LF
  if (/[,"\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }

  return safe;
}

/**
 * Generates a CSV string from headers and rows.
 * UTF-8 with BOM, CRLF line endings, RFC 4180 quoting, injection guard.
 */
export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const BOM = '\uFEFF';
  const CRLF = '\r\n';

  const headerRow = headers.map(quoteCell).join(',');
  const dataRows = rows.map((row) => row.map(quoteCell).join(','));

  return BOM + [headerRow, ...dataRows].join(CRLF) + CRLF;
}
