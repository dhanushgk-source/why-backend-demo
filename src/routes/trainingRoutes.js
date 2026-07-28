const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const {
  getAllTrainingPrograms,
  getTrainingProgramById,
  getTrainingThumbnail,
} = require("../controllers/trainingController");

/**
 * Thumbnail proxy — unauthenticated, like the team/ad image proxies,
 * since it's rendered directly in <img> tags.
 */
router.get("/thumbnail/:fileId", getTrainingThumbnail);

// Everything else is private admin data.
router.get("/", authenticate, adminOnly, getAllTrainingPrograms);
router.get("/:id", authenticate, adminOnly, getTrainingProgramById);

module.exports = router;
