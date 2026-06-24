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
export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;

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
              bloodGroup: body.bloodGroup,
              emergencyContact: body.emergencyContact,
              address: body.address,
            },
          ],
          { session }
        );

        createdUser = user;
        break;
      }

      case "doctor": {
        if (!body.department || !body.specialization || !body.licenseNumber) {
          throw ApiError.badRequest(
            "Doctor registration requires department, specialization, and licenseNumber."
          );
        }

        const department = await Department.findById(body.department).session(session);
        if (!department) {
          throw ApiError.badRequest("Invalid department specified.");
        }

        const existingLicense = await Doctor.findOne({ licenseNumber: body.licenseNumber }).session(session);
        if (existingLicense) {
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
            },
          ],
          { session }
        );

        createdUser = user;
        break;
      }

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

      default:
        throw ApiError.badRequest("Invalid role specified.");
    }

    await session.commitTransaction();
    session.endSession();

    const payload = { id: createdUser.id, role: createdUser.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    createdUser.refreshToken = refreshToken;
    await createdUser.save();

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
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated. Contact admin.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const payload = { id: user.id, role: user.role };
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
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw ApiError.unauthorized("Refresh token missing. Please log in again.");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Refresh token invalid or expired. Please log in again.");
  }

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== token) {
    throw ApiError.unauthorized("Refresh token does not match. Please log in again.");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated.");
  }

  const payload = { id: user.id, role: user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save();

  setAuthCookies(res, newAccessToken, newRefreshToken);

  return res.status(200).json({
    success: true,
    message: "Token refreshed.",
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
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
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized("Not authenticated.");
  }

  const user = await User.findById(req.user.id).select("-refreshToken");
  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  // Attach role-specific profile data
  let profile = null;
  if (user.role === "patient") {
    profile = await Patient.findOne({ user: user._id });
  } else if (user.role === "doctor") {
    profile = await Doctor.findOne({ user: user._id }).populate("department", "name code");
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
        isVerified: user.isVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      profile,
    },
  });
});
