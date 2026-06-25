import apiClient from "./api.client";
import type { AxiosResponse } from "axios";

// ---------------------------------------------------------------------------
// Shared enums & value types (mirror server-side model)
// ---------------------------------------------------------------------------

export type TriageSeverity = "critical" | "urgent" | "semi_urgent" | "non_urgent" | "minor";
export type AssessmentStatus =
  | "pending_booking"
  | "booked"
  | "in_consultation"
  | "completed"
  | "cancelled";
export type AppointmentType = "scheduled" | "follow_up" | "walk_in" | "emergency";
export type QueuePriority = "emergency" | "high" | "normal" | "low";

// ---------------------------------------------------------------------------
// Vitals shape (used in submit + update)
// ---------------------------------------------------------------------------

export interface Vitals {
  bloodPressure?: string;   // e.g. "120/80"
  heartRate?: number;       // bpm
  temperature?: number;     // °C
  oxygenSaturation?: number; // %
  respiratoryRate?: number; // breaths/min
  weight?: number;          // kg
  height?: number;          // cm
}

// ---------------------------------------------------------------------------
// Triage result (returned inline by submitAssessment and scoreOnly)
// ---------------------------------------------------------------------------

export interface TriageResult {
  severity: TriageSeverity;
  score: number;
  breakdown: Record<string, number>;
  suggestedAppointmentType: AppointmentType;
  suggestedPriority: QueuePriority;
}

// ---------------------------------------------------------------------------
// Assessment document shape (what the API returns)
// ---------------------------------------------------------------------------

export interface Assessment {
  _id: string;
  patient: {
    _id: string;
    user: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
  };
  assessedBy: { _id: string; name: string; role: string };
  appointment?: string;
  triageSeverity: TriageSeverity;
  triageScore: number;
  triageBreakdown: Record<string, number>;
  triageOverridden?: boolean;
  triageOverriddenBy?: { _id: string; name: string; role: string };
  triageOverrideReason?: string;
  chiefComplaint: string;
  symptoms: string[];
  vitals: Vitals;
  notes?: string;
  attachments: string[];
  assessmentStatus: AssessmentStatus;
  // Post-consultation fields (set via updateAssessment)
  diagnosis?: string;
  prescriptions?: string[];
  labTests?: string[];
  followUpDate?: string;
  followUpNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Paginated list wrapper
// ---------------------------------------------------------------------------

export interface PaginatedAssessments {
  assessments: Assessment[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ---------------------------------------------------------------------------
// Request payload types
// ---------------------------------------------------------------------------

export interface ScoreOnlyPayload {
  chiefComplaint: string;
  symptoms: string[];
  vitals?: Vitals;
  /** Override age when the patient record is not yet looked up */
  patientAge?: number;
}

export interface SubmitAssessmentPayload extends ScoreOnlyPayload {
  patientId: string;
  notes?: string;
  attachments?: string[];
}

export interface LinkAppointmentPayload {
  appointmentId: string;
}

export interface OverrideTriagePayload {
  severity: TriageSeverity;
  reason: string;
}

export interface UpdateAssessmentPayload {
  diagnosis?: string;
  prescriptions?: string[];
  labTests?: string[];
  followUpDate?: string;
  followUpNotes?: string;
  assessmentStatus?: AssessmentStatus;
  vitals?: Partial<Vitals>;
  notes?: string;
}

export interface ListAssessmentsParams {
  patientId?: string;
  assessmentStatus?: AssessmentStatus;
  triageSeverity?: TriageSeverity;
  page?: number;
  limit?: number;
  sort?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * POST /api/assessments/score-only
 * Dry-run triage preview — no DB write. Used for live score previews while
 * the nurse fills the assessment form.
 */
export async function scoreOnly(payload: ScoreOnlyPayload): Promise<TriageResult> {
  const res: AxiosResponse<{ data: TriageResult }> = await apiClient.post(
    "/assessments/score-only",
    payload
  );
  return res.data.data;
}

/**
 * POST /api/assessments
 * Submit a full pre-booking assessment. Runs the triage engine and persists
 * the record. Returns the saved assessment plus triage suggestions.
 */
export async function submitAssessment(payload: SubmitAssessmentPayload): Promise<{
  assessment: Assessment;
  suggestedAppointmentType: AppointmentType;
  suggestedPriority: QueuePriority;
}> {
  const res: AxiosResponse<{
    data: {
      assessment: Assessment;
      suggestedAppointmentType: AppointmentType;
      suggestedPriority: QueuePriority;
    };
  }> = await apiClient.post("/assessments", payload);
  return res.data.data;
}

/**
 * GET /api/assessments
 * List assessments with optional filters.
 */
export async function getAssessments(
  params?: ListAssessmentsParams
): Promise<PaginatedAssessments> {
  const res: AxiosResponse<{ data: PaginatedAssessments }> = await apiClient.get(
    "/assessments",
    { params }
  );
  return res.data.data;
}

/**
 * GET /api/assessments/:id
 */
export async function getAssessmentById(id: string): Promise<Assessment> {
  const res: AxiosResponse<{ data: Assessment }> = await apiClient.get(
    `/assessments/${id}`
  );
  return res.data.data;
}

/**
 * PATCH /api/assessments/:id
 * Post-consultation update: add diagnosis, prescriptions, lab tests, follow-up.
 */
export async function updateAssessment(
  id: string,
  payload: UpdateAssessmentPayload
): Promise<Assessment> {
  const res: AxiosResponse<{ data: Assessment }> = await apiClient.patch(
    `/assessments/${id}`,
    payload
  );
  return res.data.data;
}

/**
 * PATCH /api/assessments/:id/link-appointment
 * Step 2 of the triage → booking flow: wire the assessment to its appointment.
 * Automatically escalates to emergency if triage is critical.
 */
export async function linkAppointment(
  assessmentId: string,
  payload: LinkAppointmentPayload
): Promise<{
  assessment: Assessment;
  noShowRisk: { no_show_probability: number; risk_level: string } | null;
  escalated: boolean;
}> {
  const res: AxiosResponse<{
    data: {
      assessment: Assessment;
      noShowRisk: { no_show_probability: number; risk_level: string } | null;
      escalated: boolean;
    };
  }> = await apiClient.patch(
    `/assessments/${assessmentId}/link-appointment`,
    payload
  );
  return res.data.data;
}

/**
 * PATCH /api/assessments/:id/triage-override
 * Clinician manual override with mandatory reason.
 * The original AI-generated score is preserved alongside the override.
 */
export async function overrideTriage(
  assessmentId: string,
  payload: OverrideTriagePayload
): Promise<Assessment> {
  const res: AxiosResponse<{ data: Assessment }> = await apiClient.patch(
    `/assessments/${assessmentId}/triage-override`,
    payload
  );
  return res.data.data;
}
