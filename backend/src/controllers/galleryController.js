const fs = require("fs/promises");

const galleryService = require("../services/galleryService");

const removeRequestFile = async (req) => {
  if (!req.file?.path) return;

  try {
    await fs.unlink(req.file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(error);
    }
  }
};

const listGalleryImages = async (_req, res) => {
  const data = await galleryService.listGalleryImages();

  res.status(200).json({
    success: true,
    data,
  });
};

const uploadGalleryImage = async (req, res) => {
  try {
    const data = await galleryService.createGalleryImage(req.file, req.body);

    res.status(201).json({
      success: true,
      message: "Gallery image uploaded successfully",
      data,
    });
  } catch (error) {
    await removeRequestFile(req);
    throw error;
  }
};

const updateGalleryImage = async (req, res) => {
  const data = await galleryService.updateGalleryImage(req.params.filename, req.body);

  res.status(200).json({
    success: true,
    message: "Gallery image updated successfully",
    data,
  });
};

const deleteGalleryImage = async (req, res) => {
  const data = await galleryService.deleteGalleryImage(req.params.filename);

  res.status(200).json({
    success: true,
    message: "Gallery image deleted successfully",
    data,
  });
};

module.exports = {
  deleteGalleryImage,
  listGalleryImages,
  updateGalleryImage,
  uploadGalleryImage,
};
