const express = require("express");

const router = express.Router();

const authenticate =
require("../middleware/authMiddleware");

const adminOnly =
require("../middleware/adminMiddleware");

const {
  createJob,
  updateJob,
  deleteJob,
  getAllApplications,
  updateApplicationStatus
} = require("../controllers/adminController");

const {
  createStudent,
  updateStudent,
  archiveStudent,
  setStudentStatus,
  resetStudentPassword,
  resendStudentSetupEmail,
  approveStudent,
  rejectStudent,
} = require("../controllers/studentController");

const {
  createTrainingProgram,
  updateTrainingProgram,
  archiveTrainingProgram,
} = require("../controllers/trainingController");

const {
  getStudentEnrollments,
  setStudentEnrollments,
  getTrainingEnrollments,
  setTrainingEnrollments,
} = require("../controllers/enrollmentController");

const {
  getModules,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
} = require("../controllers/moduleController");

const {
  getLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
} = require("../controllers/lessonController");

const uploadTrainingThumbnail = require("../middleware/uploadTrainingThumbnail");
const uploadLessonFile = require("../middleware/uploadLessonFile");

router.use(authenticate);
router.use(adminOnly);

router.post("/jobs", createJob);

router.put("/jobs/:id", updateJob);

router.delete("/jobs/:id", deleteJob);

router.get(
  "/applications",
  getAllApplications
);

router.put(
  "/applications/:id/status",
  updateApplicationStatus
);

/**
 * Students
 */
router.post("/students", createStudent);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", archiveStudent);
router.patch("/students/:id/status", setStudentStatus);
router.post("/students/:id/reset-password", resetStudentPassword);
router.post("/students/:id/resend-setup-email", resendStudentSetupEmail);
router.put("/students/:id/approve", approveStudent);
router.put("/students/:id/reject", rejectStudent);

/**
 * Training programs
 */
router.post("/trainings", uploadTrainingThumbnail.single("thumbnail"), createTrainingProgram);
router.put("/trainings/:id", uploadTrainingThumbnail.single("thumbnail"), updateTrainingProgram);
router.delete("/trainings/:id", archiveTrainingProgram);

/**
 * Enrollments (assign training <-> students, both directions)
 */
router.get("/students/:studentId/trainings", getStudentEnrollments);
router.put("/students/:studentId/trainings", setStudentEnrollments);
router.get("/trainings/:trainingId/students", getTrainingEnrollments);
router.put("/trainings/:trainingId/students", setTrainingEnrollments);

/**
 * Modules
 */
router.get("/trainings/:trainingId/modules", getModules);
router.post("/trainings/:trainingId/modules", createModule);
router.put("/trainings/:trainingId/modules/reorder", reorderModules);
router.put("/trainings/:trainingId/modules/:moduleId", updateModule);
router.delete("/trainings/:trainingId/modules/:moduleId", deleteModule);

/**
 * Lessons
 */
router.get("/modules/:moduleId/lessons", getLessons);
router.post("/modules/:moduleId/lessons", uploadLessonFile, createLesson);
router.put("/modules/:moduleId/lessons/reorder", reorderLessons);
router.put("/modules/:moduleId/lessons/:lessonId", uploadLessonFile, updateLesson);
router.delete("/modules/:moduleId/lessons/:lessonId", deleteLesson);

/**
 * Certificates
 */
const { getStudentCertificatesAdmin } = require("../controllers/certificateController");
router.get("/students/:studentId/certificates", getStudentCertificatesAdmin);

module.exports = router;