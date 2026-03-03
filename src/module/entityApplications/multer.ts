import multer from "multer";

const storage = multer.memoryStorage();
export const uploadGovernmentDocuments = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/", "application/pdf"];
    const isAllowed = allowed.some((type) => file.mimetype.startsWith(type));
    if (!isAllowed) {
      cb(new Error("Only images and PDFs are allowed for government documents"));
      return;
    }
    cb(null, true);
  },
}).fields([
  { name: "authorization_letter", maxCount: 1 },
  { name: "accreditation_certificates", maxCount: 5 },
  { name: "appointment_orders", maxCount: 5 },
  { name: "registration_documents", maxCount: 5 },
]);