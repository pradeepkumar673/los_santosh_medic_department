import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { UserRole } from "../models/User.model";

// Re-export `authorize` so callers can do:
//   import { authorize } from "./role"   (instead of "./auth")
export { authorize } from "./auth";

// ---------------------------------------------------------------------------
// adminOnly
// ---------------------------------------------------------------------------
/**
 * Restricts access to users with the `admin` role.
 * Must be used after `authenticate`.
 */
export const adminOnly = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== "admin") {
    throw ApiError.forbidden("This action is restricted to administrators.");
  }
  next();
};

// ---------------------------------------------------------------------------
// clinicalStaffOnly
// ---------------------------------------------------------------------------
/**
 * Restricts access to clinical staff: doctor, nurse, admin.
 * Blocks patients, reception, and unauthenticated requests.
 */
export const clinicalStaffOnly = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const allowed: UserRole[] = ["doctor", "nurse", "admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    throw ApiError.forbidden(
      "This action is restricted to clinical staff (doctor, nurse, admin)."
    );
  }
  next();
};

// ---------------------------------------------------------------------------
// frontDeskOnly
// ---------------------------------------------------------------------------
/**
 * Restricts access to front-desk operations: reception, admin.
 * Useful for check-in, appointment booking, and queue management screens.
 */
export const frontDeskOnly = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const allowed: UserRole[] = ["reception", "admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    throw ApiError.forbidden(
      "This action is restricted to front-desk staff (reception, admin)."
    );
  }
  next();
};

// ---------------------------------------------------------------------------
// doctorOrAdmin
// ---------------------------------------------------------------------------
/**
 * Restricts access to doctors and admins.
 * Useful for endpoints where doctors manage their own records (schedules,
 * consultation fees) and admins have blanket access.
 */
export const doctorOrAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const allowed: UserRole[] = ["doctor", "admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    throw ApiError.forbidden("This action is restricted to doctors and administrators.");
  }
  next();
};

// ---------------------------------------------------------------------------
// nurseOrAbove
// ---------------------------------------------------------------------------
/**
 * Allows nurse, doctor, and admin — basically everyone except patients and
 * reception.  Use for clinical data entry that any clinical staff can perform.
 */
export const nurseOrAbove = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const allowed: UserRole[] = ["nurse", "doctor", "admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    throw ApiError.forbidden("This action requires clinical staff privileges.");
  }
  next();
};

// ---------------------------------------------------------------------------
// selfOrStaff
// ---------------------------------------------------------------------------
/**
 * Allows the request if the authenticated user is acting on their **own**
 * resource, OR if they hold a staff role (doctor, nurse, reception, admin).
 *
 * @param resourceUserIdParam - The `req.params` key that holds the owner's
 *   userId.  E.g. for `GET /patients/:userId/records` pass `"userId"`.
 *
 * Example:
 *   router.get("/patients/:id", authenticate, selfOrStaff("id"), handler)
 */
export const selfOrStaff = (resourceUserIdParam: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const staffRoles: UserRole[] = ["doctor", "nurse", "reception", "admin"];
    const targetId = req.params[resourceUserIdParam];

    if (
      req.user?.id === targetId ||
      staffRoles.includes(req.user?.role as UserRole)
    ) {
      return next();
    }

    throw ApiError.forbidden(
      "You do not have permission to access this resource."
    );
  };
};

// ---------------------------------------------------------------------------
// selfOnly
// ---------------------------------------------------------------------------
/**
 * Ensures the authenticated user can only access their own resource.
 * No staff bypass — useful for highly sensitive personal data.
 *
 * @param resourceUserIdParam - The `req.params` key holding the owner's userId.
 */
export const selfOnly = (resourceUserIdParam: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const targetId = req.params[resourceUserIdParam];

    if (req.user?.id === targetId) {
      return next();
    }

    throw ApiError.forbidden(
      "You may only access your own account data."
    );
  };
};
