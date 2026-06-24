import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import Patient from "../models/Patient.model";
import User from "../models/User.model";

// CREATE
export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const { user, name, email, phone, ...patientData } = req.body;

  let userId = user;

  // If no existing user ref provided, create a minimal User with role=patient
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
      role: "patient",
    });
    userId = newUser._id;
  }

  const existing = await Patient.findOne({ user: userId });
  if (existing) {
    throw new ApiError(409, "Patient profile already exists for this user");
  }

  const patient = await Patient.create({ user: userId, ...patientData });
  const populated = await patient.populate("user", "-password -refreshToken");

  res.status(201).json(new ApiResponse(201, populated, "Patient created successfully"));
});

// READ (list with pagination/search)
export const getPatients = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, city, bloodGroup, sort } = req.query as any;

  const filter: Record<string, any> = {};
  if (city) filter["address.city"] = new RegExp(city, "i");
  if (bloodGroup) filter.bloodGroup = bloodGroup;

  let query = Patient.find(filter).populate("user", "-password -refreshToken");

  if (search) {
    query = query.populate({
      path: "user",
      match: { name: new RegExp(search, "i") },
      select: "-password -refreshToken",
    });
  }

  const total = await Patient.countDocuments(filter);
  const patients = await query
    .sort(sort || "-createdAt")
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json(
    new ApiResponse(200, {
      patients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  );
});

// READ (single)
export const getPatientById = asyncHandler(async (req: Request, res: Response) => {
  const patient = await Patient.findById(req.params.id).populate(
    "user",
    "-password -refreshToken"
  );
  if (!patient) throw new ApiError(404, "Patient not found");

  res.status(200).json(new ApiResponse(200, patient));
});

// UPDATE
export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("user", "-password -refreshToken");

  if (!patient) throw new ApiError(404, "Patient not found");

  res.status(200).json(new ApiResponse(200, patient, "Patient updated successfully"));
});

// DELETE
export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await Patient.findByIdAndDelete(req.params.id);
  if (!patient) throw new ApiError(404, "Patient not found");

  res.status(200).json(new ApiResponse(200, {}, "Patient deleted successfully"));
});
