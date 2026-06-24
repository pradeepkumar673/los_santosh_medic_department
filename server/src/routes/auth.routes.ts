import { Router } from "express";
import {
  register,
  login,
  logout,
  refresh,
  getCurrentUser,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import { registerSchema, loginSchema } from "../validators/auth.validator";

const router = Router();

// ---------------------------------------------------------------------------
// Public routes  (no token required)
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/register
 * Body is validated against a discriminated-union schema that branches on
 * the `role` field (patient | doctor | nurse | reception | admin).
 */
router.post("/register", validateBody(registerSchema), register);

/**
 * POST /api/auth/login
 * Returns access + refresh tokens as HTTP-only cookies.
 */
router.post("/login", validateBody(loginSchema), login);

/**
 * POST /api/auth/refresh
 * Uses the refreshToken cookie to issue a new token pair (rotation).
 * No access token is required — intentionally unauthenticated so that
 * a frontend can silently renew even after the access token has expired.
 */
router.post("/refresh", refresh);

// ---------------------------------------------------------------------------
// Protected routes  (valid accessToken cookie required)
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/logout
 * Clears cookies and revokes the stored refresh token.
 * authenticate is applied so req.user is populated for DB cleanup,
 * but logout still completes gracefully if the token is nearly expired.
 */
router.post("/logout", authenticate, logout);

/**
 * GET /api/auth/me
 * Returns the authenticated user + role-specific profile object.
 */
router.get("/me", authenticate, getCurrentUser);

export default router;
