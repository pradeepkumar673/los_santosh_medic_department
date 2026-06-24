import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import Bed from "../models/Bed.model";

export const createBed = asyncHandler(async (req: Request, res: Response) => {
  const bed = await Bed.create(req.body); // defaults to status: "vacant"
  res.status(201).json(new ApiResponse(201, bed, "Bed created successfully"));
});

export const getBeds = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, bedType, department, ward, sort } = req.query as any;

  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (bedType) filter.bedType = bedType;
  if (department) filter.department = department;
  if (ward) filter.ward = new RegExp(ward, "i");

  const total = await Bed.countDocuments(filter);
  const beds = await Bed.find(filter)
    .populate("department")
    .populate({ path: "currentPatient", populate: { path: "user", select: "name phone" } })
    .sort(sort || "bedNumber")
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json(
    new ApiResponse(200, {
      beds,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  );
});

export const getBedById = asyncHandler(async (req: Request, res: Response) => {
  const bed = await Bed.findById(req.params.id)
    .populate("department")
    .populate({ path: "currentPatient", populate: { path: "user", select: "name phone" } });

  if (!bed) throw new ApiError(404, "Bed not found");

  res.status(200).json(new ApiResponse(200, bed));
});

export const updateBed = asyncHandler(async (req: Request, res: Response) => {
  // General field updates (ward, floor, pricePerDay, amenities, etc.) — NOT status transitions
  const { status, currentPatient, ...rest } = req.body;

  const bed = await Bed.findByIdAndUpdate(req.params.id, rest, {
    new: true,
    runValidators: true,
  });

  if (!bed) throw new ApiError(404, "Bed not found");

  res.status(200).json(new ApiResponse(200, bed, "Bed updated successfully"));
});

// Dedicated status-transition handler — enforces business rules around occupancy
export const updateBedStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, currentPatient, expectedDischargeDate } = req.body;

  const bed = await Bed.findById(req.params.id);
  if (!bed) throw new ApiError(404, "Bed not found");

  if (status === "occupied") {
    if (bed.status === "occupied") {
      throw new ApiError(409, "Bed is already occupied");
    }
    bed.status = "occupied";
    bed.currentPatient = currentPatient;
    bed.assignedAt = new Date();
    bed.expectedDischargeDate = expectedDischargeDate;
  } else {
    // Discharging, sending for cleaning, or maintenance — clear patient assignment
    bed.status = status;
    bed.currentPatient = undefined;
    bed.assignedAt = undefined;
    bed.expectedDischargeDate = undefined;
  }

  await bed.save();

  res.status(200).json(new ApiResponse(200, bed, `Bed status updated to '${status}'`));
});

export const deleteBed = asyncHandler(async (req: Request, res: Response) => {
  const bed = await Bed.findById(req.params.id);
  if (!bed) throw new ApiError(404, "Bed not found");

  if (bed.status === "occupied") {
    throw new ApiError(409, "Cannot delete a bed that is currently occupied");
  }

  await bed.deleteOne();

  res.status(200).json(new ApiResponse(200, {}, "Bed deleted successfully"));
});
