const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const { getAllStudents, getStudentById } = require("../controllers/studentController");

// Student records are private admin data — every route here requires an admin token.
router.use(authenticate);
router.use(adminOnly);

router.get("/", getAllStudents);
router.get("/:id", getStudentById);

module.exports = router;
