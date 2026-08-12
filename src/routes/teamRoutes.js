const express = require("express");

const router = express.Router();

const upload = require("../middleware/uploadTeamImage");

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
 * GET All Team Members
 */
router.get("/", getAllTeam);

/**
 * GET Team Member Image (proxied through our own server)
 */
router.get("/image/:fileId", getTeamImage);

/**
 * REORDER Departments
 */
router.put("/reorder-departments", reorderDepartments);

/**
 * REORDER Team Members
 */
router.put("/reorder-members", reorderMembers);

/**
 * GET Team Member By ID
 */
router.get("/:id", getTeamById);

/**
 * CREATE Team Member
 */
router.post(
  "/",
  upload.single("image"),
  createTeam
);

/**
 * UPDATE Team Member
 */
router.put(
  "/:id",
  upload.single("image"),
  updateTeam
);

/**
 * DELETE Team Member
 */
router.delete(
  "/:id",
  deleteTeam
);

module.exports = router;