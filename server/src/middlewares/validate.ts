import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formatted = err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        return next(ApiError.badRequest("Validation failed", formatted));
      }
      next(err);
    }
  };
};

export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Overwrite with parsed/coerced data
      req.body = result.body ?? req.body;
      req.params = result.params ?? req.params;
      req.query = result.query ?? req.query;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formatted = err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        return next(ApiError.badRequest("Validation failed", formatted));
      }
      next(err);
    }
  };
};
