import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { MembershipController } from "./controller.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
    }
  },
});

const handleMulterError = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ success: false, error: "Photo must be less than 5MB" });
      return;
    }
    res.status(400).json({ success: false, error: err.message });
    return;
  }
  if (err.message === "Only JPEG, PNG, WEBP, or GIF images are allowed") {
    res.status(400).json({ success: false, error: err.message });
    return;
  }
  next(err);
};

// ── Untouched ────────────────────────────────────────────────
router.post("/memberships", upload.single("photo"), handleMulterError, MembershipController.submitMembership);
router.get("/network", MembershipController.getNetworkMembers);
router.get("/admin/memberships", MembershipController.getAllMemberships);
router.get("/admin/memberships/:id", MembershipController.getMembership);

// ── Dashboard: PATCH /admin/memberships/:id/status ───────────
router.patch(
  "/admin/memberships/:id/status",
  isInternalRequest,
  authMiddleware,
  requirePermission("membership", "update"),
  pendingInterceptor({
    module:    "membership",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "membership",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  MembershipController.updateMembershipStatus
);

// ── Dashboard: POST /admin/memberships/:id/network ───────────
router.post(
  "/admin/memberships/:id/network",
  isInternalRequest,
  authMiddleware,
  requirePermission("membership", "create"),
  pendingInterceptor({
    module:    "membership",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "membership",
    action: "create",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  MembershipController.addToNetwork
);

// ── Dashboard: PATCH /admin/network/:id ──────────────────────
router.patch(
  "/admin/network/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("membership", "update"),
  pendingInterceptor({
    module:    "membership",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "membership",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  MembershipController.updateNetworkMember
);

// ── Dashboard: DELETE /admin/network/:id ─────────────────────
router.delete(
  "/admin/network/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("membership", "delete"),
  pendingInterceptor({
    module:    "membership",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "membership",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  MembershipController.deleteNetworkMember
);

export default router;