import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctor.controller";
import {
  createDoctorSchema,
  updateDoctorSchema,
  getDoctorByIdSchema,
  listDoctorsSchema,
} from "../validators/doctor.validator";

const router = Router();

router.use(authenticate);

router
  .route("/")
  .post(authorize("admin"), validate(createDoctorSchema), createDoctor)
  .get(authorize("admin", "reception", "doctor", "nurse", "patient"), validate(listDoctorsSchema), getDoctors);

router
  .route("/:id")
  .get(authorize("admin", "reception", "doctor", "nurse", "patient"), validate(getDoctorByIdSchema), getDoctorById)
  .patch(authorize("admin", "doctor"), validate(updateDoctorSchema), updateDoctor)
  .delete(authorize("admin"), validate(getDoctorByIdSchema), deleteDoctor);

export default router;
