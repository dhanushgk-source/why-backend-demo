const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadTeamImage"); // Reuses 5MB jpg/png/webp filter
const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const {
  getPublicPros,
  getPublicSettings,
  getProImage,
  getAdminPros,
  createPro,
  updatePro,
  deletePro,
  reorderPros,
  updateProSettings,
} = require("../controllers/proController");

/**
 * Public Routes
 */
router.get("/", getPublicPros);
router.get("/settings", getPublicSettings);
router.get("/image/:fileId", getProImage);

/**
 * Super Admin / Authorized Admin Routes
 */
router.get("/admin/list", authenticate, adminOnly, getAdminPros);

router.post(
  "/",
  authenticate,
  adminOnly,
  requirePermission("pros", "create"),
  upload.single("image"),
  createPro
);

router.put(
  "/settings",
  authenticate,
  adminOnly,
  requirePermission("pros", "edit"),
  updateProSettings
);

router.put(
  "/reorder",
  authenticate,
  adminOnly,
  requirePermission("pros", "edit"),
  reorderPros
);

router.put(
  "/:id",
  authenticate,
  adminOnly,
  requirePermission("pros", "edit"),
  upload.single("image"),
  updatePro
);

router.delete(
  "/:id",
  authenticate,
  adminOnly,
  requirePermission("pros", "delete"),
  deletePro
);

module.exports = router;
