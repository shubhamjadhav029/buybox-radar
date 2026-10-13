/** AppError is the only error type that should be thrown in server code. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 404 Not Found helper */
export function notFound(msg = 'Resource not found'): AppError {
  return new AppError(404, 'NOT_FOUND', msg);
}

/** 400 Validation Error helper */
export function validationError(details: unknown): AppError {
  return new AppError(400, 'VALIDATION_ERROR', 'Invalid request', details);
}
