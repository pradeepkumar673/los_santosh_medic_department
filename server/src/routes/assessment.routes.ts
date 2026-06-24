import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  submitAssessment,
  scoreOnly,
  linkAppointment,
  overrideTriage,
  updateAssessment,
  getAssessments,
  getAssessmentById,
} from "../controllers/assessment.controller";
import {
  submitAssessmentSchema,
  linkAssessmentSchema,
  overrideTriageSchema,
  updateAssessmentSchema,
  listAssessmentsSchema,
  getAssessmentByIdSchema,
  scoreOnlySchema,
} from "../validators/assessment.validator";

const router = Router();
router.use(authenticate);

// ── Dry-run triage preview (no DB write) ─────────────────────────────────────
/**
 * POST /api/assessments/score-only
 * Scores vitals + symptoms instantly. Used for live preview while
 * the nurse fills the form. No record is created.
 */
router.post(
  "/score-only",
  authorize("admin", "reception", "nurse", "doctor"),
  validate(scoreOnlySchema),
  scoreOnly
);

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/assessments
 * Submit a full pre-booking assessment. Runs triage engine automatically.
 * Returns severity + suggestedAppointmentType for the booking UI.
 */
router.post(
  "/",
  authorize("admin", "reception", "nurse", "doctor"),
  validate(submitAssessmentSchema),
  submitAssessment
);

/**
 * GET /api/assessments
 * List with filters: patientId, assessmentStatus, triageSeverity.
 */
router.get(
  "/",
  authorize("admin", "reception", "nurse", "doctor"),
  validate(listAssessmentsSchema),
  getAssessments
);

/**
 * GET /api/assessments/:id
 */
router.get(
  "/:id",
  authorize("admin", "reception", "nurse", "doctor", "patient"),
  validate(getAssessmentByIdSchema),
  getAssessmentById
);

/**
 * PATCH /api/assessments/:id
 * Post-consultation: add diagnosis, prescriptions, lab tests, follow-up.
 */
router.patch(
  "/:id",
  authorize("admin", "nurse", "doctor"),
  validate(updateAssessmentSchema),
  updateAssessment
);

// ── Workflow actions ──────────────────────────────────────────────────────────

/**
 * PATCH /api/assessments/:id/link-appointment
 * Step 2: after booking, wire the assessment to its appointment.
 * Also back-propagates emergency type if triage says critical.
 */
router.patch(
  "/:id/link-appointment",
  authorize("admin", "reception", "nurse", "doctor"),
  validate(linkAssessmentSchema),
  linkAppointment
);

/**
 * PATCH /api/assessments/:id/triage-override
 * Clinician manual override with mandatory reason. Original score preserved.
 */
router.patch(
  "/:id/triage-override",
  authorize("admin", "nurse", "doctor"),
  validate(overrideTriageSchema),
  overrideTriage
);

export default router;
