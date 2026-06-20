const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/resumes");
  },

  filename: function (req, file, cb) {
    cb(
      null,
      Date.now() +
      "-" +
      file.originalname
    );
  },
});

const upload = multer({
  storage,

  fileFilter: (req, file, cb) => {

    const ext =
      path.extname(file.originalname);

    if (ext !== ".pdf") {
      return cb(
        new Error("Only PDF allowed")
      );
    }

    cb(null, true);
  },
});

module.exports = upload;