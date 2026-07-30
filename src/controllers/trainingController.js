const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { uploadLmsFile, deleteLmsFile, getLmsFileStream } = require("../services/googleLmsService");

const THUMBNAIL_UPLOAD_OPTS = {
  folderId: process.env.GOOGLE_TRAINING_FOLDER_ID,
  prefix: "training",
  proxyPath: "/api/trainings/thumbnail",
};

/**
 * GET /api/trainings
 */
const getAllTrainingPrograms = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM training_programs
      ORDER BY created_at DESC
      `
    );

    res.status(200).json({
      success: true,
      trainings: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * GET /api/trainings/:id
 */
const getTrainingProgramById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM training_programs
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Training program not found",
      });
    }

    res.status(200).json({
      success: true,
      training: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * POST /api/admin/trainings  (multipart/form-data)
 */
const createTrainingProgram = async (req, res) => {
  try {
    const { title, category, duration, status, description } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    let thumbnailUrl = null;
    let thumbnailFileId = null;

    if (req.file) {
      const upload = await uploadLmsFile(req.file, THUMBNAIL_UPLOAD_OPTS);
      thumbnailUrl = upload.fileUrl;
      thumbnailFileId = upload.fileId;
    }

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO training_programs
      (id, title, category, duration, status, description, thumbnail_url, thumbnail_file_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        id,
        title,
        category || null,
        duration || null,
        status || "draft",
        description || null,
        thumbnailUrl,
        thumbnailFileId,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Training program created",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * PUT /api/admin/trainings/:id  (multipart/form-data)
 */
const updateTrainingProgram = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT thumbnail_file_id FROM training_programs WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Training program not found",
      });
    }

    const { title, category, duration, status, description } = req.body;

    let thumbnailUrl = req.body.thumbnail_url; // untouched unless a new file comes in
    let thumbnailFileId = existing.rows[0].thumbnail_file_id;

    if (req.file) {
      if (thumbnailFileId) {
        await deleteLmsFile(thumbnailFileId);
      }

      const upload = await uploadLmsFile(req.file, THUMBNAIL_UPLOAD_OPTS);
      thumbnailUrl = upload.fileUrl;
      thumbnailFileId = upload.fileId;
    }

    await pool.query(
      `
      UPDATE training_programs
      SET
        title=$1,
        category=$2,
        duration=$3,
        status=$4,
        description=$5,
        thumbnail_url=COALESCE($6, thumbnail_url),
        thumbnail_file_id=$7,
        updated_at=NOW()
      WHERE id=$8
      `,
      [
        title,
        category || null,
        duration || null,
        status,
        description || null,
        thumbnailUrl || null,
        thumbnailFileId,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Training program updated",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * DELETE /api/admin/trainings/:id
 * Hard delete — cascades to enrollments, modules, and lessons.
 */
const archiveTrainingProgram = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT thumbnail_file_id FROM training_programs WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Training program not found",
      });
    }

    if (existing.rows[0].thumbnail_file_id) {
      await deleteLmsFile(existing.rows[0].thumbnail_file_id);
    }

    await pool.query("DELETE FROM training_programs WHERE id = $1", [id]);

    res.status(200).json({
      success: true,
      message: "Training program removed",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * GET /api/trainings/thumbnail/:fileId
 * Proxy stream so the browser never talks to Google directly.
 */
const getTrainingThumbnail = async (req, res) => {
  try {
    const { fileId } = req.params;

    const driveRes = await getLmsFileStream(fileId);

    res.setHeader("Content-Type", driveRes.headers["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    driveRes.data
      .on("error", (err) => {
        console.error("Training thumbnail stream error:", err.message);
        if (!res.headersSent) res.sendStatus(404);
      })
      .pipe(res);
  } catch (error) {
    console.error("Get Training Thumbnail Error:", error.response?.data || error.message);
    res.status(404).send("Image not found");
  }
};

module.exports = {
  getAllTrainingPrograms,
  getTrainingProgramById,
  createTrainingProgram,
  updateTrainingProgram,
  archiveTrainingProgram,
  getTrainingThumbnail,
};
