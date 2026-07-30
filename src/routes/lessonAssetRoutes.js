const express = require("express");
const router = express.Router();

const { getLessonVideo, getLessonPdf, getLessonPpt } = require("../controllers/lessonController");

// Unauthenticated media proxy routes — same reasoning as the team/ad image
// proxies: browsers request these directly from <video>/<iframe>/<a> tags,
// which can't attach an Authorization header.
router.get("/video/:fileId", getLessonVideo);
router.get("/pdf/:fileId", getLessonPdf);
router.get("/ppt/:fileId", getLessonPpt);

module.exports = router;
