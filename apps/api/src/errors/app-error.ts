export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Errors = {
  notFound: (message = 'Resource not found') =>
    new AppError(404, 'NOT_FOUND', message),
  unauthorized: (message = 'Unauthorized') =>
    new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Forbidden') =>
    new AppError(403, 'FORBIDDEN', message),
  badRequest: (message: string) =>
    new AppError(400, 'BAD_REQUEST', message),
  conflict: (message: string) =>
    new AppError(409, 'CONFLICT', message),
  internal: (message = 'Internal server error') =>
    new AppError(500, 'INTERNAL_ERROR', message),
}
