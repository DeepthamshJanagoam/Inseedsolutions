const express = require("express");

const authRoutes = require("./authRoutes");
const publicRoutes = require("./publicRoutes");
const adminRoutes = require("./adminRoutes");
const studentRoutes = require("./studentRoutes");
const healthRoutes = require("./healthRoutes");

const router = express.Router();

router.use(healthRoutes);
router.use(publicRoutes);
router.use(authRoutes);
router.use("/admin", adminRoutes);
router.use("/student", studentRoutes);

module.exports = router;
