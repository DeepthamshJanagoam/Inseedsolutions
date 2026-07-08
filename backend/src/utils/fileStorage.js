const path = require("path");

const sanitizeFileStem = (value) =>
  String(value || "document")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "document";

const buildStoredFilename = (file, fallbackStem = "document") => {
  const extension = path.extname(file?.originalname || "").toLowerCase();
  const baseName = sanitizeFileStem(fallbackStem || path.basename(file?.originalname || "document", extension));
  return `${baseName}-${Date.now()}${extension}`;
};

const fileToDataUrl = (file) => {
  if (!file?.buffer) return "";
  const mimeType = file.mimetype || "application/octet-stream";
  return `data:${mimeType};base64,${file.buffer.toString("base64")}`;
};

module.exports = {
  buildStoredFilename,
  fileToDataUrl,
  sanitizeFileStem,
};
