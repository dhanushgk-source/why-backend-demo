const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const {
  getAllTrainingPrograms,
  getPublicTrainingPrograms,
  getTrainingProgramById,
  getTrainingThumbnail,
} = require("../controllers/trainingController");

router.get("/public", getPublicTrainingPrograms);
router.get("/thumbnail/:fileId", getTrainingThumbnail);

// Everything else is private admin data.
router.get("/", authenticate, adminOnly, getAllTrainingPrograms);
router.get("/:id", authenticate, adminOnly, getTrainingProgramById);

module.exports = router;
