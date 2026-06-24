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

// Public routes
router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", refresh);

// Protected routes
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getCurrentUser);

export default router;
