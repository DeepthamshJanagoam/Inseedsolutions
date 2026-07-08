const galleryService = require("../services/galleryService");

const listGalleryImages = async (_req, res) => {
  const data = await galleryService.listGalleryImages();

  res.status(200).json({
    success: true,
    data,
  });
};

const uploadGalleryImage = async (req, res) => {
  const data = await galleryService.createGalleryImage(req.file, req.body);

  res.status(201).json({
    success: true,
    message: "Gallery image uploaded successfully",
    data,
  });
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
