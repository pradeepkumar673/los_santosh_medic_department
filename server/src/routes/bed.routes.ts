import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createBed,
  getBeds,
  getBedById,
  updateBed,
  updateBedStatus,
  deleteBed,
} from "../controllers/bed.controller";
import {
  createBedSchema,
  updateBedSchema,
  updateBedStatusSchema,
  getBedByIdSchema,
  listBedsSchema,
} from "../validators/bed.validator";

const router = Router();

router.use(authenticate);

router
  .route("/")
  .post(authorize("admin"), validate(createBedSchema), createBed)
  .get(authorize("admin", "reception", "doctor", "nurse"), validate(listBedsSchema), getBeds);

router
  .route("/:id")
  .get(authorize("admin", "reception", "doctor", "nurse"), validate(getBedByIdSchema), getBedById)
  .patch(authorize("admin"), validate(updateBedSchema), updateBed)
  .delete(authorize("admin"), validate(getBedByIdSchema), deleteBed);

// Dedicated endpoint for status transitions (assign patient / discharge / send to cleaning / maintenance)
router.patch(
  "/:id/status",
  authorize("admin", "reception", "nurse"),
  validate(updateBedStatusSchema),
  updateBedStatus
);

export default router;
