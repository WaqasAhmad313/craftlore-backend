import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { CareersController } from "./controller.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
  },
});

const handleMulterError = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ success: false, error: "Resume file must be less than 5MB" });
      return;
    }
    res.status(400).json({ success: false, error: err.message });
    return;
  }
  if (err.message === "Only PDF, DOC, and DOCX files are allowed") {
    res.status(400).json({ success: false, error: "Resume must be PDF, DOC, or DOCX format" });
    return;
  }
  next(err);
};

// ── Untouched ────────────────────────────────────────────────
router.get("/jobs", CareersController.getAllJobs);
router.get("/jobs/open", CareersController.getOpenJobs);
router.get("/jobs/closed", CareersController.getClosedJobs);
router.get("/jobs/:jobId", CareersController.getJob);
router.get("/jobs/:jobId/applications", CareersController.getApplicationsByJob);
router.get("/applications/:applicationId", CareersController.getApplication);
router.get("/talent-pool", CareersController.getAllTalentPoolEntries);
router.get("/talent-pool/:id", CareersController.getTalentPoolEntry);
router.post("/jobs/:jobId/applications", upload.single("resume"), handleMulterError, CareersController.submitApplication);
router.post("/talent-pool", upload.single("resume"), handleMulterError, CareersController.joinTalentPool);

// ── Dashboard: POST /jobs ────────────────────────────────────
router.post(
  "/jobs",
  isInternalRequest,
  authMiddleware,
  requirePermission("careers", "create"),
  pendingInterceptor({
    module:    "careers",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "careers",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  CareersController.createJob
);

// ── Dashboard: PATCH /jobs/:jobId ────────────────────────────
router.patch(
  "/jobs/:jobId",
  isInternalRequest,
  authMiddleware,
  requirePermission("careers", "update"),
  pendingInterceptor({
    module:    "careers",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["jobId"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "careers",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["jobId"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  CareersController.updateJob
);

// ── Dashboard: DELETE /jobs/:jobId ───────────────────────────
router.delete(
  "/jobs/:jobId",
  isInternalRequest,
  authMiddleware,
  requirePermission("careers", "delete"),
  pendingInterceptor({
    module:    "careers",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["jobId"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "careers",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["jobId"] ?? null,
    }),
  }),
  CareersController.deleteJob
);

export default router;