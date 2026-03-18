// import { Router, type Request, type Response, type NextFunction } from "express";
// import multer from "multer";
// import { MembershipController } from "./controller.ts";

// const router = Router();

// /* ===== MULTER — photo upload ===== */

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   },
//   fileFilter: (_req, file, cb) => {
//     const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
//     if (allowed.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
//     }
//   },
// });

// const handleMulterError = (
//   err: Error,
//   _req: Request,
//   res: Response,
//   next: NextFunction
// ): void => {
//   if (err instanceof multer.MulterError) {
//     if (err.code === "LIMIT_FILE_SIZE") {
//       res.status(400).json({ success: false, error: "Photo must be less than 5MB" });
//       return;
//     }
//     res.status(400).json({ success: false, error: err.message });
//     return;
//   }
//   if (
//     err.message === "Only JPEG, PNG, WEBP, or GIF images are allowed"
//   ) {
//     res.status(400).json({ success: false, error: err.message });
//     return;
//   }
//   next(err);
// };

// /* ===== PUBLIC ROUTES ===== */

// // Submit a membership application (with optional photo)
// router.post(
//   "/memberships",
//   upload.single("photo"),
//   handleMulterError,
//   MembershipController.submitMembership
// );

// // Public network directory (optionally filter by ?category=local|international&type=buyer|corporate|sponsor)
// router.get("/network", MembershipController.getNetworkMembers);

// /* ===== ADMIN ROUTES ===== */

// // List all membership applications (?status=pending|approved|rejected&type=buyer|corporate|sponsor)
// router.get("/admin/memberships", MembershipController.getAllMemberships);

// // Get a single membership application
// router.get("/admin/memberships/:id", MembershipController.getMembership);

// // Approve or reject a membership application
// router.patch(
//   "/admin/memberships/:id/status",
//   MembershipController.updateMembershipStatus
// );

// // Add an approved membership to the network (body: { network_category: "local"|"international" })
// router.post(
//   "/admin/memberships/:id/network",
//   MembershipController.addToNetwork
// );

// // Edit a network member card
// router.patch(
//   "/admin/network/:id",
//   MembershipController.updateNetworkMember
// );

// // Remove a member from the network
// router.delete(
//   "/admin/network/:id",
//   MembershipController.deleteNetworkMember
// );

// export default router;


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