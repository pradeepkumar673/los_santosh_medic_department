import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { adminOnly, frontDeskOnly } from "../middlewares/role";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import User from "../models/User.model";

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/admin/users
// List all users with optional role/status filters (admin only)
// ---------------------------------------------------------------------------
router.get(
  "/users",
  adminOnly,
  asyncHandler(async (req, res) => {
    const {
      role,
      isActive,
      page = "1",
      limit = "20",
      search,
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-refreshToken -password")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    return res.status(200).json(
      new ApiResponse(200, {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      })
    );
  })
);

// ---------------------------------------------------------------------------
// GET /api/admin/users/:id
// Get a single user by ID (admin only)
// ---------------------------------------------------------------------------
router.get(
  "/users/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("-refreshToken -password");
    if (!user) throw ApiError.notFound("User not found.");

    return res.status(200).json(new ApiResponse(200, user));
  })
);

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/activate
// Activate a deactivated user account (admin only)
// ---------------------------------------------------------------------------
router.patch(
  "/users/:id/activate",
  adminOnly,
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select("-refreshToken -password");

    if (!user) throw ApiError.notFound("User not found.");

    return res.status(200).json(new ApiResponse(200, user, "User account activated."));
  })
);

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/deactivate
// Deactivate a user account and revoke their refresh token (admin only)
// ---------------------------------------------------------------------------
router.patch(
  "/users/:id/deactivate",
  adminOnly,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user?.id) {
      throw ApiError.badRequest("You cannot deactivate your own account.");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, $unset: { refreshToken: 1 } },
      { new: true }
    ).select("-refreshToken -password");

    if (!user) throw ApiError.notFound("User not found.");

    return res.status(200).json(new ApiResponse(200, user, "User account deactivated."));
  })
);

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/role
// Change a user's role (admin only)
// ---------------------------------------------------------------------------
router.patch(
  "/users/:id/role",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { role } = req.body as { role: string };
    const validRoles = ["patient", "doctor", "nurse", "reception", "admin"];

    if (!role || !validRoles.includes(role)) {
      throw ApiError.badRequest(`Role must be one of: ${validRoles.join(", ")}.`);
    }

    if (req.params.id === req.user?.id) {
      throw ApiError.badRequest("You cannot change your own role.");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("-refreshToken -password");

    if (!user) throw ApiError.notFound("User not found.");

    return res.status(200).json(new ApiResponse(200, user, `User role updated to '${role}'.`));
  })
);

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id
// Hard-delete a user account (admin only — use sparingly; prefer deactivate)
// ---------------------------------------------------------------------------
router.delete(
  "/users/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user?.id) {
      throw ApiError.badRequest("You cannot delete your own account.");
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw ApiError.notFound("User not found.");

    return res.status(200).json(new ApiResponse(200, {}, "User deleted successfully."));
  })
);

// ---------------------------------------------------------------------------
// GET /api/admin/stats
// High-level dashboard counts for admin / reception
// ---------------------------------------------------------------------------
router.get(
  "/stats",
  frontDeskOnly,
  asyncHandler(async (_req, res) => {
    const [total, byRole, inactive] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.countDocuments({ isActive: false }),
    ]);

    const roleBreakdown = Object.fromEntries(
      byRole.map((r: { _id: string; count: number }) => [r._id, r.count])
    );

    return res.status(200).json(
      new ApiResponse(200, {
        totalUsers: total,
        inactiveUsers: inactive,
        activeUsers: total - inactive,
        byRole: roleBreakdown,
      })
    );
  })
);

export default router;
