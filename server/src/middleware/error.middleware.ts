import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode ?? 500;
  const message = err instanceof AppError ? err.message : 'Internal server error';
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  if (status >= 500 || !env.isProd) console.error(err);

  res.status(status).json({
    error: message,
    code,
    ...(!env.isProd && { stack: err.stack }),
  });
}
