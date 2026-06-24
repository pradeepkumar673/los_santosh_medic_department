import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler }    from "../utils/asyncHandler";
import { ApiError }        from "../utils/ApiError";
import { ApiResponse }     from "../utils/ApiResponse";
import MedicalAssessment   from "../models/MedicalAssessment.model";
import Appointment         from "../models/Appointment.model";
import Patient             from "../models/Patient.model";
import { runTriageEngine, buildOverrideResult } from "../services/triage.service";
import type { TriageInput } from "../services/triage.service";
import type { TriageSeverity } from "../models/MedicalAssessment.model";

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

async function populatedAssessment(id: string | mongoose.Types.ObjectId) {
  return MedicalAssessment.findById(id)
    .populate("patient", "user dateOfBirth gender bloodGroup")
    .populate("assessedBy", "name role")
    .populate("triageOverriddenBy", "name role")
    .populate({
      path: "appointment",
      populate: [
        { path: "doctor",     select: "user specialization" },
        { path: "department", select: "name code" },
      ],
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assessments
//
// Step 1 of the booking flow. Nurse / reception captures vitals + symptoms
// BEFORE booking an appointment. The engine scores automatically.
// Returns the assessment + triage result so the UI can immediately show
// the suggested appointment type and queue priority to guide slot selection.
// ─────────────────────────────────────────────────────────────────────────────

export const submitAssessment = asyncHandler(async (req: Request, res: Response) => {
  const {
    patientId,
    chiefComplaint,
    symptoms,
    vitals,
    notes,
    attachments,
    patientAge,
  } = req.body;

  // Guard: patient must exist
  const patient = await Patient.findById(patientId).lean();
  if (!patient) throw ApiError.notFound("Patient not found");

  // Run triage engine
  const triageInput: TriageInput = {
    chiefComplaint,
    symptoms,
    vitals,
    age: patientAge,
  };

  const triageResult = runTriageEngine(triageInput);

  // Persist
  const assessment = await MedicalAssessment.create({
    patient:         patientId,
    assessedBy:      req.user!.id,
    chiefComplaint,
    symptoms,
    vitals:          vitals ?? {},
    triageSeverity:  triageResult.severity,
    triageScore:     triageResult.score,
    triageBreakdown: triageResult.breakdown,
    notes,
    attachments:     attachments ?? [],
    assessmentStatus: "pending_booking",
  });

  const populated = await populatedAssessment(assessment._id as mongoose.Types.ObjectId);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        assessment: populated,
        triage: {
          severity:              triageResult.severity,
          score:                 triageResult.score,
          breakdown:             triageResult.breakdown,
          suggestedAppointmentType: triageResult.suggestedAppointmentType,
          suggestedPriority:     triageResult.suggestedPriority,
        },
      },
      `Assessment submitted — triage level: ${triageResult.severity.toUpperCase()}`
    )
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assessments/score-only
//
// Dry-run: score a set of vitals + symptoms without creating any DB record.
// Useful for live "triage preview" as the receptionist fills the form.
// ─────────────────────────────────────────────────────────────────────────────

export const scoreOnly = asyncHandler(async (req: Request, res: Response) => {
  const { chiefComplaint, symptoms, vitals, patientAge } = req.body;

  const result = runTriageEngine({ chiefComplaint, symptoms, vitals, age: patientAge });

  return res.status(200).json(
    new ApiResponse(200, result, "Triage score computed (dry-run — nothing saved)")
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/assessments/:id/link-appointment
//
// Step 2: after the appointment is booked, link the assessment to it and
// update both documents so the doctor's view shows the pre-assessment.
// Also back-propagates the triage priority onto the QueueEntry if it exists.
// ─────────────────────────────────────────────────────────────────────────────

export const linkAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { appointmentId } = req.body;

  const [assessment, appointment] = await Promise.all([
    MedicalAssessment.findById(req.params.id),
    Appointment.findById(appointmentId),
  ]);

  if (!assessment)  throw ApiError.notFound("Assessment not found");
  if (!appointment) throw ApiError.notFound("Appointment not found");

  // Guard: don't overwrite an existing link (use a different assessment)
  if (assessment.appointment) {
    const same = String(assessment.appointment) === String(appointmentId);
    if (!same)
      throw ApiError.conflict(
        "Assessment is already linked to a different appointment."
      );
    // idempotent — already linked to the same appointment
    const populated = await populatedAssessment(assessment._id as mongoose.Types.ObjectId);
    return res.status(200).json(
      new ApiResponse(200, populated, "Assessment already linked to this appointment")
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Link assessment → appointment
    assessment.appointment      = appointment._id as mongoose.Types.ObjectId;
    assessment.assessmentStatus = "booked";
    await assessment.save({ session });

    // 2. Back-propagate triage onto appointment type if it's more severe
    const severityToType: Record<string, "emergency" | "walk_in" | "scheduled"> = {
      critical: "emergency",
      urgent:   "walk_in",
      moderate: "walk_in",
      low:      "scheduled",
    };
    const suggestedType = severityToType[assessment.triageSeverity];
    if (
      suggestedType === "emergency" &&
      appointment.appointmentType !== "emergency"
    ) {
      appointment.appointmentType = "emergency";
    }
    await appointment.save({ session });

    await session.commitTransaction();

    const populated = await populatedAssessment(assessment._id as mongoose.Types.ObjectId);
    return res.status(200).json(
      new ApiResponse(200, populated, "Assessment linked to appointment successfully")
    );
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/assessments/:id/triage-override
//
// Nurse or doctor can override the computed triage level with a mandatory
// reason. The original computed score + breakdown are preserved for audit.
// ─────────────────────────────────────────────────────────────────────────────

export const overrideTriage = asyncHandler(async (req: Request, res: Response) => {
  const { triageSeverity, overrideReason } = req.body as {
    triageSeverity: TriageSeverity;
    overrideReason: string;
  };

  const assessment = await MedicalAssessment.findById(req.params.id);
  if (!assessment) throw ApiError.notFound("Assessment not found");

  const prevSeverity = assessment.triageSeverity;
  assessment.triageSeverity        = triageSeverity;
  assessment.triageOverriddenBy    = new mongoose.Types.ObjectId(req.user!.id);
  assessment.triageOverrideReason  = overrideReason;
  await assessment.save();

  const populated = await populatedAssessment(assessment._id as mongoose.Types.ObjectId);
  const suggestions = buildOverrideResult(triageSeverity, assessment.triageScore);

  return res.status(200).json(
    new ApiResponse(
      200,
      { assessment: populated, suggestions },
      `Triage overridden: ${prevSeverity} → ${triageSeverity}`
    )
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/assessments/:id
//
// Post-consultation update: diagnosis, prescriptions, lab tests, follow-up.
// ─────────────────────────────────────────────────────────────────────────────

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

  if (diagnosis        !== undefined) assessment.diagnosis        = diagnosis;
  if (prescriptions    !== undefined) assessment.prescriptions    = prescriptions;
  if (labTestsOrdered  !== undefined) assessment.labTestsOrdered  = labTestsOrdered;
  if (followUpRequired !== undefined) assessment.followUpRequired = followUpRequired;
  if (followUpDate     !== undefined) assessment.followUpDate     = followUpDate;
  if (notes            !== undefined) assessment.notes            = notes;
  if (assessmentStatus !== undefined) assessment.assessmentStatus = assessmentStatus;

  await assessment.save();

  const populated = await populatedAssessment(assessment._id as mongoose.Types.ObjectId);
  return res.status(200).json(new ApiResponse(200, populated, "Assessment updated"));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assessments
// ─────────────────────────────────────────────────────────────────────────────

export const getAssessments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, patientId, assessmentStatus, triageSeverity, sort } = req.query as any;

  const filter: Record<string, any> = {};
  if (patientId)        filter.patient          = patientId;
  if (assessmentStatus) filter.assessmentStatus = assessmentStatus;
  if (triageSeverity)   filter.triageSeverity   = triageSeverity;

  const total = await MedicalAssessment.countDocuments(filter);
  const assessments = await MedicalAssessment.find(filter)
    .populate("patient", "user dateOfBirth gender")
    .populate("assessedBy", "name role")
    .populate("triageOverriddenBy", "name role")
    .populate("appointment", "scheduledDate appointmentType status")
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assessments/:id
// ─────────────────────────────────────────────────────────────────────────────

export const getAssessmentById = asyncHandler(async (req: Request, res: Response) => {
  const assessment = await populatedAssessment(req.params.id);
  if (!assessment) throw ApiError.notFound("Assessment not found");

  return res.status(200).json(new ApiResponse(200, assessment));
});
