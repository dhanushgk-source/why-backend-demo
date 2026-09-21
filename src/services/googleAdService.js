const { google } = require("googleapis");
const { Readable } = require("stream");

let credentials = {};
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch (e) {
    console.warn("⚠️ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON in googleAdService, using empty credentials");
  }
}

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

const PUBLIC_API_BASE =
  process.env.PUBLIC_API_BASE_URL ||
  "https://why-website-backend.onrender.com";

/**
 * Upload Advertisement Image
 */
const uploadAdImage = async (file) => {
  try {
    if (!file) {
      throw new Error("No image provided");
    }

    console.log("Uploading Advertisement Image:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const fileName = `ad-${Date.now()}-${file.originalname}`;

    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [
          process.env.GOOGLE_AD_FOLDER_ID,
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

      imageUrl: `${PUBLIC_API_BASE}/api/ads/image/${fileId}`,
    };
  } catch (error) {
    console.error(
      "Advertisement Upload Error:",
      error.response?.data || error.message
    );

    throw new Error(
      "Failed to upload advertisement image."
    );
  }
};

/**
 * Stream Advertisement Image
 */
const getAdImageStream = async (fileId) => {
  return drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true,
    },
    {
      responseType: "stream",
    }
  );
};

/**
 * Delete Advertisement Image
 */
const deleteAdImage = async (fileId) => {
  try {
    if (!fileId) return;

    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });

    return true;
  } catch (error) {
    console.error(
      "Delete Advertisement Image Error:",
      error.response?.data || error.message
    );

    return false;
  }
};

module.exports = {
  uploadAdImage,
  getAdImageStream,
  deleteAdImage,
};