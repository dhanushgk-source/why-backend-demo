const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const {
  createAdvertisement,
  getAdvertisements,
  getAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getAdvertisementImage,
} = require("../controllers/adController");

/**
 * Advertisement CRUD
 */

// Public / View routes
router.get("/image/:fileId", getAdvertisementImage);
router.get("/", getAdvertisements);
router.get("/:id", getAdvertisement);

// Protected Admin Write Routes
router.post(
  "/",
  authenticate,
  adminOnly,
  requirePermission("advertisements", "create"),
  upload.single("image"),
  createAdvertisement
);

router.put(
  "/:id",
  authenticate,
  adminOnly,
  requirePermission("advertisements", "edit"),
  upload.single("image"),
  updateAdvertisement
);

router.delete(
  "/:id",
  authenticate,
  adminOnly,
  requirePermission("advertisements", "delete"),
  deleteAdvertisement
);

module.exports = router;