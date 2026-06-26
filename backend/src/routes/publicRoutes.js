const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const { galleryImageUpload } = require("../middleware/upload");
const { getPublicPlacements } = require("../controllers/placementController");
const { submitContactForm } = require("../controllers/contactController");
const partnershipController = require("../controllers/partnershipController");
const reportController = require("../controllers/reportController");
const galleryController = require("../controllers/galleryController");

const router = express.Router();

router.get("/placements", asyncHandler(getPublicPlacements));
router.get("/reports", asyncHandler(reportController.getPublicReports));
router.get("/partnerships", asyncHandler(partnershipController.listPublicPartnerships));
router.get("/gallery", asyncHandler(galleryController.listGalleryImages));
router.post("/gallery", authenticate, requireRole("ADMIN"), galleryImageUpload.single("galleryImage"), asyncHandler(galleryController.uploadGalleryImage));
router.put("/gallery/:filename", authenticate, requireRole("ADMIN"), asyncHandler(galleryController.updateGalleryImage));
router.delete("/gallery/:filename", authenticate, requireRole("ADMIN"), asyncHandler(galleryController.deleteGalleryImage));
router.post("/contact", asyncHandler(submitContactForm));

module.exports = router;
