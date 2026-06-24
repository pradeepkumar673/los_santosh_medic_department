import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import Department from "../models/Department.model";

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await Department.create(req.body);
  res.status(201).json(new ApiResponse(201, department, "Department created successfully"));
});

export const getDepartments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, isActive, search, sort } = req.query as any;

  const filter: Record<string, any> = {};
  if (isActive !== undefined) filter.isActive = isActive;
  if (search) filter.name = new RegExp(search, "i");

  const total = await Department.countDocuments(filter);
  const departments = await Department.find(filter)
    .populate({ path: "headDoctor", populate: { path: "user", select: "name email" } })
    .sort(sort || "name")
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json(
    new ApiResponse(200, {
      departments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  );
});

export const getDepartmentById = asyncHandler(async (req: Request, res: Response) => {
  const department = await Department.findById(req.params.id).populate({
    path: "headDoctor",
    populate: { path: "user", select: "name email" },
  });

  if (!department) throw new ApiError(404, "Department not found");

  res.status(200).json(new ApiResponse(200, department));
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!department) throw new ApiError(404, "Department not found");

  res.status(200).json(new ApiResponse(200, department, "Department updated successfully"));
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await Department.findByIdAndDelete(req.params.id);
  if (!department) throw new ApiError(404, "Department not found");

  res.status(200).json(new ApiResponse(200, {}, "Department deleted successfully"));
});
