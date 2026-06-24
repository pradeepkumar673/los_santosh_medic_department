import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

// ---------------------------------------------------------------------------
// validateBody
// ---------------------------------------------------------------------------
/**
 * Validates and coerces `req.body` against a flat Zod schema.
 * Use this for simple body-only validation (e.g. auth login/register).
 *
 * On success  → `req.body` is replaced with the parsed (coerced) value.
 * On failure  → passes a structured 400 ApiError to the next error handler.
 *
 * Usage:
 *   router.post("/register", validateBody(registerSchema), register)
 */
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

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------
/**
 * Validates `{ body, params, query }` together using a composite Zod schema.
 * After parsing, the coerced values replace the originals on the request so
 * downstream handlers always receive clean, typed data.
 *
 * Designed to work with schemas shaped like:
 *   z.object({ body: z.object({...}), params: z.object({...}), query: z.object({...}) })
 *
 * Usage:
 *   router.get("/:id", validate(getByIdSchema), handler)
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Replace with coerced / defaulted values
      if (result.body !== undefined) req.body = result.body;
      if (result.params !== undefined) req.params = result.params;
      if (result.query !== undefined) req.query = result.query;

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

// ---------------------------------------------------------------------------
// validateParams
// ---------------------------------------------------------------------------
/**
 * Validates `req.params` only.  Handy for ID-only routes like DELETE /:id.
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formatted = err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        return next(ApiError.badRequest("Invalid URL parameters", formatted));
      }
      next(err);
    }
  };
};

// ---------------------------------------------------------------------------
// validateQuery
// ---------------------------------------------------------------------------
/**
 * Validates `req.query` only.  Useful for list/filter endpoints.
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formatted = err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        return next(ApiError.badRequest("Invalid query parameters", formatted));
      }
      next(err);
    }
  };
};
