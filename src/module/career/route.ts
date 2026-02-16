import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { CareersController } from "./controller.ts";

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
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

// Multer error handling middleware
const handleMulterError = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        error: "Resume file must be less than 5MB"
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: err.message
    });
    return;
  }
  
  if (err.message === "Only PDF, DOC, and DOCX files are allowed") {
    res.status(400).json({
      success: false,
      error: "Resume must be PDF, DOC, or DOCX format"
    });
    return;
  }
  
  next(err);
};

/* ===== JOBS ===== */

// Get all jobs (with optional status filter)
router.get("/jobs", CareersController.getAllJobs);

// Get open jobs only
router.get("/jobs/open", CareersController.getOpenJobs);

// Get closed jobs only
router.get("/jobs/closed", CareersController.getClosedJobs);

// Create a new job
router.post("/jobs", CareersController.createJob);

// Get a specific job by ID
router.get("/jobs/:jobId", CareersController.getJob);

// Update a job (can change status to closed/archived here)
router.patch("/jobs/:jobId", CareersController.updateJob);

// Delete a job
router.delete("/jobs/:jobId", CareersController.deleteJob);

/* ===== APPLICATIONS ===== */

// Submit an application for a specific job
router.post(
  "/jobs/:jobId/applications",
  upload.single("resume"),
  handleMulterError,
  CareersController.submitApplication
);

// Get all applications for a specific job (admin)
router.get("/jobs/:jobId/applications", CareersController.getApplicationsByJob);

// Get a specific application by ID (admin)
router.get("/applications/:applicationId", CareersController.getApplication);

/* ===== TALENT POOL ===== */

// Join the talent pool
router.post(
  "/talent-pool",
  upload.single("resume"),
  handleMulterError,
  CareersController.joinTalentPool
);

// Get all talent pool entries (admin, with optional area filter)
router.get("/talent-pool", CareersController.getAllTalentPoolEntries);

// Get a specific talent pool entry by ID (admin)
router.get("/talent-pool/:id", CareersController.getTalentPoolEntry);

export default router;