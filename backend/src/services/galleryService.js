const path = require("path");

const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");
const { buildStoredFilename, fileToDataUrl } = require("../utils/fileStorage");

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const sanitizeFilename = (filename) => {
  const normalized = path.basename(String(filename || ""));
  const extension = path.extname(normalized).toLowerCase();

  if (!normalized || !allowedExtensions.has(extension)) {
    throw new ApiError(400, "A valid gallery image filename is required");
  }

  return normalized;
};

const titleFromFilename = (filename) =>
  path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeGalleryImage = (image) => ({
  filename: image.filename,
  title: image.title,
  caption: image.caption || "",
  url: image.dataUrl,
  size: image.size,
  updatedAt: image.updatedAt.toISOString(),
});

const listGalleryImages = async () => {
  const images = await prisma.galleryImage.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return images.map(normalizeGalleryImage);
};

const createGalleryImage = async (file, { title, caption } = {}) => {
  if (!file?.buffer) {
    throw new ApiError(400, "Gallery image is required");
  }

  const filename = buildStoredFilename(file, title || path.basename(file.originalname || "gallery-image", path.extname(file.originalname || "")));
  const image = await prisma.galleryImage.create({
    data: {
      filename,
      title: String(title || "").trim() || titleFromFilename(filename),
      caption: String(caption || "").trim(),
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size || file.buffer.length,
      dataUrl: fileToDataUrl(file),
    },
  });

  return normalizeGalleryImage(image);
};

const updateGalleryImage = async (filename, { title, caption } = {}) => {
  const safeFilename = sanitizeFilename(filename);

  const existing = await prisma.galleryImage.findUnique({ where: { filename: safeFilename } });
  if (!existing) {
    throw new ApiError(404, "Gallery image not found");
  }

  const image = await prisma.galleryImage.update({
    where: { filename: safeFilename },
    data: {
      title: String(title || "").trim() || titleFromFilename(safeFilename),
      caption: String(caption || "").trim(),
    },
  });

  return normalizeGalleryImage(image);
};

const deleteGalleryImage = async (filename) => {
  const safeFilename = sanitizeFilename(filename);
  const existing = await prisma.galleryImage.findUnique({ where: { filename: safeFilename } });
  if (!existing) {
    throw new ApiError(404, "Gallery image not found");
  }

  await prisma.galleryImage.delete({ where: { filename: safeFilename } });
  return { deleted: true };
};

module.exports = {
  createGalleryImage,
  deleteGalleryImage,
  listGalleryImages,
  updateGalleryImage,
};
