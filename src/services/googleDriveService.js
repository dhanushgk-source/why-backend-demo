const { google } = require("googleapis");
const fs = require("fs");

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
 * Get existing folder or create new folder
 */
const getOrCreateJobFolder = async (
  jobTitle,
  jobId
) => {
  try {
    const folderName = `${jobTitle}_${jobId}`;

    const existingFolders =
      await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: "files(id,name)",
      });

    if (
      existingFolders.data.files &&
      existingFolders.data.files.length > 0
    ) {
      return existingFolders.data.files[0].id;
    }

    const folder =
      await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType:
            "application/vnd.google-apps.folder",
          parents: [
            process.env.GOOGLE_DRIVE_FOLDER_ID,
          ],
        },
        supportsAllDrives: true,
        fields: "id",
      });

    return folder.data.id;
  } catch (error) {
    console.error(
      "Folder Creation Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

/**
 * Upload file to Google Drive
 */
const uploadToDrive = async (
  file,
  jobTitle,
  jobId
) => {
  let fileId = null;

  try {
    if (!file) {
      throw new Error(
        "No file provided for upload"
      );
    }

    const folderId =
      await getOrCreateJobFolder(
        jobTitle,
        jobId
      );

    const fileName =
      `${Date.now()}-${file.originalname}`;

    const uploadResponse =
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: fs.createReadStream(
            file.path
          ),
        },
        supportsAllDrives: true,
        fields: "id,name",
      });

    fileId =
      uploadResponse.data.id;

    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return {
      fileId,
      fileName,
      url: `https://drive.google.com/file/d/${fileId}/view`,
    };
  } catch (error) {
    console.error(
      "Google Drive Upload Error:",
      error.response?.data || error.message
    );

    throw new Error(
      "Failed to upload file to Google Drive"
    );
  } finally {
    if (
      file?.path &&
      fs.existsSync(file.path)
    ) {
      fs.unlinkSync(file.path);
    }
  }
};

module.exports = {
  uploadToDrive,
};