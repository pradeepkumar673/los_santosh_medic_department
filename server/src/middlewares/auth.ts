import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import User, { UserRole } from "../models/User.model";

// ---------------------------------------------------------------------------
// Type augmentation — makes req.user available throughout the app
// ---------------------------------------------------------------------------
export interface AccessTokenPayload {
  id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// ---------------------------------------------------------------------------
// authenticate
// ---------------------------------------------------------------------------
/**
 * Verifies the JWT access token stored in the `accessToken` HTTP-only cookie.
 * On success, attaches `{ id, role }` to `req.user` and calls `next()`.
 *
 * Distinguishes between expired tokens (→ 401 with a "refresh" hint) and
 * outright invalid tokens, so the client can react accordingly.
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token: string | undefined = req.cookies?.accessToken;

    if (!token) {
      throw ApiError.unauthorized("Access token missing. Please log in.");
    }

    let decoded: AccessTokenPayload;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized(
          "Access token has expired. Please refresh your session."
        );
      }
      throw ApiError.unauthorized("Invalid access token.");
    }

    // Verify the user still exists and is still active
    const user = await User.findById(decoded.id).select("_id role isActive");
    if (!user) {
      throw ApiError.unauthorized("The account associated with this token no longer exists.");
    }
    if (!user.isActive) {
      throw ApiError.forbidden("This account has been deactivated. Contact an administrator.");
    }

    req.user = { id: user.id as string, role: user.role as UserRole };
    next();
  }
);

// ---------------------------------------------------------------------------
// authorize
// ---------------------------------------------------------------------------
/**
 * Role-based access control gate.
 * Must be used **after** `authenticate` so that `req.user` is populated.
 *
 * Usage:
 *   router.delete("/users/:id", authenticate, authorize("admin"), handler)
 *   router.get("/records", authenticate, authorize("doctor", "nurse"), handler)
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized("Authentication required. Please log in.");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. This action requires one of the following roles: ${allowedRoles.join(", ")}.`
      );
    }

    next();
  };
};

// ---------------------------------------------------------------------------
// optionalAuth
// ---------------------------------------------------------------------------
/**
 * Soft authentication middleware — attaches `req.user` if a valid access
 * token is present, but silently skips (without throwing) when it is absent
 * or invalid.  Useful for routes that are public but can serve personalized
 * content when called by an authenticated user.
 */
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token: string | undefined = req.cookies?.accessToken;
    if (!token) return next();

    try {
      const decoded = jwt.verify(
        token,
        env.JWT_ACCESS_SECRET
      ) as AccessTokenPayload;

      const user = await User.findById(decoded.id).select("_id role isActive");
      if (user && user.isActive) {
        req.user = { id: user.id as string, role: user.role as UserRole };
      }
    } catch {
      // Silently ignore invalid / expired tokens for optional auth
    }

    next();
  }
);
