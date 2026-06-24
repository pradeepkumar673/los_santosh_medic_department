import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { UserRole } from "../models/User.model";

export { authorize } from "./auth"; // re-exported for convenience: import { authorize } from "./role"

/** Allows only admins */
export const adminOnly = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user?.role !== "admin") {
    throw ApiError.forbidden("This action is restricted to administrators.");
  }
  next();
};

/** Allows clinical staff: doctor, nurse, admin */
export const clinicalStaffOnly = (req: Request, _res: Response, next: NextFunction): void => {
  const allowed: UserRole[] = ["doctor", "nurse", "admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    throw ApiError.forbidden("This action is restricted to clinical staff.");
  }
  next();
};

/** Allows front-desk operations: reception, admin */
export const frontDeskOnly = (req: Request, _res: Response, next: NextFunction): void => {
  const allowed: UserRole[] = ["reception", "admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    throw ApiError.forbidden("This action is restricted to front-desk staff.");
  }
  next();
};

/** Ensures the logged-in user is acting on their own resource, unless they're staff */
export const selfOrStaff = (resourceUserIdParam: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const staffRoles: UserRole[] = ["doctor", "nurse", "reception", "admin"];
    const targetId = req.params[resourceUserIdParam];

    if (req.user?.id === targetId || staffRoles.includes(req.user?.role as UserRole)) {
      return next();
    }
    throw ApiError.forbidden("You do not have permission to access this resource.");
  };
};
