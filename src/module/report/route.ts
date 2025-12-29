import { Router } from 'express';
import multer from 'multer';
import { CounterfeitReportController } from './controller.ts';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Define all possible file fields
const fileFields = [
  { name: 'receipt', maxCount: 1 },
  { name: 'product_photos', maxCount: 10 },
  { name: 'packaging_photos', maxCount: 10 },
  { name: 'certificates', maxCount: 10 },
  { name: 'listing_screenshots', maxCount: 10 },
  { name: 'gi_tag_photos', maxCount: 10 },
  { name: 'gi_code_closeups', maxCount: 10 },
];

router.post(
  '/counterfeit-report',
  upload.fields(fileFields),
  CounterfeitReportController.createOrUpdate
);

export default router;
