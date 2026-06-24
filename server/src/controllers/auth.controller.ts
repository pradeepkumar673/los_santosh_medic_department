import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import User, { IUser } from "../models/User.model";
import Patient from "../models/Patient.model";
import Doctor from "../models/Doctor.model";
import Department from "../models/Department.model";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "../services/token.service";

const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || "CHANGE_ME_IN_ENV";

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
/**
 * Handles registration for all five roles:
 *   patient   → creates User + Patient profile (transactional)
 *   doctor    → creates User + Doctor profile  (transactional, requires dept/license)
 *   nurse     → creates User only
 *   reception → creates User only
 *   admin     → creates User only (requires adminInviteCode)
 *
 * On success the caller receives JWT cookies and a minimal user object.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, any>;

  // Duplicate check before touching the DB
  const existing = await User.findOne({
    $or: [{ email: body.email }, { phone: body.phone }],
  });
  if (existing) {
    throw ApiError.conflict("A user with this email or phone already exists.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let createdUser: IUser;

    switch (body.role) {
      // ------------------------------------------------------------------ //
      case "patient": {
        const [user] = await User.create(
          [
            {
              name: body.name,
              email: body.email,
              phone: body.phone,
              password: body.password,
              role: "patient",
            },
          ],
          { session }
        );

        await Patient.create(
          [
            {
              user: user._id,
              dateOfBirth: body.dateOfBirth,
              gender: body.gender,
              bloodGroup: body.bloodGroup ?? "unknown",
              emergencyContact: body.emergencyContact,
              address: body.address,
              allergies: body.allergies ?? [],
              chronicConditions: body.chronicConditions ?? [],
              currentMedications: body.currentMedications ?? [],
              height: body.height,
              weight: body.weight,
              insuranceProvider: body.insuranceProvider,
              insurancePolicyNumber: body.insurancePolicyNumber,
              abhaId: body.abhaId,
            },
          ],
          { session }
        );

        createdUser = user;
        break;
      }

      // ------------------------------------------------------------------ //
      case "doctor": {
        if (!body.department || !body.specialization || !body.licenseNumber) {
          throw ApiError.badRequest(
            "Doctor registration requires department, specialization, and licenseNumber."
          );
        }

        const department = await Department.findById(body.department).session(session);
        if (!department) {
          throw ApiError.badRequest("The specified department does not exist.");
        }
        if (!department.isActive) {
          throw ApiError.badRequest("Cannot register to an inactive department.");
        }

        const licenseConflict = await Doctor.findOne({
          licenseNumber: body.licenseNumber,
        }).session(session);
        if (licenseConflict) {
          throw ApiError.conflict("A doctor with this license number already exists.");
        }

        const [user] = await User.create(
          [
            {
              name: body.name,
              email: body.email,
              phone: body.phone,
              password: body.password,
              role: "doctor",
            },
          ],
          { session }
        );

        await Doctor.create(
          [
            {
              user: user._id,
              department: body.department,
              specialization: body.specialization,
              licenseNumber: body.licenseNumber,
              consultationFee: body.consultationFee ?? 0,
              qualifications: body.qualifications ?? [],
              experienceYears: body.experienceYears ?? 0,
              workingHours: body.workingHours ?? [],
              maxPatientsPerDay: body.maxPatientsPerDay ?? 30,
            },
          ],
          { session }
        );

        createdUser = user;
        break;
      }

      // ------------------------------------------------------------------ //
      case "nurse":
      case "reception": {
        const [user] = await User.create(
          [
            {
              name: body.name,
              email: body.email,
              phone: body.phone,
              password: body.password,
              role: body.role,
            },
          ],
          { session }
        );

        createdUser = user;
        break;
      }

      // ------------------------------------------------------------------ //
      case "admin": {
        if (body.adminInviteCode !== ADMIN_INVITE_CODE) {
          throw ApiError.forbidden("Invalid admin invite code.");
        }

        const [user] = await User.create(
          [
            {
              name: body.name,
              email: body.email,
              phone: body.phone,
              password: body.password,
              role: "admin",
            },
          ],
          { session }
        );
        createdUser = user;
        break;
      }

      // ------------------------------------------------------------------ //
      default:
        throw ApiError.badRequest("Invalid role specified.");
    }

    // Generate tokens and persist refresh token before committing
    const payload = { id: createdUser.id as string, role: createdUser.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    createdUser.refreshToken = refreshToken;
    await createdUser.save({ session });

    await session.commitTransaction();
    session.endSession();

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
/**
 * Validates credentials and returns JWT cookies.
 * Fails with a generic 401 for both "no user" and "wrong password" to prevent
 * user-enumeration attacks.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  // Must explicitly select +password because it is excluded by default
  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated. Please contact an administrator.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const payload = { id: user.id as string, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------
/**
 * Issues a new access + refresh token pair (token rotation).
 * Validates that the refresh token in the cookie matches what is stored on the
 * user document — a mismatch signals potential token theft.
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies?.refreshToken;
  if (!token) {
    throw ApiError.unauthorized("Refresh token missing. Please log in again.");
  }

  let decoded: { id: string; role: string };
  try {
    decoded = verifyRefreshToken(token) as { id: string; role: string };
  } catch {
    throw ApiError.unauthorized("Refresh token is invalid or expired. Please log in again.");
  }

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== token) {
    // Possible token reuse after rotation — invalidate stored token
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    throw ApiError.unauthorized("Refresh token does not match. Please log in again.");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated.");
  }

  const payload = { id: user.id as string, role: user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  // Rotate: store new refresh token
  user.refreshToken = newRefreshToken;
  await user.save();

  setAuthCookies(res, newAccessToken, newRefreshToken);

  return res.status(200).json({
    success: true,
    message: "Token refreshed successfully.",
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
/**
 * Clears both cookies and removes the stored refresh token from the DB so the
 * old refresh token cannot be reused from another device.
 * Works even if the access token has already expired — the route is also
 * callable unauthenticated (best-effort logout).
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.id) {
    await User.findByIdAndUpdate(req.user.id, { $unset: { refreshToken: 1 } });
  }

  clearAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
/**
 * Returns the currently authenticated user plus their role-specific profile
 * (Patient document for patients, Doctor document for doctors).
 * Requires a valid access token cookie.
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized("Not authenticated.");
  }

  const user = await User.findById(req.user.id).select("-refreshToken -password");
  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  // Attach role-specific profile
  let profile: Record<string, unknown> | null = null;

  if (user.role === "patient") {
    profile = (await Patient.findOne({ user: user._id }).lean()) as Record<string, unknown> | null;
  } else if (user.role === "doctor") {
    profile = (await Doctor.findOne({ user: user._id })
      .populate("department", "name code avgConsultationTime")
      .lean()) as Record<string, unknown> | null;
  }

  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        isVerified: user.isVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      profile,
    },
  });
});
