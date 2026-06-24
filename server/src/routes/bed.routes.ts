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
  allocateBed,
  dischargeBed,
  getAllocations,
  getAllocationById,
} from "../controllers/bed.controller";
import {
  createBedSchema,
  updateBedSchema,
  updateBedStatusSchema,
  getBedByIdSchema,
  listBedsSchema,
  allocateBedSchema,
  dischargeBedSchema,
  listAllocationsSchema,
} from "../validators/bed.validator";
import { z } from "zod";
import { objectId } from "../validators/common";

const router = Router();

router.use(authenticate);

router.get(
  "/allocations",
  authorize("admin", "reception", "doctor", "nurse"),
  validate(listAllocationsSchema),
  getAllocations
);

router.get(
  "/allocations/:id",
  authorize("admin", "reception", "doctor", "nurse"),
  validate(
    z.object({
      body: z.object({}).optional(),
      params: z.object({ id: objectId }),
      query: z.object({}).optional(),
    })
  ),
  getAllocationById
);

router
  .route("/")
  .post(authorize("admin"), validate(createBedSchema), createBed)
  .get(
    authorize("admin", "reception", "doctor", "nurse"),
    validate(listBedsSchema),
    getBeds
  );

router
  .route("/:id")
  .get(
    authorize("admin", "reception", "doctor", "nurse"),
    validate(getBedByIdSchema),
    getBedById
  )
  .patch(authorize("admin"), validate(updateBedSchema), updateBed)
  .delete(authorize("admin"), validate(getBedByIdSchema), deleteBed);

router.post(
  "/:id/allocate",
  authorize("admin", "reception"),
  validate(allocateBedSchema),
  allocateBed
);

router.post(
  "/:id/discharge",
  authorize("admin", "reception", "nurse"),
  validate(dischargeBedSchema),
  dischargeBed
);

router.patch(
  "/:id/status",
  authorize("admin", "reception", "nurse"),
  validate(updateBedStatusSchema),
  updateBedStatus
);

export default router;
