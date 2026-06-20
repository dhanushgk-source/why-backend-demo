const { google } = require("googleapis");
const fs = require("fs");

const auth = new google.auth.GoogleAuth({
  keyFile:
    "./src/config/google-service-account.json",
  scopes: [
    "https://www.googleapis.com/auth/drive",
  ],
});

const drive = google.drive({
  version: "v3",
  auth,
});

const getOrCreateJobFolder = async (
  jobTitle,
  jobId
) => {

  const folderName =
    `${jobTitle}_${jobId}`;

  const existingFolders =
    await drive.files.list({
      q: `
        name='${folderName}'
        and mimeType='application/vnd.google-apps.folder'
        and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents
        and trashed=false
      `,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: "files(id,name)",
    });

  if (
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
};

const uploadToDrive = async (
  file,
  jobTitle,
  jobId
) => {

  const folderId =
    await getOrCreateJobFolder(
      jobTitle,
      jobId
    );

  const fileName =
    `${Date.now()}-${file.originalname}`;

  const response =
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
    });

  const fileId =
    response.data.id;

  await drive.permissions.create({
    fileId,
    supportsAllDrives: true,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  fs.unlinkSync(file.path);

  return {
    fileId,
    url: `https://drive.google.com/file/d/${fileId}/view`,
  };
};

module.exports = {
  uploadToDrive,
};