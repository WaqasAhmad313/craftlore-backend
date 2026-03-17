// import express, { Router } from 'express';
// import GICraftController from "./controller.ts";

// const router: Router = express.Router();

// router.get("/details", GICraftController.getAllCraftDetails);
// router.get('/', GICraftController.getAllCrafts);
// router.get('/categories', GICraftController.getAllCategories);
// router.get('/:identifier', GICraftController.getCraftByIdentifier);
// router.post("/upsert", GICraftController.upsertCraft);
// router.delete('/:id', GICraftController.deleteCraftById);

// export default router;

import express, { Router } from "express";
import GICraftController from "./controller.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router: Router = express.Router();

// ── Untouched ────────────────────────────────────────────────
router.get("/details", GICraftController.getAllCraftDetails);
router.get("/", GICraftController.getAllCrafts);
router.get("/categories", GICraftController.getAllCategories);
router.get("/:identifier", GICraftController.getCraftByIdentifier);

// ── Dashboard: POST /upsert ──────────────────────────────────
router.post(
  "/upsert",
  isInternalRequest,
  authMiddleware,
  requirePermission("cgis", "create"),
  pendingInterceptor({
    module:    "cgis",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: {
        old: null,
        new: req.body as Record<string, unknown>,
      },
    }),
  }),
  logActivity({
    module: "cgis",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { old: null, new: req.body as Record<string, unknown> },
    }),
  }),
  GICraftController.upsertCraft
);

// ── Dashboard: DELETE /:id ───────────────────────────────────
router.delete(
  "/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("cgis", "delete"),
  pendingInterceptor({
    module:    "cgis",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cgis",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
    }),
  }),
  GICraftController.deleteCraftById
);

export default router;