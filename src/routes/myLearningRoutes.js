const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const {
  getMyTrainings,
  getMyTrainingTree,
  getMyLesson,
  updateMyLessonProgress,
} = require("../controllers/myLearningController");

// Every route here just needs a logged-in user (any role) — the controller
// itself resolves whether that user is a provisioned student and scopes
// everything to their own enrollments. No adminOnly here on purpose.
router.use(authenticate);

router.get("/trainings", getMyTrainings);
router.get("/trainings/:trainingId/tree", getMyTrainingTree);
router.get("/lessons/:lessonId", getMyLesson);
router.put("/lessons/:lessonId/progress", updateMyLessonProgress);

module.exports = router;
