import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import User, { UserRole } from "../models/User.model";

export interface AccessTokenPayload {
  id: string;
  role: UserRole;
}

// Augment Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Verifies the JWT access token from the HTTP-only cookie.
 * Attaches `{ id, role }` to req.user on success.
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw ApiError.unauthorized("Access token missing. Please log in.");
    }

    let decoded: AccessTokenPayload;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized("Access token expired. Please refresh your session.");
      }
      throw ApiError.unauthorized("Invalid access token.");
    }

    // Confirm the user still exists and is active
    const user = await User.findById(decoded.id).select("_id role isActive");
    if (!user) {
      throw ApiError.unauthorized("User no longer exists.");
    }
    if (!user.isActive) {
      throw ApiError.forbidden("This account has been deactivated.");
    }

    req.user = { id: user.id, role: user.role as UserRole };
    next();
  }
);

/**
 * Restricts a route to one or more roles.
 * Usage: router.get("/admin-only", authenticate, authorize("admin"), handler)
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized("You must be logged in to access this resource.");
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. Requires role(s): ${allowedRoles.join(", ")}.`
      );
    }
    next();
  };
};

/**
 * Optional auth — attaches req.user if a valid token is present,
 * but does not throw if absent. Useful for public-but-personalized routes.
 */
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken;
    if (!token) return next();

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      const user = await User.findById(decoded.id).select("_id role isActive");
      if (user && user.isActive) {
        req.user = { id: user.id, role: user.role as UserRole };
      }
    } catch {
      // silently ignore invalid/expired token for optional auth
    }
    next();
  }
);
