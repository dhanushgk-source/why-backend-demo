const express = require("express");
const router = express.Router();

const { sendAccountSetupEmail } = require("../services/mailService");

router.get("/test-email", async (req, res) => {
  try {
    await sendAccountSetupEmail({
      to: process.env.SMTP_USER,
      fullName: "Tharun",
      rawToken: "test-token-123",
    });

    res.json({
      success: true,
      message: "Test email sent successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;