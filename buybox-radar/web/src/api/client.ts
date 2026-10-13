export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    if (isJson && body && typeof body === 'object' && 'error' in body) {
      const err = body.error as { code?: string; message?: string; details?: unknown };
      throw new ApiClientError(
        err.code ?? 'UNKNOWN_ERROR',
        err.message ?? 'An error occurred',
        err.details,
        res.status,
      );
    }
    throw new ApiClientError(
      'HTTP_ERROR',
      typeof body === 'string' && body ? body : `Request failed with status ${res.status}`,
      undefined,
      res.status,
    );
  }

  return body as T;
}

export function exportUrl(searchId: string, params: { minScore: number; shortlistedOnly: boolean }): string {
  const query = new URLSearchParams();
  if (params.minScore > 0) {
    query.set('minScore', params.minScore.toString());
  }
  if (params.shortlistedOnly) {
    query.set('shortlistedOnly', 'true');
  }
  const qs = query.toString();
  return `/api/searches/${encodeURIComponent(searchId)}/export.csv${qs ? `?${qs}` : ''}`;
}
