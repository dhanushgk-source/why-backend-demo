const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();

const {
  register,
  login,
  forgotPassword,
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
router.post("/register-student", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/set-password", setPassword);

module.exports = router;