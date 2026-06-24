import { Request, Response } from "express";
import mongoose from "mongoose";
import { differenceInYears, differenceInDays, format } from "date-fns";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import Appointment from "../models/Appointment.model";
import QueueEntry from "../models/QueueEntry.model";
import Doctor from "../models/Doctor.model";
import Department from "../models/Department.model";
import Patient from "../models/Patient.model";
import { getNoShowPrediction, NoShowPredictionInput } from "../services/noShowPrediction.service";
import { getIO, ROOMS } from "../config/socket";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Start-of-day UTC for a given date */
const dayStart = (d: Date) => new Date(new Date(d).setHours(0, 0, 0, 0));
/** End-of-day UTC for a given date */
const dayEnd = (d: Date) => new Date(new Date(d).setHours(23, 59, 59, 999));

/**
 * Calculate estimated wait time (minutes) for position N in a doctor's queue.
 * Uses the department's avgConsultationTime.
 */
async function calcEstimatedWait(
  doctorId: mongoose.Types.ObjectId | string,
  departmentId: mongoose.Types.ObjectId | string,
  afterPosition: number
): Promise<number> {
  const dept = await Department.findById(departmentId).select("avgConsultationTime").lean();
  const avgMins = dept?.avgConsultationTime ?? 15;

  // Count how many patients are actively ahead (waiting or called)
  const ahead = await QueueEntry.countDocuments({
    doctor: doctorId,
    queueDate: dayStart(new Date()),
    status: { $in: ["waiting", "called", "in_progress"] },
    positionInQueue: { $lte: afterPosition },
  });

  return ahead * avgMins;
}

/**
 * Emit a full refreshed queue snapshot to all relevant rooms.
 */
async function broadcastQueueUpdate(
  doctorId: string,
  departmentId: string
): Promise<void> {
  const io = getIO();
  const today = dayStart(new Date());

  const queue = await QueueEntry.find({
    doctor: doctorId,
    queueDate: today,
    status: { $in: ["waiting", "called", "in_progress"] },
  })
    .sort({ priority: 1, positionInQueue: 1 })
    .populate("patient", "user")
    .populate("appointment", "reasonForVisit appointmentType")
    .lean();

  const payload = { doctorId, departmentId, queue, updatedAt: new Date() };

  io.to(ROOMS.doctor(doctorId)).emit("queue-updated", payload);
  io.to(ROOMS.department(departmentId)).emit("queue-updated", payload);
  io.to(ROOMS.adminDashboard).emit("queue-updated", payload);
}

async function buildNoShowFeatures(
  appointment: any,
  patient: any,
  department: any
): Promise<NoShowPredictionInput> {
  const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));

  const pastAppointments = await Appointment.find({
    patient: patient._id,
    _id: { $ne: appointment._id },
    status: { $in: ["completed", "no_show", "cancelled"] },
  });
  const totalPastAppointments = pastAppointments.length;
  const pastNoShows = pastAppointments.filter((a) => a.status === "no_show").length;

  const leadTimeDays = Math.max(
    0,
    differenceInDays(new Date(appointment.scheduledDate), new Date(appointment.createdAt))
  );

  const hour = parseInt((appointment.scheduledTimeSlot || "09:00").split(":")[0], 10);
  const timeSlot = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  const distanceKm = await estimateDistanceKm(patient.address);

  return {
    age,
    past_no_shows: pastNoShows,
    total_past_appointments: totalPastAppointments,
    distance_km: distanceKm,
    lead_time_days: leadTimeDays,
    day_of_week: format(new Date(appointment.scheduledDate), "EEEE"),
    time_slot: timeSlot,
    department: department.name,
    appointment_type: appointment.appointmentType,
  };
}

async function estimateDistanceKm(_address: any): Promise<number> {
  // placeholder — wire up a real geocoding/distance API here
  return 10;
}


// ---------------------------------------------------------------------------
// POST /api/appointments  — Book Appointment
// ---------------------------------------------------------------------------
export const bookAppointment = asyncHandler(async (req: Request, res: Response) => {
  const {
    patient,
    doctor: doctorId,
    department: departmentId,
    appointmentType,
    scheduledDate,
    scheduledTimeSlot,
    reasonForVisit,
    symptoms,
    notes,
    priority,
  } = req.body;

  const io = getIO();

  // ── 1. Guard checks ────────────────────────────────────────────────────────
  const [doctor, department, patientDoc] = await Promise.all([
    Doctor.findById(doctorId).lean(),
    Department.findById(departmentId).lean(),
    Patient.findById(patient).lean(),
  ]);

  if (!doctor) throw ApiError.notFound("Doctor not found");
  if (!department) throw ApiError.notFound("Department not found");
  if (!patientDoc) throw ApiError.notFound("Patient not found");
  if (doctor.isOnLeave) throw ApiError.badRequest("Doctor is currently on leave");

  // ── 2. Prevent double-booking same patient on same day ────────────────────
  const existingToday = await Appointment.findOne({
    patient,
    doctor: doctorId,
    scheduledDate: { $gte: dayStart(scheduledDate), $lte: dayEnd(scheduledDate) },
    status: { $nin: ["cancelled", "no_show"] },
  }).lean();

  if (existingToday) {
    throw ApiError.conflict("Patient already has an appointment with this doctor today");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ── 3. Create Appointment ──────────────────────────────────────────────
    const [appointment] = await Appointment.create(
      [
        {
          patient,
          doctor: doctorId,
          department: departmentId,
          appointmentType,
          scheduledDate,
          scheduledTimeSlot,
          reasonForVisit,
          symptoms: symptoms ?? [],
          notes,
          status: appointmentType === "walk_in" ? "checked_in" : "scheduled",
          createdBy: req.user!.id,
          // AI no-show risk placeholder — will be populated by an ML service later
          // noShowRiskScore: null,   // <-- field ready in model; scorer runs async
        },
      ],
      { session }
    );

    // ── 4. Auto-enqueue walk-ins & emergencies ─────────────────────────────
    let queueEntry = null;

    if (appointmentType === "walk_in" || appointmentType === "emergency") {
      const today = dayStart(new Date());

      // Next token for this doctor today
      const lastToken = await QueueEntry.findOne({ doctor: doctorId, queueDate: today })
        .sort({ tokenNumber: -1 })
        .select("tokenNumber")
        .session(session)
        .lean();

      const tokenNumber = (lastToken?.tokenNumber ?? 0) + 1;

      // Position among active queue (priority ordering will be handled by consumers)
      const activeCount = await QueueEntry.countDocuments({
        doctor: doctorId,
        queueDate: today,
        status: { $in: ["waiting", "called"] },
      }).session(session);

      const position = activeCount + 1;
      const estimatedWaitMinutes = await calcEstimatedWait(doctorId, departmentId, position - 1);

      [queueEntry] = await QueueEntry.create(
        [
          {
            tokenNumber,
            patient,
            doctor: doctorId,
            department: departmentId,
            appointment: appointment._id,
            priority: appointmentType === "emergency" ? "emergency" : priority ?? "normal",
            positionInQueue: position,
            estimatedWaitMinutes,
            queueDate: today,
            checkedInAt: new Date(),
          },
        ],
        { session }
      );

      // Back-link on appointment
      appointment.queueEntry = queueEntry._id as mongoose.Types.ObjectId;
      await appointment.save({ session });
    }

    await session.commitTransaction();

    // ── 4.5 Compute ML No-Show Prediction ──────────────────────────────────
    let noShowRisk = null;
    try {
      const features = await buildNoShowFeatures(appointment, patientDoc, department);
      noShowRisk = await getNoShowPrediction(features);
      if (noShowRisk) {
        await Appointment.findByIdAndUpdate(appointment._id, {
          noShowRiskScore: noShowRisk.no_show_probability,
          noShowRiskLevel: noShowRisk.risk_level,
        });
      }
    } catch (predictErr) {
      console.error("Failed to compute no-show prediction:", predictErr);
    }

    // ── 5. Socket events ───────────────────────────────────────────────────
    const populated = await Appointment.findById(appointment._id)
      .populate("patient", "user")
      .populate("doctor", "user specialization")
      .populate("department", "name code")
      .lean();

    // new-appointment → admin / reception dashboard
    io.to(ROOMS.adminDashboard).emit("new-appointment", {
      appointment: populated,
      queueEntry,
    });

    // queue-updated → doctor & department rooms (if queued)
    if (queueEntry) {
      await broadcastQueueUpdate(String(doctorId), String(departmentId));
    }

    return res.status(201).json(
      new ApiResponse(201, { appointment: populated, queueEntry, noShowRisk }, "Appointment booked successfully")
    );
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

// ---------------------------------------------------------------------------
// GET /api/appointments  — List Appointments
// ---------------------------------------------------------------------------
export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, patient, doctor, department, status, date, sort } = req.query as any;

  const filter: Record<string, any> = {};
  if (patient) filter.patient = patient;
  if (doctor) filter.doctor = doctor;
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (date) {
    const d = new Date(date);
    filter.scheduledDate = { $gte: dayStart(d), $lte: dayEnd(d) };
  }

  const total = await Appointment.countDocuments(filter);
  const appointments = await Appointment.find(filter)
    .populate("patient", "user")
    .populate("doctor", "user specialization")
    .populate("department", "name code")
    .populate("queueEntry")
    .sort(sort || "-scheduledDate")
    .skip((page - 1) * limit)
    .limit(limit);

  return res.status(200).json(
    new ApiResponse(200, {
      appointments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  );
});

// ---------------------------------------------------------------------------
// GET /api/appointments/:id
// ---------------------------------------------------------------------------
export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate("patient", "user")
    .populate("doctor", "user specialization")
    .populate("department", "name code")
    .populate("queueEntry");

  if (!appointment) throw ApiError.notFound("Appointment not found");

  return res.status(200).json(new ApiResponse(200, appointment));
});

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:id/status  — Update Appointment Status
// ---------------------------------------------------------------------------
export const updateAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, cancellationReason } = req.body;

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw ApiError.notFound("Appointment not found");

  const now = new Date();
  const prevStatus = appointment.status;

  appointment.status = status;
  if (cancellationReason) appointment.cancellationReason = cancellationReason;
  if (status === "checked_in") appointment.checkedInAt = now;
  if (status === "in_progress") appointment.startedAt = now;
  if (status === "completed") appointment.completedAt = now;

  await appointment.save();

  const io = getIO();
  const populated = await appointment.populate([
    { path: "patient", select: "user" },
    { path: "doctor", select: "user specialization" },
    { path: "department", select: "name code" },
  ]);

  // patient-status-changed → patient's personal room
  io.to(ROOMS.patient(String(appointment.patient))).emit("patient-status-changed", {
    appointmentId: appointment._id,
    prevStatus,
    newStatus: status,
    appointment: populated,
  });

  io.to(ROOMS.adminDashboard).emit("patient-status-changed", {
    appointmentId: appointment._id,
    prevStatus,
    newStatus: status,
  });

  return res.status(200).json(
    new ApiResponse(200, populated, "Appointment status updated")
  );
});
