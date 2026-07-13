const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ];

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    if (
      !allowedExtensions.includes(ext) ||
      !allowedMimeTypes.includes(file.mimetype)
    ) {
      return cb(
        new Error(
          "Only JPG, JPEG, PNG, and WEBP images are allowed."
        )
      );
    }

    cb(null, true);
  },
});

module.exports = upload;