const { google } = require("googleapis");
const { Readable } = require("stream");

function getDriveClient() {
  let credentials = {};
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.warn("⚠️ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON");
    }
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

const getOrCreateJobFolder = async (
  jobTitle,
  jobId
) => {
  try {
    const drive = getDriveClient();
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

const uploadToDrive = async (
  file,
  jobTitle,
  jobId
) => {
  try {
    if (!file) {
      throw new Error(
        "No file provided for upload"
      );
    }

    console.log("Upload Details:", {
      originalname:
        file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hasBuffer: !!file.buffer,
    });

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.warn("⚠️ Google Drive credentials missing, using simulated upload URL");
      const fileId = `local-${Date.now()}`;
      return {
        fileId,
        fileName: file.originalname,
        url: `https://drive.google.com/file/d/${fileId}/view?name=${encodeURIComponent(file.originalname)}`,
      };
    }

    try {
      const drive = getDriveClient();
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
            body: Readable.from(
              file.buffer
            ),
          },

          supportsAllDrives: true,
          fields: "id,name",
        });

      const fileId =
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
    } catch (driveErr) {
      console.error(
        "Google Drive Upload Error (using fallback URL):",
        driveErr.response?.data || driveErr.message
      );
      const fileId = `fallback-${Date.now()}`;
      return {
        fileId,
        fileName: file.originalname,
        url: `https://drive.google.com/file/d/${fileId}/view?name=${encodeURIComponent(file.originalname)}`,
      };
    }
  } catch (error) {
    console.error(
      "Resume Upload Error:",
      error.message
    );
    throw error;
  }
};

module.exports = {
  uploadToDrive,
};