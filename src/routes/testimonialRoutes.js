const express = require("express");
const router = express.Router();
const {
  submitTestimonial,
  getPublicTestimonials,
} = require("../controllers/testimonialController");

// Public endpoints
router.post("/", submitTestimonial);
router.get("/", getPublicTestimonials);

module.exports = router;
