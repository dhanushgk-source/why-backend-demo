const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const {
  createJob,
  updateJob,
  deleteJob,
  getAllApplications,
  updateApplicationStatus,
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
  getCourseStudentsProgressAdmin,
  approveCourseEnrollment,
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

const {
  getAllAdminUsers,
  inviteAdminUser,
  setUserStatus,
  updateUserPermissions,
  resendUserInvite,
  getAuditLogsController,
} = require("../controllers/adminUserController");

const uploadTrainingThumbnail = require("../middleware/uploadTrainingThumbnail");
const uploadLessonFile = require("../middleware/uploadLessonFile");

router.use(authenticate);
router.use(adminOnly);

/**
 * Admin User Management (RBAC) & Audit Logs
 */
router.get("/users", requirePermission("user_management", "view"), getAllAdminUsers);
router.post("/users/invite", requirePermission("user_management", "create"), inviteAdminUser);
router.patch("/users/:id/status", requirePermission("user_management", "edit"), setUserStatus);
router.put("/users/:id/permissions", requirePermission("user_management", "edit"), updateUserPermissions);
router.post("/users/:id/resend-invite", requirePermission("user_management", "edit"), resendUserInvite);
router.get("/audit-logs", requirePermission("user_management", "view"), getAuditLogsController);

/**
 * Job Postings
 */
router.post("/jobs", requirePermission("jobs", "create"), createJob);
router.put("/jobs/:id", requirePermission("jobs", "edit"), updateJob);
router.delete("/jobs/:id", requirePermission("jobs", "delete"), deleteJob);

/**
 * Applications
 */
router.get("/applications", requirePermission("applications", "view"), getAllApplications);
router.put("/applications/:id/status", requirePermission("applications", "edit"), updateApplicationStatus);

/**
 * Students
 */
router.post("/students", requirePermission("students", "create"), createStudent);
router.put("/students/:id", requirePermission("students", "edit"), updateStudent);
router.delete("/students/:id", requirePermission("students", "delete"), archiveStudent);
router.patch("/students/:id/status", requirePermission("students", "edit"), setStudentStatus);
router.post("/students/:id/reset-password", requirePermission("students", "edit"), resetStudentPassword);
router.post("/students/:id/resend-setup-email", requirePermission("students", "edit"), resendStudentSetupEmail);
router.put("/students/:id/approve", requirePermission("students", "edit"), approveStudent);
router.put("/students/:id/reject", requirePermission("students", "edit"), rejectStudent);

/**
 * Training programs
 */
router.post("/trainings", requirePermission("trainings", "create"), uploadTrainingThumbnail.single("thumbnail"), createTrainingProgram);
router.put("/trainings/:id", requirePermission("trainings", "edit"), uploadTrainingThumbnail.single("thumbnail"), updateTrainingProgram);
router.delete("/trainings/:id", requirePermission("trainings", "delete"), archiveTrainingProgram);
router.get("/trainings/:trainingId/student-progress", requirePermission("trainings", "view"), getCourseStudentsProgressAdmin);
router.put("/trainings/:trainingId/students/:studentId/approve", requirePermission("trainings", "edit"), approveCourseEnrollment);

/**
 * Enrollments
 */
router.get("/students/:studentId/trainings", requirePermission("students", "view"), getStudentEnrollments);
router.put("/students/:studentId/trainings", requirePermission("students", "edit"), setStudentEnrollments);
router.get("/trainings/:trainingId/students", requirePermission("trainings", "view"), getTrainingEnrollments);
router.put("/trainings/:trainingId/students", requirePermission("trainings", "edit"), setTrainingEnrollments);

/**
 * Modules
 */
router.get("/trainings/:trainingId/modules", requirePermission("trainings", "view"), getModules);
router.post("/trainings/:trainingId/modules", requirePermission("trainings", "create"), createModule);
router.put("/trainings/:trainingId/modules/reorder", requirePermission("trainings", "edit"), reorderModules);
router.put("/trainings/:trainingId/modules/:moduleId", requirePermission("trainings", "edit"), updateModule);
router.delete("/trainings/:trainingId/modules/:moduleId", requirePermission("trainings", "delete"), deleteModule);

/**
 * Lessons
 */
router.get("/modules/:moduleId/lessons", requirePermission("trainings", "view"), getLessons);
router.post("/modules/:moduleId/lessons", requirePermission("trainings", "create"), uploadLessonFile, createLesson);
router.put("/modules/:moduleId/lessons/reorder", requirePermission("trainings", "edit"), reorderLessons);
router.put("/modules/:moduleId/lessons/:lessonId", requirePermission("trainings", "edit"), uploadLessonFile, updateLesson);
router.delete("/modules/:moduleId/lessons/:lessonId", requirePermission("trainings", "delete"), deleteLesson);

/**
 * Certificates
 */
const { getStudentCertificatesAdmin } = require("../controllers/certificateController");
router.get("/students/:studentId/certificates", requirePermission("students", "view"), getStudentCertificatesAdmin);

/**
 * Site Settings & Pricing Plans
 */
const {
  updateSettingsAdmin,
  getAllPricingPlansAdmin,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  getPublicSettings,
} = require("../controllers/settingsController");

router.get("/settings", requirePermission("settings", "view"), getPublicSettings);
router.put("/settings", requirePermission("settings", "edit"), updateSettingsAdmin);
router.get("/pricing", requirePermission("settings", "view"), getAllPricingPlansAdmin);
router.post("/pricing", requirePermission("settings", "create"), createPricingPlan);
router.put("/pricing/:id", requirePermission("settings", "edit"), updatePricingPlan);
router.delete("/pricing/:id", requirePermission("settings", "delete"), deletePricingPlan);

module.exports = router;