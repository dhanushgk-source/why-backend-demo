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

module.exports = router;