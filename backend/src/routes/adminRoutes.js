const express = require("express");

const { authenticate, requireRole } = require("../middleware/authMiddleware");
const { galleryImageUpload, mouDocumentUpload, traineeDocumentUpload } = require("../middleware/upload");
const adminController = require("../controllers/adminController");
const adminUserController = require("../controllers/adminUserController");
const institutionController = require("../controllers/institutionController");
const galleryController = require("../controllers/galleryController");
const partnershipController = require("../controllers/partnershipController");
const placementController = require("../controllers/placementController");
const reportController = require("../controllers/reportController");
const studentController = require("../controllers/studentController");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate, requireRole("ADMIN", "TRAINEE_OPERATOR", "PLACEMENT_OPERATOR"));

router.get("/overview", asyncHandler(adminController.getAdminOverview));
router.get("/reports/export", requireRole("ADMIN"), asyncHandler(reportController.exportAdminReport));
router.get("/reports", requireRole("ADMIN"), asyncHandler(reportController.getAdminReports));

router
  .route("/gallery")
  .get(requireRole("ADMIN"), asyncHandler(galleryController.listGalleryImages))
  .post(requireRole("ADMIN"), galleryImageUpload.single("galleryImage"), asyncHandler(galleryController.uploadGalleryImage));

router
  .route("/gallery/:filename")
  .put(requireRole("ADMIN"), asyncHandler(galleryController.updateGalleryImage))
  .delete(requireRole("ADMIN"), asyncHandler(galleryController.deleteGalleryImage));

router.post(
  "/gallery-update",
  requireRole("ADMIN"),
  (req, res, next) => {
    req.params.filename = req.body.filename;
    next();
  },
  asyncHandler(galleryController.updateGalleryImage)
);
router.post(
  "/gallery-delete",
  requireRole("ADMIN"),
  (req, res, next) => {
    req.params.filename = req.body.filename;
    next();
  },
  asyncHandler(galleryController.deleteGalleryImage)
);

router
  .route("/institutions")
  .get(requireRole("ADMIN", "PLACEMENT_OPERATOR"), asyncHandler(institutionController.listInstitutions))
  .post(requireRole("ADMIN"), asyncHandler(institutionController.createInstitution));

router
  .route("/institutions/:id")
  .put(requireRole("ADMIN"), asyncHandler(institutionController.updateInstitution))
  .delete(requireRole("ADMIN"), asyncHandler(institutionController.deleteInstitution));

router
  .route("/students")
  .get(requireRole("ADMIN", "TRAINEE_OPERATOR", "PLACEMENT_OPERATOR"), asyncHandler(studentController.listStudents))
  .post(
    requireRole("ADMIN", "TRAINEE_OPERATOR"),
    traineeDocumentUpload.fields([
      { name: "qualificationCertificate", maxCount: 1 },
      { name: "profilePhoto", maxCount: 1 },
      { name: "aadharCard", maxCount: 1 },
      { name: "panCard", maxCount: 1 },
      { name: "bankPassbook", maxCount: 1 },
    ]),
    asyncHandler(studentController.createStudent)
  );

router
  .route("/students/:id")
  .put(
    requireRole("ADMIN", "TRAINEE_OPERATOR"),
    traineeDocumentUpload.fields([
      { name: "qualificationCertificate", maxCount: 1 },
      { name: "profilePhoto", maxCount: 1 },
      { name: "aadharCard", maxCount: 1 },
      { name: "panCard", maxCount: 1 },
      { name: "bankPassbook", maxCount: 1 },
    ]),
    asyncHandler(studentController.updateStudent)
  )
  .delete(requireRole("ADMIN", "TRAINEE_OPERATOR"), asyncHandler(studentController.deleteStudent));

router.post(
  "/student-update",
  requireRole("ADMIN", "TRAINEE_OPERATOR"),
  traineeDocumentUpload.fields([
    { name: "qualificationCertificate", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
    { name: "aadharCard", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "bankPassbook", maxCount: 1 },
  ]),
  (req, res, next) => {
    req.params.id = req.body.id;
    next();
  },
  asyncHandler(studentController.updateStudent)
);
router.post(
  "/student-delete",
  requireRole("ADMIN", "TRAINEE_OPERATOR"),
  (req, res, next) => {
    req.params.id = req.body.id;
    next();
  },
  asyncHandler(studentController.deleteStudent)
);

router
  .route("/placements")
  .get(requireRole("ADMIN", "PLACEMENT_OPERATOR"), asyncHandler(placementController.listPlacements))
  .post(requireRole("ADMIN", "PLACEMENT_OPERATOR"), asyncHandler(placementController.createPlacement));

router
  .route("/placements/:id")
  .put(requireRole("ADMIN", "PLACEMENT_OPERATOR"), asyncHandler(placementController.updatePlacement))
  .delete(requireRole("ADMIN", "PLACEMENT_OPERATOR"), asyncHandler(placementController.deletePlacement));

router
  .route("/partnerships")
  .get(requireRole("ADMIN"), asyncHandler(partnershipController.listAdminPartnerships))
  .post(requireRole("ADMIN"), mouDocumentUpload.single("mouDocument"), asyncHandler(partnershipController.createPartnership));

router
  .route("/partnerships/:id")
  .put(requireRole("ADMIN"), mouDocumentUpload.single("mouDocument"), asyncHandler(partnershipController.updatePartnership))
  .delete(requireRole("ADMIN"), asyncHandler(partnershipController.deletePartnership));

router.post(
  "/partnerships/:id/update",
  requireRole("ADMIN"),
  mouDocumentUpload.single("mouDocument"),
  asyncHandler(partnershipController.updatePartnership)
);
router.post("/partnerships/:id/delete", requireRole("ADMIN"), asyncHandler(partnershipController.deletePartnership));
router.post(
  "/partnership-update",
  requireRole("ADMIN"),
  mouDocumentUpload.single("mouDocument"),
  (req, res, next) => {
    req.params.id = req.body.id;
    next();
  },
  asyncHandler(partnershipController.updatePartnership)
);
router.post(
  "/partnership-delete",
  requireRole("ADMIN"),
  (req, res, next) => {
    req.params.id = req.body.id;
    next();
  },
  asyncHandler(partnershipController.deletePartnership)
);

router
  .route("/users")
  .get(requireRole("ADMIN"), asyncHandler(adminUserController.listAdminUsers))
  .post(requireRole("ADMIN"), asyncHandler(adminUserController.createAdminUser));

router
  .route("/users/:id")
  .put(requireRole("ADMIN"), asyncHandler(adminUserController.updateAdminUser));

router
  .route("/users/:id/reset-password")
  .post(requireRole("ADMIN"), asyncHandler(adminUserController.resetAdminUserPassword));

module.exports = router;
