const { google } = require("googleapis");
const { Readable } = require("stream");

const credentials = JSON.parse(
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    "https://www.googleapis.com/auth/drive",
  ],
});

const drive = google.drive({
  version: "v3",
  auth,
});

/**
 * Upload Team Image
 */
const uploadTeamImage = async (file) => {
  try {
    if (!file) {
      throw new Error("No image provided");
    }

    console.log("Uploading Team Image:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const fileName = `${Date.now()}-${file.originalname}`;

    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [
          process.env.GOOGLE_TEAM_FOLDER_ID,
        ],
      },

      media: {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      },

      supportsAllDrives: true,
      fields: "id,name",
    });

    const fileId = uploadResponse.data.id;

    // Make image public
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return {
      success: true,
      fileId,
      fileName,

      imageUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    };
  } catch (error) {
    console.error(
      "Google Drive Team Upload Error:",
      error.response?.data || error.message
    );

    throw new Error(
      "Failed to upload team image."
    );
  }
};

/**
 * Delete Team Image
 */
const deleteTeamImage = async (fileId) => {
  try {
    if (!fileId) return;

    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });

    return true;
  } catch (error) {
    console.error(
      "Delete Team Image Error:",
      error.response?.data || error.message
    );

    return false;
  }
};

module.exports = {
  uploadTeamImage,
  deleteTeamImage,
};