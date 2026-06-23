const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    const ext = path.extname(
      file.originalname
    ).toLowerCase();

    if (ext !== ".pdf") {
      return cb(
        new Error(
          "Only PDF files are allowed"
        )
      );
    }

    cb(null, true);
  },
});

module.exports = upload;