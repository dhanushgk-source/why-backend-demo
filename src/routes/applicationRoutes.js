const express = require("express");

const router = express.Router();

const authenticate = require(
  "../middleware/authMiddleware"
);

const {
  applyJob,
  getMyApplications,
} = require("../controllers/applicationController");

router.post(
  "/apply",
  authenticate,
  applyJob
);

router.get(
  "/my",
  authenticate,
  getMyApplications
);

module.exports = router;