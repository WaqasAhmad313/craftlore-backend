// import { Router, type Request, type Response, type NextFunction } from "express";
// import multer from "multer";
// import { CareersController } from "./controller.ts";

// const router = Router();

// // Configure multer for file uploads (memory storage)
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   },
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = [
//       "application/pdf",
//       "application/msword",
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//     ];
//     if (allowedTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
//     }
//   },
// });

// // Multer error handling middleware
// const handleMulterError = (err: Error, req: Request, res: Response, next: NextFunction): void => {
//   if (err instanceof multer.MulterError) {
//     if (err.code === "LIMIT_FILE_SIZE") {
//       res.status(400).json({
//         success: false,
//         error: "Resume file must be less than 5MB"
//       });
//       return;
//     }
//     res.status(400).json({
//       success: false,
//       error: err.message
//     });
//     return;
//   }
  
//   if (err.message === "Only PDF, DOC, and DOCX files are allowed") {
//     res.status(400).json({
//       success: false,
//       error: "Resume must be PDF, DOC, or DOCX format"
//     });
//     return;
//   }
  
//   next(err);
// };

// /* ===== JOBS ===== */

// // Get all jobs (with optional status filter)
// router.get("/jobs", CareersController.getAllJobs);

// // Get open jobs only
// router.get("/jobs/open", CareersController.getOpenJobs);

// // Get closed jobs only
// router.get("/jobs/closed", CareersController.getClosedJobs);

// // Create a new job
// router.post("/jobs", CareersController.createJob);

// // Get a specific job by ID
// router.get("/jobs/:jobId", CareersController.getJob);

// // Update a job (can change status to closed/archived here)
// router.patch("/jobs/:jobId", CareersController.updateJob);

// // Delete a job
// router.delete("/jobs/:jobId", CareersController.deleteJob);

// /* ===== APPLICATIONS ===== */

// // Submit an application for a specific job
// router.post(
//   "/jobs/:jobId/applications",
//   upload.single("resume"),
//   handleMulterError,
//   CareersController.submitApplication
// );

// // Get all applications for a specific job (admin)
// router.get("/jobs/:jobId/applications", CareersController.getApplicationsByJob);

// // Get a specific application by ID (admin)
// router.get("/applications/:applicationId", CareersController.getApplication);

// /* ===== TALENT POOL ===== */

// // Join the talent pool
// router.post(
//   "/talent-pool",
//   upload.single("resume"),
//   handleMulterError,
//   CareersController.joinTalentPool
// );

// // Get all talent pool entries (admin, with optional area filter)
// router.get("/talent-pool", CareersController.getAllTalentPoolEntries);

// // Get a specific talent pool entry by ID (admin)
// router.get("/talent-pool/:id", CareersController.getTalentPoolEntry);

// export default router;

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
      payload: { old: null, new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "careers",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { old: null, new: req.body as Record<string, unknown> },
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
    }),
  }),
  logActivity({
    module: "careers",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["jobId"] ?? null,
      diff: {
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
    }),
  }),
  CareersController.deleteJob
);

export default router;