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

// Our own domain, not Google's — avoids hotlink rate limiting (429s)
// and CORB issues from drive.google.com / lh3.googleusercontent.com.
const PUBLIC_API_BASE =
  process.env.PUBLIC_API_BASE_URL ||
  "https://why-website-backend.onrender.com";

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

    // Make image readable (our proxy uses the service account either way,
    // but this keeps the file accessible if ever fetched directly too).
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

      imageUrl: `${PUBLIC_API_BASE}/api/team/image/${fileId}`,
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
 * Stream Team Image (used by our own /api/team/image/:fileId proxy route,
 * so the browser never talks to Google directly)
 */
const getTeamImageStream = async (fileId) => {
  return drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );
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
  getTeamImageStream,
};