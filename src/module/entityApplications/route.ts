// import { Router } from "express";
// import CraftEntityController from "./controller.ts";
// import { uploadGovernmentDocuments } from "./multer.ts";

// const router = Router();

// // Standard JSON routes (ARTISAN, BUSINESS, INSTITUTION_NGO)
// router.post("/", CraftEntityController.create);
// router.get("/", CraftEntityController.getAll);
// router.get("/:id", CraftEntityController.getById);
// router.get("/:id/admin", CraftEntityController.getByIdWithEvaluation);
// router.put("/:id/status", CraftEntityController.updateStatus);
// router.delete("/:id", CraftEntityController.delete);

// // Government entity — multipart/form-data with optional document uploads
// router.post(
//   "/government",
//   uploadGovernmentDocuments,
//   CraftEntityController.createGovernment
// );

// export default router;

import { Router } from "express";
import CraftEntityController from "./controller.ts";
import { uploadGovernmentDocuments } from "./multer.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.post("/", CraftEntityController.create);
router.get("/", CraftEntityController.getAll);
router.get("/:id", CraftEntityController.getById);
router.get("/:id/admin", CraftEntityController.getByIdWithEvaluation);
router.post(
  "/government",
  uploadGovernmentDocuments,
  CraftEntityController.createGovernment
);

// ── Dashboard: PUT /:id/status ───────────────────────────────
router.put(
  "/:id/status",
  isInternalRequest,
  authMiddleware,
  requirePermission("cktre", "update"),
  pendingInterceptor({
    module:    "cktre",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cktre",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  CraftEntityController.updateStatus
);

// ── Dashboard: DELETE /:id ───────────────────────────────────
router.delete(
  "/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("cktre", "delete"),
  pendingInterceptor({
    module:    "cktre",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cktre",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  CraftEntityController.delete
);

export default router;