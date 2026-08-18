const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();

const {
  register,
  registerStudent,
  login,
  firebaseAuth,
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
router.post("/register-student", registerStudent);
router.post("/login", login);
router.post("/firebase", firebaseAuth);
router.post("/forgot-password", forgotPassword);
router.post("/set-password", setPassword);

module.exports = router;