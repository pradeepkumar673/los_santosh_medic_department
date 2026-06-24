import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} from "../controllers/patient.controller";
import {
  createPatientSchema,
  updatePatientSchema,
  getPatientByIdSchema,
  listPatientsSchema,
} from "../validators/patient.validator";

const router = Router();

router.use(authenticate);

router
  .route("/")
  .post(authorize("admin", "reception"), validate(createPatientSchema), createPatient)
  .get(authorize("admin", "reception", "doctor", "nurse"), validate(listPatientsSchema), getPatients);

router
  .route("/:id")
  .get(authorize("admin", "reception", "doctor", "nurse", "patient"), validate(getPatientByIdSchema), getPatientById)
  .patch(authorize("admin", "reception", "patient"), validate(updatePatientSchema), updatePatient)
  .delete(authorize("admin"), validate(getPatientByIdSchema), deletePatient);

export default router;
