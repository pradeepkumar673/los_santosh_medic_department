import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { isProd } from "../config/env";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    message = "Validation failed";
    errors = err.message;
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  } else if ((err as any).code === 11000) {
    // Mongo duplicate key error
    statusCode = 409;
    const field = Object.keys((err as any).keyValue || {})[0];
    message = field ? `${field} already exists` : "Duplicate field value";
  } else {
    message = err.message || message;
  }

  if (!isProd) {
    console.error(`❌ [${req.method} ${req.originalUrl}]`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(isProd ? {} : { stack: err.stack }),
  });
};
