import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import Doctor from "../models/Doctor.model";
import User from "../models/User.model";

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { user, name, email, phone, ...doctorData } = req.body;

  let userId = user;

  if (!userId) {
    if (!name || !email || !phone) {
      throw new ApiError(400, "name, email, and phone are required when no user ref is provided");
    }
    const tempPassword = Math.random().toString(36).slice(-10);
    const newUser = await User.create({
      name,
      email,
      phone,
      password: tempPassword,
      role: "doctor",
    });
    userId = newUser._id;
  }

  const existing = await Doctor.findOne({ user: userId });
  if (existing) throw new ApiError(409, "Doctor profile already exists for this user");

  const doctor = await Doctor.create({ user: userId, ...doctorData });
  const populated = await doctor.populate([
    { path: "user", select: "-password -refreshToken" },
    { path: "department" },
  ]);

  res.status(201).json(new ApiResponse(201, populated, "Doctor created successfully"));
});

export const getDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, specialization, department, availabilityStatus, sort } = req.query as any;

  const filter: Record<string, any> = {};
  if (specialization) filter.specialization = new RegExp(specialization, "i");
  if (department) filter.department = department;
  if (availabilityStatus) filter.availabilityStatus = availabilityStatus;

  const total = await Doctor.countDocuments(filter);
  const doctors = await Doctor.find(filter)
    .populate("user", "-password -refreshToken")
    .populate("department")
    .sort(sort || "-createdAt")
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json(
    new ApiResponse(200, {
      doctors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  );
});

export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await Doctor.findById(req.params.id)
    .populate("user", "-password -refreshToken")
    .populate("department");

  if (!doctor) throw new ApiError(404, "Doctor not found");

  res.status(200).json(new ApiResponse(200, doctor));
});

export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("user", "-password -refreshToken")
    .populate("department");

  if (!doctor) throw new ApiError(404, "Doctor not found");

  res.status(200).json(new ApiResponse(200, doctor, "Doctor updated successfully"));
});

export const deleteDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) throw new ApiError(404, "Doctor not found");

  res.status(200).json(new ApiResponse(200, {}, "Doctor deleted successfully"));
});
