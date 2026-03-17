// import { Router } from "express";
// import multer from "multer";
// import { CounterfeitReportController } from "./controller.ts";

// const router = Router();

// const storage = multer.memoryStorage();
// const upload = multer({ storage });
// const fileFields = [
//   { name: "receipt", maxCount: 1 },
//   { name: "gi_QRcode_closeups", maxCount: 1 },
//   { name: "product_photos", maxCount: 10 },
//   { name: "packaging_photos", maxCount: 10 },
//   { name: "certificates", maxCount: 10 },
//   { name: "listing_screenshots", maxCount: 10 },
//   { name: "gi_tag_photos", maxCount: 10 },
//   { name: "gi_code_closeups", maxCount: 10 },
// ];

// router.post(
//   "/counterfeit-report",
//   upload.fields(fileFields),
//   CounterfeitReportController.createOrUpdate
// );
// router.get("/counterfeit-report", CounterfeitReportController.getOne);
// router.get("/counterfeit-reports", CounterfeitReportController.getAll);
// router.patch("/counterfeit-report/status", CounterfeitReportController.updateStatus);

// export default router;


import { Router } from "express";
import multer from "multer";
import { CounterfeitReportController } from "./controller.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });
const fileFields = [
  { name: "receipt",              maxCount: 1  },
  { name: "gi_QRcode_closeups",   maxCount: 1  },
  { name: "product_photos",       maxCount: 10 },
  { name: "packaging_photos",     maxCount: 10 },
  { name: "certificates",         maxCount: 10 },
  { name: "listing_screenshots",  maxCount: 10 },
  { name: "gi_tag_photos",        maxCount: 10 },
  { name: "gi_code_closeups",     maxCount: 10 },
];

// ── Untouched ────────────────────────────────────────────────
router.post(
  "/counterfeit-report",
  upload.fields(fileFields),
  CounterfeitReportController.createOrUpdate
);
router.get("/counterfeit-report", CounterfeitReportController.getOne);
router.get("/counterfeit-reports", CounterfeitReportController.getAll);

// ── Dashboard: PATCH /counterfeit-report/status ──────────────
router.patch(
  "/counterfeit-report/status",
  isInternalRequest,
  authMiddleware,
  requirePermission("cgis", "update"),
  pendingInterceptor({
    module:    "cgis",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: null,
      payload: {
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cgis",
    action: "update",
    extractMeta: (req) => ({
      entityId: null,
      diff: {
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  CounterfeitReportController.updateStatus
);

export default router;