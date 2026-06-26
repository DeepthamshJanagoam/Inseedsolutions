const fs = require("fs/promises");
const path = require("path");

const ApiError = require("../utils/apiError");
const { galleryImageDirectory } = require("../middleware/upload");

const metadataPath = path.join(galleryImageDirectory, "gallery-metadata.json");
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const toPublicUrl = (filename) => `/gallery-images/${encodeURIComponent(filename)}`;

const sanitizeFilename = (filename) => {
  const normalized = path.basename(String(filename || ""));
  const extension = path.extname(normalized).toLowerCase();

  if (!normalized || !allowedExtensions.has(extension)) {
    throw new ApiError(400, "A valid gallery image filename is required");
  }

  return normalized;
};

const readMetadata = async () => {
  try {
    return JSON.parse(await fs.readFile(metadataPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
};

const writeMetadata = async (metadata) => {
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
};

const titleFromFilename = (filename) =>
  path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const listGalleryImages = async () => {
  const [entries, metadata] = await Promise.all([fs.readdir(galleryImageDirectory, { withFileTypes: true }), readMetadata()]);

  const images = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase()))
      .map(async (entry) => {
        const stats = await fs.stat(path.join(galleryImageDirectory, entry.name));
        const itemMetadata = metadata[entry.name] || {};

        return {
          filename: entry.name,
          title: itemMetadata.title || titleFromFilename(entry.name),
          caption: itemMetadata.caption || "",
          url: toPublicUrl(entry.name),
          size: stats.size,
          updatedAt: stats.mtime.toISOString(),
        };
      })
  );

  return images.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

const createGalleryImage = async (file, { title, caption } = {}) => {
  if (!file?.filename) {
    throw new ApiError(400, "Gallery image is required");
  }

  const metadata = await readMetadata();
  metadata[file.filename] = {
    title: String(title || "").trim() || titleFromFilename(file.filename),
    caption: String(caption || "").trim(),
  };
  await writeMetadata(metadata);

  return (await listGalleryImages()).find((image) => image.filename === file.filename);
};

const updateGalleryImage = async (filename, { title, caption } = {}) => {
  const safeFilename = sanitizeFilename(filename);
  const absolutePath = path.join(galleryImageDirectory, safeFilename);

  try {
    await fs.access(absolutePath);
  } catch (error) {
    throw new ApiError(404, "Gallery image not found");
  }

  const metadata = await readMetadata();
  metadata[safeFilename] = {
    title: String(title || "").trim() || titleFromFilename(safeFilename),
    caption: String(caption || "").trim(),
  };
  await writeMetadata(metadata);

  return (await listGalleryImages()).find((image) => image.filename === safeFilename);
};

const deleteGalleryImage = async (filename) => {
  const safeFilename = sanitizeFilename(filename);
  const absolutePath = path.join(galleryImageDirectory, safeFilename);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new ApiError(404, "Gallery image not found");
    }
    throw error;
  }

  const metadata = await readMetadata();
  delete metadata[safeFilename];
  await writeMetadata(metadata);

  return { deleted: true };
};

module.exports = {
  createGalleryImage,
  deleteGalleryImage,
  listGalleryImages,
  updateGalleryImage,
};
