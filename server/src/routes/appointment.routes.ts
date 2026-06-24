import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  bookAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
} from "../controllers/appointment.controller";
import {
  bookAppointmentSchema,
  listAppointmentsSchema,
  getAppointmentByIdSchema,
  updateAppointmentStatusSchema,
} from "../validators/appointment.validator";

const router = Router();

router.use(authenticate);

/**
 * POST /api/appointments
 * Book a new appointment. Reception & admin can book for any patient.
 * Patients can self-book (enforced at controller level if needed).
 */
router.post(
  "/",
  authorize("admin", "reception", "patient"),
  validate(bookAppointmentSchema),
  bookAppointment
);

/**
 * GET /api/appointments
 * List appointments with optional filters (patient, doctor, date, status).
 */
router.get(
  "/",
  authorize("admin", "reception", "doctor", "nurse"),
  validate(listAppointmentsSchema),
  getAppointments
);

/**
 * GET /api/appointments/:id
 */
router.get(
  "/:id",
  authorize("admin", "reception", "doctor", "nurse", "patient"),
  validate(getAppointmentByIdSchema),
  getAppointmentById
);

/**
 * PATCH /api/appointments/:id/status
 * Update appointment status (confirm, check-in, complete, cancel, no-show).
 */
router.patch(
  "/:id/status",
  authorize("admin", "reception", "doctor", "nurse"),
  validate(updateAppointmentStatusSchema),
  updateAppointmentStatus
);

export default router;
