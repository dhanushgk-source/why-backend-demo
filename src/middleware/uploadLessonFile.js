const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB — lesson videos can be large
  },

  fileFilter: (req, file, cb) => {
    if (file.fieldname === "video") {
      if (!file.mimetype.startsWith("video/")) {
        return cb(new Error("Only video files are allowed for the video field."));
      }
      return cb(null, true);
    }

    if (file.fieldname === "pdf") {
      if (file.mimetype !== "application/pdf") {
        return cb(new Error("Only PDF files are allowed for the pdf field."));
      }
      return cb(null, true);
    }

    if (file.fieldname === "ppt") {
      const allowed = [
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];
      if (!allowed.includes(file.mimetype)) {
        return cb(new Error("Only PPT/PPTX files are allowed for the ppt field."));
      }
      return cb(null, true);
    }

    cb(new Error("Unexpected file field."));
  },
});

// LessonForm.jsx only ever sends one of these per submit, but declaring
// all three keeps a single middleware usable for create + update on any content type.
module.exports = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
  { name: "ppt", maxCount: 1 },
]);
