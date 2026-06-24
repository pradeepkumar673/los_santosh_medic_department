import { z } from "zod";
import { objectId } from "./common";

// ── Reusable sub-schemas ──────────────────────────────────────────────────────

const vitalsSchema = z.object({
  temperature:            z.number().min(30).max(45).optional(),
  bloodPressureSystolic:  z.number().min(50).max(300).optional(),
  bloodPressureDiastolic: z.number().min(30).max(200).optional(),
  heartRate:              z.number().min(20).max(300).optional(),
  respiratoryRate:        z.number().min(5).max(80).optional(),
  oxygenSaturation:       z.number().min(0).max(100).optional(),
  bloodSugar:             z.number().min(0).max(1000).optional(),
}).optional();

const prescriptionSchema = z.object({
  medicineName: z.string().trim().min(1).max(100),
  dosage:       z.string().trim().min(1).max(100),
  frequency:    z.string().trim().min(1).max(100),
  durationDays: z.number().int().min(1).max(365),
});

// ── Submit Assessment (pre-booking) ──────────────────────────────────────────

export const submitAssessmentSchema = z.object({
  body: z.object({
    patientId:      objectId,
    chiefComplaint: z.string().trim().min(3).max(500),
    symptoms:       z.array(z.string().trim().min(1).max(100)).min(1, "At least one symptom is required"),
    vitals:         vitalsSchema,
    notes:          z.string().trim().max(1000).optional(),
    attachments:    z.array(z.string().url("Attachment must be a valid URL")).optional().default([]),
    patientAge:     z.number().int().min(0).max(130).optional(), // for age-based scoring
  }),
  params: z.object({}).optional(),
  query:  z.object({}).optional(),
});

// ── Link Assessment to Appointment (called after booking) ───────────────────

export const linkAssessmentSchema = z.object({
  body: z.object({
    appointmentId: objectId,
  }),
  params: z.object({ id: objectId }), // assessment id
  query:  z.object({}).optional(),
});

// ── Override triage level (nurse / doctor manual override) ──────────────────

export const overrideTriageSchema = z.object({
  body: z.object({
    triageSeverity: z.enum(["critical", "urgent", "moderate", "low"]),
    overrideReason: z.string().trim().min(5).max(300),
  }),
  params: z.object({ id: objectId }),
  query:  z.object({}).optional(),
});

// ── Update clinical details (post-consultation) ──────────────────────────────

export const updateAssessmentSchema = z.object({
  body: z.object({
    diagnosis:        z.string().trim().max(1000).optional(),
    prescriptions:    z.array(prescriptionSchema).optional(),
    labTestsOrdered:  z.array(z.string().trim()).optional(),
    followUpRequired: z.boolean().optional(),
    followUpDate:     z.coerce.date().optional(),
    notes:            z.string().trim().max(1000).optional(),
    assessmentStatus: z
      .enum(["pending_booking", "booked", "in_progress", "completed"])
      .optional(),
  }),
  params: z.object({ id: objectId }),
  query:  z.object({}).optional(),
});

// ── List/filter ───────────────────────────────────────────────────────────────

export const listAssessmentsSchema = z.object({
  body:   z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page:             z.coerce.number().int().min(1).optional().default(1),
    limit:            z.coerce.number().int().min(1).max(100).optional().default(20),
    patientId:        objectId.optional(),
    assessmentStatus: z
      .enum(["pending_booking", "booked", "in_progress", "completed"])
      .optional(),
    triageSeverity:   z.enum(["critical", "urgent", "moderate", "low"]).optional(),
    sort:             z.string().optional(),
  }),
});

export const getAssessmentByIdSchema = z.object({
  body:   z.object({}).optional(),
  params: z.object({ id: objectId }),
  query:  z.object({}).optional(),
});

// ── Dry-run: score only (no DB write) ────────────────────────────────────────

export const scoreOnlySchema = z.object({
  body: z.object({
    chiefComplaint: z.string().trim().min(3).max(500),
    symptoms:       z.array(z.string().trim().min(1)).min(1),
    vitals:         vitalsSchema,
    patientAge:     z.number().int().min(0).max(130).optional(),
  }),
  params: z.object({}).optional(),
  query:  z.object({}).optional(),
});
