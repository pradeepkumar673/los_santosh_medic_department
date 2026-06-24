import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { clinicalStaffOnly, adminOnly } from "../middlewares/role";

const router = Router();

// Any authenticated clinical staff (doctor, nurse, admin)
router.get("/queue/live", authenticate, clinicalStaffOnly, (req, res) => {
  res.json({ success: true, message: "Live queue placeholder" });
});

// Admin-only example
router.delete("/:id", authenticate, adminOnly, (req, res) => {
  res.json({ success: true, message: "Doctor deleted (placeholder)" });
});

// Equivalent using authorize() directly instead of the named helper
router.patch("/:id/status", authenticate, authorize("doctor", "admin"), (req, res) => {
  res.json({ success: true, message: "Status updated (placeholder)" });
});

export default router;
