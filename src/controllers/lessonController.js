const pool = require("../config/db");
const { randomUUID: uuidv4 } = require("crypto");
const { uploadLmsFile, deleteLmsFile, getLmsFileStream } = require("../services/googleLmsService");

const VIDEO_UPLOAD_OPTS = {
  folderId: process.env.GOOGLE_LESSON_VIDEO_FOLDER_ID,
  prefix: "lesson-video",
  proxyPath: "/api/lessons/video",
};

const PDF_UPLOAD_OPTS = {
  folderId: process.env.GOOGLE_LESSON_PDF_FOLDER_ID,
  prefix: "lesson-pdf",
  proxyPath: "/api/lessons/pdf",
};

const PPT_UPLOAD_OPTS = {
  folderId: process.env.GOOGLE_LESSON_PPT_FOLDER_ID,
  prefix: "lesson-ppt",
  proxyPath: "/api/lessons/ppt",
};

/**
 * GET /api/admin/modules/:moduleId/lessons
 */
const getLessons = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM lessons
      WHERE module_id = $1
      ORDER BY position ASC, created_at ASC
      `,
      [moduleId]
    );

    res.status(200).json({
      success: true,
      lessons: result.rows,
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
 * Builds the content-specific columns for a lesson from the request body/files.
 * Shared by create + update.
 */
async function resolveContentFields(req, existing) {
  const { content_type, video_url, notes_content } = req.body;

  const fields = {
    video_url: existing?.video_url || null,
    video_file_id: existing?.video_file_id || null,
    pdf_url: existing?.pdf_url || null,
    pdf_file_id: existing?.pdf_file_id || null,
    pdf_name: existing?.pdf_name || null,
    ppt_url: existing?.ppt_url || null,
    ppt_file_id: existing?.ppt_file_id || null,
    ppt_name: existing?.ppt_name || null,
    notes_content: existing?.notes_content || null,
  };

  const videoFile = req.files?.video?.[0];
  const pdfFile = req.files?.pdf?.[0];
  const pptFile = req.files?.ppt?.[0];

  if (content_type === "video") {
    // Clear any previously stored pdf/ppt/notes when switching content types
    if (existing?.pdf_file_id) await deleteLmsFile(existing.pdf_file_id);
    if (existing?.ppt_file_id) await deleteLmsFile(existing.ppt_file_id);
    fields.pdf_url = null;
    fields.pdf_file_id = null;
    fields.pdf_name = null;
    fields.ppt_url = null;
    fields.ppt_file_id = null;
    fields.ppt_name = null;
    fields.notes_content = null;

    if (videoFile) {
      if (existing?.video_file_id) await deleteLmsFile(existing.video_file_id);
      const upload = await uploadLmsFile(videoFile, VIDEO_UPLOAD_OPTS);
      fields.video_url = upload.fileUrl;
      fields.video_file_id = upload.fileId;
    } else if (video_url) {
      if (existing?.video_file_id) await deleteLmsFile(existing.video_file_id);
      fields.video_url = video_url;
      fields.video_file_id = null;
    }
  } else if (content_type === "pdf") {
    if (existing?.video_file_id) await deleteLmsFile(existing.video_file_id);
    if (existing?.ppt_file_id) await deleteLmsFile(existing.ppt_file_id);
    fields.video_url = null;
    fields.video_file_id = null;
    fields.ppt_url = null;
    fields.ppt_file_id = null;
    fields.ppt_name = null;
    fields.notes_content = null;

    if (pdfFile) {
      if (existing?.pdf_file_id) await deleteLmsFile(existing.pdf_file_id);
      const upload = await uploadLmsFile(pdfFile, PDF_UPLOAD_OPTS);
      fields.pdf_url = upload.fileUrl;
      fields.pdf_file_id = upload.fileId;
      fields.pdf_name = pdfFile.originalname;
    }
  } else if (content_type === "ppt") {
    if (existing?.video_file_id) await deleteLmsFile(existing.video_file_id);
    if (existing?.pdf_file_id) await deleteLmsFile(existing.pdf_file_id);
    fields.video_url = null;
    fields.video_file_id = null;
    fields.pdf_url = null;
    fields.pdf_file_id = null;
    fields.pdf_name = null;
    fields.notes_content = null;

    if (pptFile) {
      if (existing?.ppt_file_id) await deleteLmsFile(existing.ppt_file_id);
      const upload = await uploadLmsFile(pptFile, PPT_UPLOAD_OPTS);
      fields.ppt_url = upload.fileUrl;
      fields.ppt_file_id = upload.fileId;
      fields.ppt_name = pptFile.originalname;
    }
  } else if (content_type === "notes") {
    if (existing?.video_file_id) await deleteLmsFile(existing.video_file_id);
    if (existing?.pdf_file_id) await deleteLmsFile(existing.pdf_file_id);
    if (existing?.ppt_file_id) await deleteLmsFile(existing.ppt_file_id);
    fields.video_url = null;
    fields.video_file_id = null;
    fields.pdf_url = null;
    fields.pdf_file_id = null;
    fields.pdf_name = null;
    fields.ppt_url = null;
    fields.ppt_file_id = null;
    fields.ppt_name = null;
    fields.notes_content = notes_content || null;
  }

  return fields;
}

/**
 * POST /api/admin/modules/:moduleId/lessons  (multipart/form-data)
 */
const createLesson = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, description, content_type, duration_minutes } = req.body;

    if (!title || !content_type) {
      return res.status(400).json({
        success: false,
        message: "Title and content type are required",
      });
    }

    const contentFields = await resolveContentFields(req, null);

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM lessons WHERE module_id = $1",
      [moduleId]
    );
    const nextPosition = countResult.rows[0].count;

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO lessons
      (id, module_id, title, description, content_type, duration_minutes,
       video_url, video_file_id, pdf_url, pdf_file_id, pdf_name,
       ppt_url, ppt_file_id, ppt_name, notes_content, position)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      `,
      [
        id,
        moduleId,
        title,
        description || null,
        content_type,
        duration_minutes || null,
        contentFields.video_url,
        contentFields.video_file_id,
        contentFields.pdf_url,
        contentFields.pdf_file_id,
        contentFields.pdf_name,
        contentFields.ppt_url,
        contentFields.ppt_file_id,
        contentFields.ppt_name,
        contentFields.notes_content,
        nextPosition,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Lesson created",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message?.includes("allowed") ? error.message : "Server Error",
    });
  }
};

/**
 * PUT /api/admin/modules/:moduleId/lessons/:lessonId  (multipart/form-data)
 */
const updateLesson = async (req, res) => {
  try {
    const { moduleId, lessonId } = req.params;
    const { title, description, content_type, duration_minutes } = req.body;

    const existingResult = await pool.query(
      "SELECT * FROM lessons WHERE id = $1 AND module_id = $2",
      [lessonId, moduleId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const existing = existingResult.rows[0];
    const contentFields = await resolveContentFields(req, existing);

    await pool.query(
      `
      UPDATE lessons
      SET
        title=$1,
        description=$2,
        content_type=$3,
        duration_minutes=$4,
        video_url=$5,
        video_file_id=$6,
        pdf_url=$7,
        pdf_file_id=$8,
        pdf_name=$9,
        ppt_url=$10,
        ppt_file_id=$11,
        ppt_name=$12,
        notes_content=$13,
        updated_at=NOW()
      WHERE id=$14
      `,
      [
        title,
        description || null,
        content_type,
        duration_minutes || null,
        contentFields.video_url,
        contentFields.video_file_id,
        contentFields.pdf_url,
        contentFields.pdf_file_id,
        contentFields.pdf_name,
        contentFields.ppt_url,
        contentFields.ppt_file_id,
        contentFields.ppt_name,
        contentFields.notes_content,
        lessonId,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Lesson updated",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message?.includes("allowed") ? error.message : "Server Error",
    });
  }
};

/**
 * DELETE /api/admin/modules/:moduleId/lessons/:lessonId
 */
const deleteLesson = async (req, res) => {
  try {
    const { moduleId, lessonId } = req.params;

    const existing = await pool.query(
      "SELECT video_file_id, pdf_file_id, ppt_file_id FROM lessons WHERE id = $1 AND module_id = $2",
      [lessonId, moduleId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (existing.rows[0].video_file_id) await deleteLmsFile(existing.rows[0].video_file_id);
    if (existing.rows[0].pdf_file_id) await deleteLmsFile(existing.rows[0].pdf_file_id);
    if (existing.rows[0].ppt_file_id) await deleteLmsFile(existing.rows[0].ppt_file_id);

    await pool.query("DELETE FROM lessons WHERE id = $1", [lessonId]);

    res.status(200).json({
      success: true,
      message: "Lesson removed",
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
 * PUT /api/admin/modules/:moduleId/lessons/reorder
 * body: { lesson_ids: [] }
 */
const reorderLessons = async (req, res) => {
  const client = await pool.connect();

  try {
    const { moduleId } = req.params;
    const { lesson_ids = [] } = req.body;

    await client.query("BEGIN");

    for (let i = 0; i < lesson_ids.length; i++) {
      await client.query(
        "UPDATE lessons SET position = $1 WHERE id = $2 AND module_id = $3",
        [i, lesson_ids[i], moduleId]
      );
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Lessons reordered",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/lessons/video/:fileId — proxy stream for uploaded videos
 */
const getLessonVideo = async (req, res) => {
  try {
    const { fileId } = req.params;
    const driveRes = await getLmsFileStream(fileId);

    res.setHeader("Content-Type", driveRes.headers["content-type"] || "video/mp4");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    driveRes.data
      .on("error", (err) => {
        console.error("Lesson video stream error:", err.message);
        if (!res.headersSent) res.sendStatus(404);
      })
      .pipe(res);
  } catch (error) {
    console.error("Get Lesson Video Error:", error.response?.data || error.message);
    res.status(404).send("Video not found");
  }
};

/**
 * GET /api/lessons/pdf/:fileId — proxy stream for uploaded PDFs
 */
const getLessonPdf = async (req, res) => {
  try {
    const { fileId } = req.params;
    const driveRes = await getLmsFileStream(fileId);

    res.setHeader("Content-Type", driveRes.headers["content-type"] || "application/pdf");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    driveRes.data
      .on("error", (err) => {
        console.error("Lesson PDF stream error:", err.message);
        if (!res.headersSent) res.sendStatus(404);
      })
      .pipe(res);
  } catch (error) {
    console.error("Get Lesson PDF Error:", error.response?.data || error.message);
    res.status(404).send("PDF not found");
  }
};

/**
 * GET /api/lessons/ppt/:fileId — proxy stream for uploaded PPT/PPTX files
 */
const getLessonPpt = async (req, res) => {
  try {
    const { fileId } = req.params;
    const driveRes = await getLmsFileStream(fileId);

    res.setHeader(
      "Content-Type",
      driveRes.headers["content-type"] || "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    driveRes.data
      .on("error", (err) => {
        console.error("Lesson PPT stream error:", err.message);
        if (!res.headersSent) res.sendStatus(404);
      })
      .pipe(res);
  } catch (error) {
    console.error("Get Lesson PPT Error:", error.response?.data || error.message);
    res.status(404).send("PPT not found");
  }
};

module.exports = {
  getLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getLessonVideo,
  getLessonPdf,
  getLessonPpt,
};
