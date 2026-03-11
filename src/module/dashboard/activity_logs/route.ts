import { Router } from "express";
import { ActivityLogsController } from "./controller.ts";
import { authMiddleware } from "../../../middleware/authMiddleware.ts";
import { requireApprover } from "../../../middleware/permissionMiddleware.ts";

const router = Router();

// Both routes require active session + at minimum can_approve = true
// Owner sees all modules, approver sees their scoped modules
// Actual scope enforcement happens inside service layer

// ── GET /dashboard/logs ─────────────────────────────────────
// Supports query filters:
//   ?module=cktre
//   ?action=update
//   ?user_id=5
//   ?entity_id=123
//   ?date_from=2025-01-01
//   ?date_to=2025-12-31
//   ?page=1
//   ?page_size=50
router.get(
  "/",
  authMiddleware,
  requireApprover("*"),
  ActivityLogsController.listLogs
);

// ── GET /dashboard/logs/entity/:entityId ────────────────────
// Full history for one specific entity
// Optional: ?module=cktre to scope to one module
router.get(
  "/entity/:entityId",
  authMiddleware,
  requireApprover("*"),
  ActivityLogsController.getEntityHistory
);

export default router;