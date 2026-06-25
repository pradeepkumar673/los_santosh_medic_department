import { Request, Response } from "express";
import { differenceInYears, differenceInDays, format } from "date-fns";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import MedicalAssessment from "../models/MedicalAssessment.model";
import Patient from "../models/Patient.model";
import Appointment from "../models/Appointment.model";
import Department from "../models/Department.model";
import QueueEntry from "../models/QueueEntry.model";
import { runTriageEngine, buildOverrideResult } from "../services/triage.service";
import { getNoShowPrediction, NoShowPredictionInput } from "../services/noShowPrediction.service";
import { getIO, ROOMS } from "../config/socket";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const POPULATE_PATIENT = { path: "patient", select: "user dateOfBirth gender bloodGroup" };
const POPULATE_ASSESSED_BY = { path: "assessedBy", select: "name role" };
const POPULATE_OVERRIDDEN_BY = { path: "triageOverriddenBy", select: "name role" };
const POPULATE_APPOINTMENT = {
  path: "appointment",
  select: "scheduledDate scheduledTimeSlot appointmentType status doctor department",
};

/**
 * Re-syncs a linked QueueEntry's priority with the assessment's current
 * triage severity, and broadcasts the change so live queue boards reflect
 * triage decisions (including manual overrides) in real time.
 */
async function syncQueuePriorityFromTriage(
  appointmentId: unknown,
  priority: "emergency" | "high" | "normal" | "low"
): Promise<void> {
  if (!appointmentId) return;

  const queueEntry = await QueueEntry.findOne({ appointment: appointmentId });
  if (!queueEntry || queueEntry.priority === priority) return;

  queueEntry.priority = priority;
  await queueEntry.save();

  const io = getIO();
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const queue = await QueueEntry.find({
    doctor: queueEntry.doctor,
    queueDate: today,
    status: { $in: ["waiting", "called", "in_progress"] },
  })
    .sort({ priority: 1, positionInQueue: 1 })
    .populate("patient", "user")
    .populate("appointment", "reasonForVisit appointmentType")
    .lean();

  const payload = {
    doctorId: String(queueEntry.doctor),
    departmentId: String(queueEntry.department),
    queue,
    updatedAt: new Date(),
  };

  io.to(ROOMS.doctor(String(queueEntry.doctor))).emit("queue-updated", payload);
  io.to(ROOMS.department(String(queueEntry.department))).emit("queue-updated", payload);
  io.to(ROOMS.adminDashboard).emit("queue-updated", payload);
}

/**
 * Builds no-show prediction features once an assessment has a real linked
 * appointment to draw scheduling context (lead time, slot, department) from.
 * Mirrors appointment.controller's feature shape so the ML service sees a
 * consistent input contract regardless of which flow triggered the call.
 */
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

  return {
    age,
    past_no_shows: pastNoShows,
    total_past_appointments: totalPastAppointments,
    distance_km: 10, // refined once a real geocoding source is wired in
    lead_time_days: leadTimeDays,
    day_of_week: format(new Date(appointment.scheduledDate), "EEEE"),
    time_slot: timeSlot,
    department: department.name,
    appointment_type: appointment.appointmentType,
  };
}

// ---------------------------------------------------------------------------
// POST /api/assessments/score-only  — Dry-run triage preview (no DB write)
// ---------------------------------------------------------------------------
export const scoreOnly = asyncHandler(async (req: Request, res: Response) => {
  const { chiefComplaint, symptoms, vitals, patientAge } = req.body;

  const result = runTriageEngine({
    chiefComplaint,
    symptoms,
    vitals,
    age: patientAge,
  });

  return res.status(200).json(new ApiResponse(200, result, "Triage score computed"));
});

// ---------------------------------------------------------------------------
// POST /api/assessments  — Submit a full pre-booking assessment
// ---------------------------------------------------------------------------
export const submitAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, chiefComplaint, symptoms, vitals, notes, attachments, patientAge } = req.body;

  const patient = await Patient.findById(patientId).lean();
  if (!patient) throw ApiError.notFound("Patient not found");

  const age = patientAge ?? differenceInYears(new Date(), new Date(patient.dateOfBirth));

  const triage = runTriageEngine({ chiefComplaint, symptoms, vitals, age });

  const assessment = await MedicalAssessment.create({
    patient: patientId,
    assessedBy: req.user!.id,
    triageSeverity: triage.severity,
    triageScore: triage.score,
    triageBreakdown: triage.breakdown,
    chiefComplaint,
    symptoms,
    vitals: vitals ?? {},
    notes,
    attachments: attachments ?? [],
    assessmentStatus: "pending_booking",
  });

  const populated = await MedicalAssessment.findById(assessment._id)
    .populate(POPULATE_PATIENT)
    .populate(POPULATE_ASSESSED_BY)
    .lean();

  // Notify reception/admin dashboards immediately — critical/urgent triage
  // results need eyes on them before the booking step even happens.
  const io = getIO();
  io.to(ROOMS.adminDashboard).emit("assessment-submitted", {
    assessment: populated,
    suggestedAppointmentType: triage.suggestedAppointmentType,
    suggestedPriority: triage.suggestedPriority,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        assessment: populated,
        suggestedAppointmentType: triage.suggestedAppointmentType,
        suggestedPriority: triage.suggestedPriority,
      },
      "Assessment submitted"
    )
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/assessments/:id/link-appointment
// ---------------------------------------------------------------------------
export const linkAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { appointmentId } = req.body;

  const assessment = await MedicalAssessment.findById(req.params.id);
  if (!assessment) throw ApiError.notFound("Assessment not found");

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw ApiError.notFound("Appointment not found");

  assessment.appointment = appointment._id;
  assessment.assessmentStatus = "booked";
  await assessment.save();

  // Back-propagate critical triage into the appointment/queue: if triage says
  // critical but the appointment wasn't booked as an emergency, escalate it.
  let escalated = false;
  if (assessment.triageSeverity === "critical" && appointment.appointmentType !== "emergency") {
    appointment.appointmentType = "emergency";
    await appointment.save();
    escalated = true;
  }

  if (escalated || assessment.triageSeverity === "critical") {
    await syncQueuePriorityFromTriage(appointment._id, "emergency");
  }

  // Now that scheduling context exists, (re)compute no-show risk using the
  // richer, assessment-informed picture. Never let a prediction failure
  // block the linking operation itself.
  let noShowRisk = null;
  try {
    const [patient, department] = await Promise.all([
      Patient.findById(assessment.patient).lean(),
      Department.findById(appointment.department).lean(),
    ]);
    if (patient && department) {
      const features = await buildNoShowFeatures(appointment, patient, department);
      noShowRisk = await getNoShowPrediction(features);
      if (noShowRisk) {
        appointment.noShowRiskScore = noShowRisk.no_show_probability;
        appointment.noShowRiskLevel = noShowRisk.risk_level;
        await appointment.save();
      }
    }
  } catch (predictErr) {
    console.error("Failed to recompute no-show prediction on assessment link:", predictErr);
  }

  const populated = await MedicalAssessment.findById(assessment._id)
    .populate(POPULATE_PATIENT)
    .populate(POPULATE_ASSESSED_BY)
    .populate(POPULATE_APPOINTMENT)
    .lean();

  const io = getIO();
  io.to(ROOMS.adminDashboard).emit("assessment-linked", { assessment: populated, escalated, noShowRisk });
  io.to(ROOMS.patient(String(assessment.patient))).emit("assessment-linked", {
    assessmentId: assessment._id,
    appointmentId: appointment._id,
    escalated,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { assessment: populated, noShowRisk },
      escalated ? "Assessment linked — appointment escalated to emergency" : "Assessment linked to appointment"
    )
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/assessments/:id/triage-override
// ---------------------------------------------------------------------------
export const overrideTriage = asyncHandler(async (req: Request, res: Response) => {
  const { triageSeverity, overrideReason } = req.body;

  const assessment = await MedicalAssessment.findById(req.params.id);
  if (!assessment) throw ApiError.notFound("Assessment not found");

  // Original computed score is preserved for audit; only severity changes.
  assessment.triageSeverity = triageSeverity;
  assessment.triageOverriddenBy = req.user!.id as any;
  assessment.triageOverrideReason = overrideReason;
  await assessment.save();

  const suggestion = buildOverrideResult(triageSeverity, assessment.triageScore);

  if (assessment.appointment) {
    await syncQueuePriorityFromTriage(assessment.appointment, suggestion.suggestedPriority);
  }

  const populated = await MedicalAssessment.findById(assessment._id)
    .populate(POPULATE_PATIENT)
    .populate(POPULATE_ASSESSED_BY)
    .populate(POPULATE_OVERRIDDEN_BY)
    .populate(POPULATE_APPOINTMENT)
    .lean();

  const io = getIO();
  io.to(ROOMS.adminDashboard).emit("assessment-triage-overridden", {
    assessment: populated,
    ...suggestion,
  });
  io.to(ROOMS.patient(String(assessment.patient))).emit("assessment-triage-overridden", {
    assessmentId: assessment._id,
    triageSeverity,
  });

  return res.status(200).json(
    new ApiResponse(200, { assessment: populated, ...suggestion }, "Triage severity overridden")
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/assessments/:id  — Post-consultation clinical update
// ---------------------------------------------------------------------------
export const updateAssessment = asyncHandler(async (req: Request, res: Response) => {
  const {
    diagnosis,
    prescriptions,
    labTestsOrdered,
    followUpRequired,
    followUpDate,
    notes,
    assessmentStatus,
  } = req.body;

  const assessment = await MedicalAssessment.findById(req.params.id);
  if (!assessment) throw ApiError.notFound("Assessment not found");

  if (diagnosis !== undefined) assessment.diagnosis = diagnosis;
  if (prescriptions !== undefined) assessment.prescriptions = prescriptions;
  if (labTestsOrdered !== undefined) assessment.labTestsOrdered = labTestsOrdered;
  if (followUpRequired !== undefined) assessment.followUpRequired = followUpRequired;
  if (followUpDate !== undefined) assessment.followUpDate = followUpDate;
  if (notes !== undefined) assessment.notes = notes;
  if (assessmentStatus !== undefined) assessment.assessmentStatus = assessmentStatus;

  await assessment.save();

  const populated = await MedicalAssessment.findById(assessment._id)
    .populate(POPULATE_PATIENT)
    .populate(POPULATE_ASSESSED_BY)
    .populate(POPULATE_APPOINTMENT)
    .lean();

  const io = getIO();
  io.to(ROOMS.patient(String(assessment.patient))).emit("assessment-updated", { assessment: populated });
  io.to(ROOMS.adminDashboard).emit("assessment-updated", {
    assessmentId: assessment._id,
    assessmentStatus: assessment.assessmentStatus,
  });

  return res.status(200).json(new ApiResponse(200, populated, "Assessment updated"));
});

// ---------------------------------------------------------------------------
// GET /api/assessments  — List with filters
// ---------------------------------------------------------------------------
export const getAssessments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, patientId, assessmentStatus, triageSeverity, sort } = req.query as any;

  const filter: Record<string, any> = {};
  if (patientId) filter.patient = patientId;
  if (assessmentStatus) filter.assessmentStatus = assessmentStatus;
  if (triageSeverity) filter.triageSeverity = triageSeverity;

  const total = await MedicalAssessment.countDocuments(filter);
  const assessments = await MedicalAssessment.find(filter)
    .populate(POPULATE_PATIENT)
    .populate(POPULATE_ASSESSED_BY)
    .populate(POPULATE_APPOINTMENT)
    .sort(sort || "-createdAt")
    .skip((page - 1) * limit)
    .limit(limit);

  return res.status(200).json(
    new ApiResponse(200, {
      assessments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  );
});

// ---------------------------------------------------------------------------
// GET /api/assessments/:id
// ---------------------------------------------------------------------------
export const getAssessmentById = asyncHandler(async (req: Request, res: Response) => {
  const assessment = await MedicalAssessment.findById(req.params.id)
    .populate(POPULATE_PATIENT)
    .populate(POPULATE_ASSESSED_BY)
    .populate(POPULATE_OVERRIDDEN_BY)
    .populate(POPULATE_APPOINTMENT);

  if (!assessment) throw ApiError.notFound("Assessment not found");

  return res.status(200).json(new ApiResponse(200, assessment));
});
