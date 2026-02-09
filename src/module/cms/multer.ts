import multer from 'multer';

// Use memory storage (files stored in memory as Buffer)
const storage = multer.memoryStorage();

// File filter for images only
const imageFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept images only
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed!'));
    return;
  }
  cb(null, true);
};

/**
 * For team member profile image (single file)
 * Field name: 'profile_image'
 */
export const uploadProfileImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
}).single('profile_image');

/**
 * For page content images (multiple files)
 * Field name: 'images'
 */
export const uploadContentImages = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10, // Max 10 files
  },
}).array('images', 10);

/**
 * For page meta OG and Twitter images (multiple fields)
 * Field names: 'og_image', 'twitter_image'
 */
export const uploadMetaImages = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
}).fields([
  { name: 'og_image', maxCount: 1 },
  { name: 'twitter_image', maxCount: 1 },
]);