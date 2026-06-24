import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  getLiveQueue,
  callNextPatient,
  updateQueueStatus,
  getEstimatedWait,
} from "../controllers/queue.controller";
import { z } from "zod";
import { objectId } from "../validators/common";

const router = Router();

router.use(authenticate);

/**
 * GET /api/queue
 * Live queue for a doctor or department.
 * Query: doctorId?, departmentId?, date?
 */
router.get(
  "/",
  authorize("admin", "reception", "doctor", "nurse", "patient"),
  getLiveQueue
);

/**
 * GET /api/queue/estimated-wait
 * Query: queueEntryId
 */
router.get(
  "/estimated-wait",
  authorize("admin", "reception", "doctor", "nurse", "patient"),
  getEstimatedWait
);

/**
 * POST /api/queue/call-next
 * Calls the next patient in a doctor's queue.
 * Body: { doctorId }
 */
router.post(
  "/call-next",
  authorize("admin", "reception", "doctor"),
  validate(
    z.object({
      body: z.object({ doctorId: objectId }),
      params: z.object({}).optional(),
      query: z.object({}).optional(),
    })
  ),
  callNextPatient
);

/**
 * PATCH /api/queue/:id/status
 * Update status of a specific queue entry.
 * Body: { status: "called" | "in_progress" | "completed" | "skipped" | "cancelled" }
 */
router.patch(
  "/:id/status",
  authorize("admin", "reception", "doctor", "nurse"),
  validate(
    z.object({
      body: z.object({
        status: z.enum(["called", "in_progress", "completed", "skipped", "cancelled"]),
      }),
      params: z.object({ id: objectId }),
      query: z.object({}).optional(),
    })
  ),
  updateQueueStatus
);

export default router;
