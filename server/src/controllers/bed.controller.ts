import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import Bed, { BedStatus } from "../models/Bed.model";
import BedAllocation from "../models/BedAllocation.model";
import Patient from "../models/Patient.model";
import { getIO, ROOMS } from "../config/socket";

async function populatedBed(id: string | mongoose.Types.ObjectId) {
  return Bed.findById(id)
    .populate("department", "name code")
    .populate({
      path: "currentPatient",
      populate: { path: "user", select: "name phone email" },
    });
}

async function emitBedUpdate(
  bedId: string | mongoose.Types.ObjectId,
  departmentId: string | mongoose.Types.ObjectId,
  eventMeta: Record<string, unknown> = {}
) {
  const io = getIO();

  const bed = await populatedBed(String(bedId));

  const summary = await Bed.aggregate([
    { $match: { department: new mongoose.Types.ObjectId(String(departmentId)) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const occupancyMap = Object.fromEntries(
    summary.map((s: { _id: string; count: number }) => [s._id, s.count])
  );

  const payload = {
    bed,
    departmentId: String(departmentId),
    occupancy: {
      vacant: occupancyMap["vacant"] ?? 0,
      occupied: occupancyMap["occupied"] ?? 0,
      cleaning: occupancyMap["cleaning"] ?? 0,
      maintenance: occupancyMap["maintenance"] ?? 0,
    },
    ...eventMeta,
    updatedAt: new Date(),
  };

  io.to(ROOMS.department(String(departmentId))).emit("bed-status-changed", payload);
  io.to(ROOMS.adminDashboard).emit("bed-status-changed", payload);
}

export const createBed = asyncHandler(async (req: Request, res: Response) => {
  const bed = await Bed.create(req.body);
  const populated = await populatedBed(bed._id as mongoose.Types.ObjectId);

  await emitBedUpdate(bed._id as mongoose.Types.ObjectId, bed.department, { action: "created" });

  res.status(201).json(new ApiResponse(201, populated, "Bed created successfully"));
});

export const getBeds = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, bedType, department, ward, floor, sort } = req.query as any;

  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (bedType) filter.bedType = bedType;
  if (department) filter.department = department;
  if (ward) filter.ward = new RegExp(ward, "i");
  if (floor !== undefined) filter.floor = floor;

  const [total, beds, summaryRaw] = await Promise.all([
    Bed.countDocuments(filter),

    Bed.find(filter)
      .populate("department", "name code")
      .populate({
        path: "currentPatient",
        populate: { path: "user", select: "name phone" },
      })
      .sort(sort || "bedNumber")
      .skip((page - 1) * limit)
      .limit(limit),

    Bed.aggregate([
      ...(department
        ? [{ $match: { department: new mongoose.Types.ObjectId(department) } }]
        : []),
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const occupancy = Object.fromEntries(
    summaryRaw.map((s: { _id: string; count: number }) => [s._id, s.count])
  );

  res.status(200).json(
    new ApiResponse(200, {
      beds,
      occupancy: {
        vacant: occupancy["vacant"] ?? 0,
        occupied: occupancy["occupied"] ?? 0,
        cleaning: occupancy["cleaning"] ?? 0,
        maintenance: occupancy["maintenance"] ?? 0,
        total,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  );
});

export const getBedById = asyncHandler(async (req: Request, res: Response) => {
  const bed = await populatedBed(req.params.id);
  if (!bed) throw ApiError.notFound("Bed not found");

  const activeAllocation =
    bed.status === "occupied"
      ? await BedAllocation.findOne({ bed: bed._id, status: "active" })
          .populate("allocatedBy", "name role")
          .lean()
      : null;

  res.status(200).json(new ApiResponse(200, { bed, activeAllocation }));
});

export const updateBed = asyncHandler(async (req: Request, res: Response) => {
  const { status, currentPatient, assignedAt, expectedDischargeDate, ...rest } = req.body;

  const bed = await Bed.findByIdAndUpdate(req.params.id, rest, {
    new: true,
    runValidators: true,
  });
  if (!bed) throw ApiError.notFound("Bed not found");

  const populated = await populatedBed(bed._id as mongoose.Types.ObjectId);
  await emitBedUpdate(bed._id as mongoose.Types.ObjectId, bed.department, {
    action: "metadata_updated",
  });

  res.status(200).json(new ApiResponse(200, populated, "Bed updated successfully"));
});

export const deleteBed = asyncHandler(async (req: Request, res: Response) => {
  const bed = await Bed.findById(req.params.id);
  if (!bed) throw ApiError.notFound("Bed not found");
  if (bed.status === "occupied") {
    throw ApiError.conflict("Cannot delete an occupied bed. Discharge the patient first.");
  }

  const deptId = bed.department;
  await bed.deleteOne();

  await emitBedUpdate(req.params.id, deptId, { action: "deleted", bedId: req.params.id });

  res.status(200).json(new ApiResponse(200, {}, "Bed deleted successfully"));
});

export const allocateBed = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, admissionReason, expectedDischargeDate } = req.body;

  const [bed, patient] = await Promise.all([
    Bed.findById(req.params.id),
    Patient.findById(patientId).populate("user", "name phone"),
  ]);

  if (!bed) throw ApiError.notFound("Bed not found");
  if (!patient) throw ApiError.notFound("Patient not found");

  if (bed.status !== "vacant") {
    throw ApiError.conflict(
      `Bed is currently '${bed.status}'. Only vacant beds can be allocated.`
    );
  }

  const existingAllocation = await BedAllocation.findOne({
    patient: patientId,
    status: "active",
  }).lean();
  if (existingAllocation) {
    throw ApiError.conflict("Patient is already allocated to a bed. Discharge them first.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    bed.status = "occupied";
    bed.currentPatient = patient._id as mongoose.Types.ObjectId;
    bed.assignedAt = new Date();
    if (expectedDischargeDate) bed.expectedDischargeDate = expectedDischargeDate;
    await bed.save({ session });

    const [allocation] = await BedAllocation.create(
      [
        {
          bed: bed._id,
          patient: patient._id,
          department: bed.department,
          allocatedBy: req.user!.id,
          admissionReason,
          expectedDischargeDate: expectedDischargeDate ?? undefined,
          allocatedAt: new Date(),
          status: "active",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const populated = await populatedBed(bed._id as mongoose.Types.ObjectId);
    const populatedAllocation = await BedAllocation.findById(allocation._id)
      .populate("allocatedBy", "name role")
      .populate({ path: "patient", populate: { path: "user", select: "name phone" } })
      .lean();

    await emitBedUpdate(bed._id as mongoose.Types.ObjectId, bed.department, {
      action: "allocated",
      patientId: String(patient._id),
      allocationId: String(allocation._id),
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        { bed: populated, allocation: populatedAllocation },
        "Bed allocated successfully"
      )
    );
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

export const dischargeBed = asyncHandler(async (req: Request, res: Response) => {
  const { dischargeNotes, nextStatus } = req.body as {
    dischargeNotes?: string;
    nextStatus: "vacant" | "cleaning" | "maintenance";
  };

  const bed = await Bed.findById(req.params.id);
  if (!bed) throw ApiError.notFound("Bed not found");

  if (bed.status !== "occupied") {
    throw ApiError.conflict(`Bed is '${bed.status}' — only occupied beds can be discharged.`);
  }

  const allocation = await BedAllocation.findOne({ bed: bed._id, status: "active" });
  if (!allocation) {
    throw ApiError.internal("No active allocation record found. Please reconcile data manually.");
  }

  const dischargedAt = new Date();
  const allocatedAt = allocation.allocatedAt;
  const diffMs = dischargedAt.getTime() - allocatedAt.getTime();
  const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const pricePerDay = bed.pricePerDay ?? 0;
  const totalBillingAmount = totalDays * pricePerDay;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    allocation.status = "discharged";
    allocation.dischargedBy = new mongoose.Types.ObjectId(req.user!.id);
    allocation.dischargedAt = dischargedAt;
    allocation.dischargeNotes = dischargeNotes;
    allocation.totalDays = totalDays;
    allocation.totalBillingAmount = totalBillingAmount;
    await allocation.save({ session });

    bed.status = nextStatus as BedStatus;
    bed.currentPatient = undefined;
    bed.assignedAt = undefined;
    bed.expectedDischargeDate = undefined;
    await bed.save({ session });

    await session.commitTransaction();

    const populated = await populatedBed(bed._id as mongoose.Types.ObjectId);
    const populatedAllocation = await BedAllocation.findById(allocation._id)
      .populate("allocatedBy", "name role")
      .populate("dischargedBy", "name role")
      .populate({ path: "patient", populate: { path: "user", select: "name phone" } })
      .lean();

    await emitBedUpdate(bed._id as mongoose.Types.ObjectId, bed.department, {
      action: "discharged",
      patientId: String(allocation.patient),
      allocationId: String(allocation._id),
      totalDays,
      totalBillingAmount,
      nextStatus,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        { bed: populated, allocation: populatedAllocation },
        "Patient discharged successfully"
      )
    );
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

export const updateBedStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;

  const bed = await Bed.findById(req.params.id);
  if (!bed) throw ApiError.notFound("Bed not found");

  if (bed.status === "occupied" && status !== "occupied") {
    throw ApiError.conflict("Bed is currently occupied. Use POST /discharge to free it.");
  }
  if (status === "occupied") {
    throw ApiError.badRequest("Use POST /api/beds/:id/allocate to assign a patient to a bed.");
  }

  bed.status = status;
  if (status !== "occupied") {
    bed.currentPatient = undefined;
    bed.assignedAt = undefined;
    bed.expectedDischargeDate = undefined;
  }

  await bed.save();

  const populated = await populatedBed(bed._id as mongoose.Types.ObjectId);
  await emitBedUpdate(bed._id as mongoose.Types.ObjectId, bed.department, {
    action: "status_changed",
    newStatus: status,
  });

  res.status(200).json(new ApiResponse(200, populated, `Bed status updated to '${status}'`));
});

export const getAllocations = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, patient, department, bed, status, sort } = req.query as any;

  const filter: Record<string, any> = {};
  if (patient) filter.patient = patient;
  if (department) filter.department = department;
  if (bed) filter.bed = bed;
  if (status) filter.status = status;

  const total = await BedAllocation.countDocuments(filter);
  const allocations = await BedAllocation.find(filter)
    .populate({
      path: "bed",
      select: "bedNumber ward floor bedType pricePerDay",
      populate: { path: "department", select: "name code" },
    })
    .populate({ path: "patient", populate: { path: "user", select: "name phone" } })
    .populate("allocatedBy", "name role")
    .populate("dischargedBy", "name role")
    .sort(sort || "-allocatedAt")
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json(
    new ApiResponse(200, {
      allocations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  );
});

export const getAllocationById = asyncHandler(async (req: Request, res: Response) => {
  const allocation = await BedAllocation.findById(req.params.id)
    .populate({
      path: "bed",
      populate: { path: "department", select: "name code" },
    })
    .populate({ path: "patient", populate: { path: "user", select: "name phone email" } })
    .populate("allocatedBy", "name role")
    .populate("dischargedBy", "name role");

  if (!allocation) throw ApiError.notFound("Allocation record not found");

  res.status(200).json(new ApiResponse(200, allocation));
});
