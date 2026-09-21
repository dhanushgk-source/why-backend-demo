const { google } = require("googleapis");
const { Readable } = require("stream");

function getDriveClient() {
  let credentials = {};
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.warn("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON in googleDriveProService");
    }
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

const PUBLIC_API_BASE =
  process.env.PUBLIC_API_BASE_URL || "https://why-website-backend.onrender.com";

const uploadProImage = async (file) => {
  try {
    if (!file) throw new Error("No image provided");

    const drive = getDriveClient();
    const fileName = `pro-${Date.now()}-${file.originalname}`;
    const folderId = process.env.GOOGLE_TEAM_FOLDER_ID;

    const requestBody = { name: fileName };
    if (folderId) requestBody.parents = [folderId];

    const uploadResponse = await drive.files.create({
      requestBody,
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
      imageUrl: `${PUBLIC_API_BASE}/api/pros/image/${fileId}`,
    };
  } catch (error) {
    console.error("Google Drive PRO Upload Error:", error.response?.data || error.message);
    throw new Error("Failed to upload PRO image.");
  }
};

const getProImageStream = async (fileId) => {
  const drive = getDriveClient();
  return drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );
};

const deleteProImage = async (fileId) => {
  try {
    if (!fileId) return;
    const drive = getDriveClient();
    await drive.files.delete({ fileId, supportsAllDrives: true });
    return true;
  } catch (error) {
    console.error("Delete PRO Image Error:", error.response?.data || error.message);
    return false;
  }
};

module.exports = {
  uploadProImage,
  getProImageStream,
  deleteProImage,
};
