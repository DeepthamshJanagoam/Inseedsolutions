const express = require("express");

const { authenticate, requireRole } = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");
const studentController = require("../controllers/studentController");
const placementController = require("../controllers/placementController");

const router = express.Router();

router.use(authenticate, requireRole("STUDENT"));

router.get("/me", asyncHandler(studentController.getMyProfile));
router.get("/placements", asyncHandler(placementController.getMyPlacements));

module.exports = router;
