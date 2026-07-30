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
// and CORB issues, same reasoning as the existing team/ad services.
const PUBLIC_API_BASE =
  process.env.PUBLIC_API_BASE_URL ||
  "https://why-website-backend.onrender.com";

/**
 * Generic Drive upload used for every LMS asset type.
 *
 * @param {Express.Multer.File} file
 * @param {object} opts
 * @param {string} opts.folderId - Drive folder to upload into
 * @param {string} opts.prefix - filename prefix, e.g. "training", "lesson-video"
 * @param {string} opts.proxyPath - our own route that streams this file back,
 *   e.g. "/api/trainings/thumbnail" or "/api/lessons/video"
 */
const uploadLmsFile = async (file, { folderId, prefix, proxyPath }) => {
  if (!file) {
    throw new Error("No file provided");
  }

  if (!folderId) {
    throw new Error(
      `Missing Drive folder id for "${prefix}" uploads. Set the corresponding GOOGLE_*_FOLDER_ID env var.`
    );
  }

  console.log(`Uploading LMS file (${prefix}):`, {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  const fileName = `${prefix}-${Date.now()}-${file.originalname}`;

  const uploadResponse = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
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
    fileUrl: `${PUBLIC_API_BASE}${proxyPath}/${fileId}`,
  };
};

/**
 * Stream a Drive file back through our own proxy route.
 */
const getLmsFileStream = async (fileId) => {
  return drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );
};

/**
 * Delete a Drive file (used when replacing or removing an asset).
 */
const deleteLmsFile = async (fileId) => {
  try {
    if (!fileId) return false;

    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });

    return true;
  } catch (error) {
    console.error(
      "Delete LMS File Error:",
      error.response?.data || error.message
    );

    return false;
  }
};

module.exports = {
  uploadLmsFile,
  getLmsFileStream,
  deleteLmsFile,
};
