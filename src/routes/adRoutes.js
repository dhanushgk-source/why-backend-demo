const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");

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

// Create Advertisement
router.post(
  "/",
  upload.single("image"),
  createAdvertisement
);


/**
 * Google Drive Image Proxy
 * Example:
 * /api/ads/image/1AbCdEfGhIjKlMnOpQrStUv
 */
router.get(
  "/image/:fileId",
  getAdvertisementImage
);

// Get All Advertisements
router.get(
  "/",
  getAdvertisements
);

// Get Advertisement By ID
router.get(
  "/:id",
  getAdvertisement
);

// Update Advertisement
router.put(
  "/:id",
  upload.single("image"),
  updateAdvertisement
);

// Delete Advertisement
router.delete(
  "/:id",
  deleteAdvertisement
);



module.exports = router;