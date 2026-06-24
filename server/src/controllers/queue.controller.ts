import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import QueueEntry, { QueueStatus } from "../models/QueueEntry.model";
import Appointment from "../models/Appointment.model";
import Department from "../models/Department.model";
import Doctor from "../models/Doctor.model";
import { getIO, ROOMS } from "../config/socket";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const dayStart = (d = new Date()) => new Date(new Date(d).setHours(0, 0, 0, 0));

/** Priority weight for sorting (lower = higher priority) */
const PRIORITY_WEIGHT: Record<string, number> = {
  emergency: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Re-calculate and persist estimatedWaitMinutes for every waiting entry
 * in a doctor's queue for today.
 */
async function recalcWaitTimes(doctorId: string, avgMins: number): Promise<void> {
  const waitingEntries = await QueueEntry.find({
    doctor: doctorId,
    queueDate: dayStart(),
    status: "waiting",
  }).sort({ positionInQueue: 1 });

  let cumulativeWait = 0;
  const bulk = waitingEntries.map((entry, idx) => {
    cumulativeWait = idx * avgMins;
    return {
      updateOne: {
        filter: { _id: entry._id },
        update: { $set: { estimatedWaitMinutes: cumulativeWait } },
      },
    };
  });

  if (bulk.length) await QueueEntry.bulkWrite(bulk);
}

/**
 * Broadcast a full queue snapshot to doctor/dept/admin rooms.
 */
async function broadcastQueueUpdate(doctorId: string, departmentId: string): Promise<void> {
  const io = getIO();
  const queue = await QueueEntry.find({
    doctor: doctorId,
    queueDate: dayStart(),
    status: { $in: ["waiting", "called", "in_progress"] },
  })
    .sort({ positionInQueue: 1 })
    .populate("patient", "user")
    .populate("appointment", "reasonForVisit appointmentType scheduledTimeSlot")
    .lean();

  const payload = { doctorId, departmentId, queue, updatedAt: new Date() };

  io.to(ROOMS.doctor(doctorId)).emit("queue-updated", payload);
  io.to(ROOMS.department(departmentId)).emit("queue-updated", payload);
  io.to(ROOMS.adminDashboard).emit("queue-updated", payload);
}

// ---------------------------------------------------------------------------
// GET /api/queue  — Get Live Queue
// ---------------------------------------------------------------------------
export const getLiveQueue = asyncHandler(async (req: Request, res: Response) => {
  const { doctorId, departmentId, date } = req.query as Record<string, string>;

  if (!doctorId && !departmentId) {
    throw ApiError.badRequest("Provide at least one of: doctorId, departmentId");
  }

  const queueDate = date ? dayStart(new Date(date)) : dayStart();
  const filter: Record<string, any> = {
    queueDate,
    status: { $in: ["waiting", "called", "in_progress"] },
  };

  if (doctorId) filter.doctor = doctorId;
  if (departmentId) filter.department = departmentId;

  const entries = await QueueEntry.find(filter)
    .sort({ positionInQueue: 1 })
    .populate("patient", "user")
    .populate("doctor", "user specialization availabilityStatus")
    .populate("department", "name code avgConsultationTime")
    .populate("appointment", "reasonForVisit appointmentType scheduledTimeSlot symptoms");

  // Summary stats
  const totalWaiting = entries.filter((e) => e.status === "waiting").length;
  const totalCalled = entries.filter((e) => e.status === "called").length;
  const inProgress = entries.filter((e) => e.status === "in_progress").length;

  const avgWait =
    entries.length > 0
      ? Math.round(
          entries
            .filter((e) => e.status === "waiting")
            .reduce((sum, e) => sum + e.estimatedWaitMinutes, 0) /
            Math.max(totalWaiting, 1)
        )
      : 0;

  return res.status(200).json(
    new ApiResponse(200, {
      entries,
      stats: { totalWaiting, totalCalled, inProgress, avgWaitMinutes: avgWait },
      asOf: new Date(),
    })
  );
});

// ---------------------------------------------------------------------------
// POST /api/queue/call-next  — Call Next Patient
// ---------------------------------------------------------------------------
export const callNextPatient = asyncHandler(async (req: Request, res: Response) => {
  const { doctorId } = req.body as { doctorId: string };

  if (!doctorId) throw ApiError.badRequest("doctorId is required");

  const doctor = await Doctor.findById(doctorId).populate("department").lean();
  if (!doctor) throw ApiError.notFound("Doctor not found");

  // Finish any current in_progress entry first
  const currentInProgress = await QueueEntry.findOne({
    doctor: doctorId,
    queueDate: dayStart(),
    status: "in_progress",
  });
  if (currentInProgress) {
    throw ApiError.badRequest(
      "A patient is already in progress. Complete or update them before calling the next."
    );
  }

  // Pick next: priority then position
  const next = await QueueEntry.findOne({
    doctor: doctorId,
    queueDate: dayStart(),
    status: "waiting",
  })
    .sort({ positionInQueue: 1 })
    .populate("patient", "user")
    .populate("appointment");

  if (!next) {
    return res.status(200).json(new ApiResponse(200, null, "Queue is empty — no patients waiting"));
  }

  next.status = "called";
  next.calledAt = new Date();
  await next.save();

  const io = getIO();
  const deptId = String(doctor.department);

  // Notify the patient it's their turn
  io.to(ROOMS.patient(String(next.patient))).emit("patient-status-changed", {
    type: "your_turn",
    queueEntry: next,
    message: `Token #${next.tokenNumber} — please proceed to the doctor's room`,
  });

  // Broadcast queue update
  await broadcastQueueUpdate(doctorId, deptId);

  return res.status(200).json(new ApiResponse(200, next, `Token #${next.tokenNumber} called`));
});

// ---------------------------------------------------------------------------
// PATCH /api/queue/:id/status  — Update Queue Entry Status
// ---------------------------------------------------------------------------
export const updateQueueStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: QueueStatus };
  const validTransitions: Partial<Record<QueueStatus, QueueStatus[]>> = {
    waiting: ["called", "cancelled", "skipped"],
    called: ["in_progress", "skipped", "cancelled"],
    in_progress: ["completed", "skipped"],
  };

  const entry = await QueueEntry.findById(req.params.id).populate("doctor").lean();
  if (!entry) throw ApiError.notFound("Queue entry not found");

  const allowed = validTransitions[entry.status];
  if (!allowed || !allowed.includes(status)) {
    throw ApiError.badRequest(
      `Cannot transition from '${entry.status}' to '${status}'`
    );
  }

  const now = new Date();
  const update: Partial<typeof entry> & Record<string, any> = { status };
  if (status === "in_progress") update.startedAt = now;
  if (status === "completed") update.completedAt = now;

  const updated = await QueueEntry.findByIdAndUpdate(req.params.id, update, {
    new: true,
  })
    .populate("patient", "user")
    .populate("appointment", "reasonForVisit");

  if (!updated) throw ApiError.notFound("Queue entry not found");

  // Sync linked appointment status
  if (updated.appointment) {
    const appointmentStatusMap: Partial<Record<QueueStatus, string>> = {
      in_progress: "in_progress",
      completed: "completed",
      cancelled: "cancelled",
    };
    const mappedStatus = appointmentStatusMap[status];
    if (mappedStatus) {
      await Appointment.findByIdAndUpdate(updated.appointment, { status: mappedStatus });
    }
  }

  const io = getIO();
  const doctorObj = entry.doctor as any;
  const deptId = String(doctorObj?.department ?? "");
  const doctorId = String(entry.doctor);

  // Recalc wait times for remaining patients
  const dept = await Department.findById(deptId).select("avgConsultationTime").lean();
  await recalcWaitTimes(doctorId, dept?.avgConsultationTime ?? 15);

  // patient-status-changed
  io.to(ROOMS.patient(String(entry.patient))).emit("patient-status-changed", {
    type: "status_update",
    queueEntryId: updated._id,
    newStatus: status,
  });

  // queue-updated broadcast
  await broadcastQueueUpdate(doctorId, deptId);

  return res.status(200).json(new ApiResponse(200, updated, "Queue entry updated"));
});

// ---------------------------------------------------------------------------
// GET /api/queue/estimated-wait  — Estimated Wait for a specific token
// ---------------------------------------------------------------------------
export const getEstimatedWait = asyncHandler(async (req: Request, res: Response) => {
  const { queueEntryId } = req.query as { queueEntryId: string };
  if (!queueEntryId) throw ApiError.badRequest("queueEntryId is required");

  const entry = await QueueEntry.findById(queueEntryId)
    .populate("department", "avgConsultationTime")
    .lean();
  if (!entry) throw ApiError.notFound("Queue entry not found");

  if (entry.status !== "waiting") {
    return res.status(200).json(
      new ApiResponse(200, {
        status: entry.status,
        estimatedWaitMinutes: 0,
        message: `Patient is already ${entry.status}`,
      })
    );
  }

  // Count patients ahead in the same doctor queue
  const patientsAhead = await QueueEntry.countDocuments({
    doctor: entry.doctor,
    queueDate: dayStart(),
    status: { $in: ["waiting", "called", "in_progress"] },
    positionInQueue: { $lt: entry.positionInQueue },
  });

  const dept = entry.department as any;
  const avgMins: number = dept?.avgConsultationTime ?? 15;
  const estimatedWaitMinutes = patientsAhead * avgMins;

  return res.status(200).json(
    new ApiResponse(200, {
      tokenNumber: entry.tokenNumber,
      positionInQueue: entry.positionInQueue,
      patientsAhead,
      estimatedWaitMinutes,
      estimatedCallTime: new Date(Date.now() + estimatedWaitMinutes * 60 * 1000),
    })
  );
});
