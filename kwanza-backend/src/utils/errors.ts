export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_TEMPORARILY_LOCKED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EMAIL_IN_USE'
  | 'INVALID_TOKEN'
  | 'INVALID_STATE'
  | 'CSRF_REJECTED'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTEGRATION_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);
export const unauthenticated = (message = 'Autenticação necessária.') =>
  new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'Não tem permissão para esta acção.') =>
  new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Recurso não encontrado.') =>
  new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string, code: ErrorCode = 'CONFLICT') =>
  new AppError(409, code, message);
export const invalidState = (message: string) => new AppError(409, 'INVALID_STATE', message);
