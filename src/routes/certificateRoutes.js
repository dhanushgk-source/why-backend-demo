const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const {
  getMyCertificates,
  getCertificateById,
} = require("../controllers/certificateController");

// Public / Verification lookup
router.get("/:id", getCertificateById);

// Authenticated student routes
router.get("/my/all", authenticate, getMyCertificates);

module.exports = router;
