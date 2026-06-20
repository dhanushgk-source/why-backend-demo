const express = require("express");

const router = express.Router();

const upload =
  require("../middleware/uploadResume");

const {
  uploadToDrive,
} = require(
  "../services/googleDriveService"
);

router.post(
  "/resume",
  upload.single("resume"),
  async (req, res) => {
    try {
      const {
        jobTitle,
        jobId,
      } = req.body;

      const result =
        await uploadToDrive(
          req.file,
          jobTitle,
          jobId
        );

      res.status(200).json({
        success: true,
        fileId: result.fileId,
        url: result.url,
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: "Upload failed",
      });

    }
  }
);

module.exports = router;