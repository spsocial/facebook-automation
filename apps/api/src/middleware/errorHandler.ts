import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { ERROR_CODES } from '@repo/shared';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string = ERROR_CODES.INTERNAL_ERROR;
  let details = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || code;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    code = ERROR_CODES.VALIDATION_ERROR;
    details = err.errors;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    code = ERROR_CODES.UNAUTHORIZED;
  }

  // Log error
  logger.error({
    message: err.message,
    statusCode,
    code,
    details,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
    },
  });
};