const fs = require("fs");
const path = require("path");

const multer = require("multer");

const runtimeUploadRoot = process.env.VERCEL
  ? path.join("/tmp", "inseed-uploads")
  : path.join(__dirname, "..", "..", "uploads");

const mouUploadDirectory = path.join(runtimeUploadRoot, "mous");
const traineeUploadDirectory = path.join(runtimeUploadRoot, "trainee-documents");
const galleryImageDirectory = process.env.VERCEL
  ? path.join(runtimeUploadRoot, "gallery-images")
  : path.join(__dirname, "..", "..", "..", "frontend", "images", "Gallery images");
fs.mkdirSync(mouUploadDirectory, { recursive: true });
fs.mkdirSync(traineeUploadDirectory, { recursive: true });
fs.mkdirSync(galleryImageDirectory, { recursive: true });

const memoryFileStorage = multer.memoryStorage();

const allowedMouMimeTypes = new Set(["application/pdf"]);

const mouDocumentUpload = multer({
  storage: memoryFileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const isAllowedExtension = extension === ".pdf";
    const isAllowedMime = !file.mimetype || allowedMouMimeTypes.has(file.mimetype);

    if (isAllowedExtension && isAllowedMime) {
      callback(null, true);
      return;
    }

    callback(new Error("Only PDF files are allowed for MOU upload."));
  },
});

const traineeDocumentUpload = multer({
  storage: memoryFileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const isImageOnlyField = file.fieldname === "profilePhoto";
    const allowedExtensions = isImageOnlyField ? [".jpg", ".jpeg", ".png"] : [".pdf", ".jpg", ".jpeg", ".png"];
    const allowedMimes = isImageOnlyField
      ? new Set(["image/jpeg", "image/png"])
      : new Set(["application/pdf", "image/jpeg", "image/png"]);
    const isAllowedExtension = allowedExtensions.includes(extension);
    const isAllowedMime = !file.mimetype || allowedMimes.has(file.mimetype);

    if (isAllowedExtension && isAllowedMime) {
      callback(null, true);
      return;
    }

    callback(new Error("Only the allowed PDF, JPG, and PNG trainee document formats can be uploaded."));
  },
});

const allowedGalleryMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const galleryImageUpload = multer({
  storage: memoryFileStorage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const isAllowedExtension = [".jpg", ".jpeg", ".png", ".webp"].includes(extension);
    const isAllowedMime = !file.mimetype || allowedGalleryMimeTypes.has(file.mimetype);

    if (isAllowedExtension && isAllowedMime) {
      callback(null, true);
      return;
    }

    callback(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed for gallery upload."));
  },
});

module.exports = {
  galleryImageDirectory,
  galleryImageUpload,
  mouDocumentUpload,
  mouUploadDirectory,
  traineeDocumentUpload,
  traineeUploadDirectory,
};
