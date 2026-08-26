const express = require("express");

const router = express.Router();

const upload = require("../middleware/uploadTeamImage");
const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const {
  createTeam,
  getAllTeam,
  getTeamById,
  updateTeam,
  deleteTeam,
  getTeamImage,
  reorderDepartments,
  reorderMembers,
} = require("../controllers/teamController");

/**
 * Public / View Routes
 */
router.get("/", getAllTeam);
router.get("/image/:fileId", getTeamImage);
router.get("/:id", getTeamById);

/**
 * Protected Admin Write Routes
 */
router.put("/reorder-departments", authenticate, adminOnly, requirePermission("team", "edit"), reorderDepartments);
router.put("/reorder-members", authenticate, adminOnly, requirePermission("team", "edit"), reorderMembers);

router.post(
  "/",
  authenticate,
  adminOnly,
  requirePermission("team", "create"),
  upload.single("image"),
  createTeam
);

router.put(
  "/:id",
  authenticate,
  adminOnly,
  requirePermission("team", "edit"),
  upload.single("image"),
  updateTeam
);

router.delete(
  "/:id",
  authenticate,
  adminOnly,
  requirePermission("team", "delete"),
  deleteTeam
);

module.exports = router;