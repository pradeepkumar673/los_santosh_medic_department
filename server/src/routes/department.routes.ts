import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  getDepartmentByIdSchema,
  listDepartmentsSchema,
} from "../validators/department.validator";

const router = Router();

router.use(authenticate);

router
  .route("/")
  .post(authorize("admin"), validate(createDepartmentSchema), createDepartment)
  .get(authorize("admin", "reception", "doctor", "nurse", "patient"), validate(listDepartmentsSchema), getDepartments);

router
  .route("/:id")
  .get(authorize("admin", "reception", "doctor", "nurse", "patient"), validate(getDepartmentByIdSchema), getDepartmentById)
  .patch(authorize("admin"), validate(updateDepartmentSchema), updateDepartment)
  .delete(authorize("admin"), validate(getDepartmentByIdSchema), deleteDepartment);

export default router;
