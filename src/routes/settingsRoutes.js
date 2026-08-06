const express = require("express");
const router = express.Router();
const {
  getPublicSettings,
  getPublicPricingPlans,
} = require("../controllers/settingsController");

router.get("/settings/public", getPublicSettings);
router.get("/pricing/public", getPublicPricingPlans);

module.exports = router;
