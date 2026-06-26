const express = require("express");
const rateLimit = require("express-rate-limit");

const asyncHandler = require("../utils/asyncHandler");
const { adminLogin, changeAdminPassword, studentLogin } = require("../controllers/authController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

router.post("/admin/login", authLimiter, asyncHandler(adminLogin));
router.post("/student/login", authLimiter, asyncHandler(studentLogin));
router.post(
  "/admin/change-password",
  authLimiter,
  authenticate,
  requireRole("ADMIN", "TRAINEE_OPERATOR", "PLACEMENT_OPERATOR"),
  asyncHandler(changeAdminPassword)
);

module.exports = router;
