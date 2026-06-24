import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { isProd } from "../config/env";

// ---------------------------------------------------------------------------
// notFoundHandler
// ---------------------------------------------------------------------------
/**
 * Catches any request that falls through all route definitions and converts
 * it into a structured 404 ApiError so the global error handler can format it.
 * Mount this **after** all routes, before `errorHandler`.
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// ---------------------------------------------------------------------------
// errorHandler
// ---------------------------------------------------------------------------
/**
 * Centralised Express error-handling middleware.
 * Handles:
 *   • ApiError         → operational errors thrown by the application
 *   • Mongoose ValidationError → invalid document field values
 *   • Mongoose CastError       → invalid ObjectId format in URL params
 *   • Mongo duplicate key (code 11000)
 *   • JWT errors (propagated as ApiError by the auth middleware)
 *   • Unhandled errors         → 500 with the original message
 *
 * In production the `stack` trace is hidden; in development it is included in
 * the response body for faster debugging.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: unknown;

  if (err instanceof ApiError) {
    // Our own operational errors — use exactly as-is
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (isMongooseValidationError(err)) {
    statusCode = 400;
    message = "Validation failed";
    errors = err.message;
  } else if (isMongooseCastError(err)) {
    statusCode = 400;
    message = "Invalid resource identifier";
  } else if (isDuplicateKeyError(err)) {
    statusCode = 409;
    const field = Object.keys((err as any).keyValue ?? {})[0];
    message = field ? `'${field}' already exists` : "Duplicate field value";
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  if (!isProd) {
    // Log full error in development
    console.error(`❌ [${req.method} ${req.originalUrl}]`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors !== undefined ? { errors } : {}),
    ...(!isProd && err instanceof Error ? { stack: err.stack } : {}),
  });
};

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------
function isMongooseValidationError(
  err: unknown
): err is Error & { name: "ValidationError" } {
  return err instanceof Error && err.name === "ValidationError";
}

function isMongooseCastError(
  err: unknown
): err is Error & { name: "CastError" } {
  return err instanceof Error && err.name === "CastError";
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as any).code === 11000
  );
}
