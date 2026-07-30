const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();

const {
  register,
  login,
  registerStudent,
  setPassword,
} = require("../controllers/authController");

router.get(
  "/me",
  authenticate,
  (req, res) => {

    res.json({
      success: true,
      user: req.user
    });

  }
);

router.post("/register", register);
router.post("/login", login);
router.post("/register-student", registerStudent);
router.post("/set-password", setPassword);

module.exports = router;