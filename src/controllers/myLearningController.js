const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Every route here is mounted behind `authenticate` (see myLearningRoutes.js),
// so req.user.id is always a valid users.id. But not every logged-in user is
// necessarily a provisioned student (self-registered applicants, admins,
// etc. aren't) — resolve that mapping once and reuse it everywhere below.
async function getStudentId(userId) {
  const result = await pool.query(
    "SELECT id FROM students WHERE user_id = $1",
    [userId]
  );
  return result.rows[0]?.id || null;
}

/**
 * GET /api/me/trainings
 * Lists the trainings the current student is enrolled in, with a progress
 * rollup and the lesson they should resume on.
 *
 * A logged-in user who isn't a provisioned student yet (e.g. self-registered
 * via the public form, awaiting an admin to assign them courses) gets an
 * empty list with isStudent: false rather than an error, so the UI can show
 * a friendly "no courses yet" state instead of breaking.
 */
const getMyTrainings = async (req, res) => {
  try {
    const studentId = await getStudentId(req.user.id);

    if (!studentId) {
      return res.status(200).json({ success: true, isStudent: false, trainings: [] });
    }

    // Every lesson across the student's enrolled trainings, in course order,
    // with its progress status — used to both roll up counts and figure out
    // the resume lesson per training.
    const lessonsResult = await pool.query(
      `
      SELECT
        tp.id AS training_id,
        tp.title,
        tp.description,
        tp.thumbnail_url,
        l.id AS lesson_id,
        m.position AS module_position,
        l.position AS lesson_position,
        COALESCE(lp.status, 'not_started') AS status
      FROM enrollments e
      JOIN training_programs tp ON tp.id = e.training_id
      JOIN modules m ON m.training_id = tp.id
      JOIN lessons l ON l.module_id = m.id
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
      WHERE e.student_id = $1
      ORDER BY tp.created_at DESC, m.position ASC, l.position ASC
      `,
      [studentId]
    );

    const byTraining = new Map();
    for (const row of lessonsResult.rows) {
      if (!byTraining.has(row.training_id)) {
        byTraining.set(row.training_id, {
          id: row.training_id,
          title: row.title,
          description: row.description,
          coverImage: row.thumbnail_url,
          totalLessons: 0,
          completedLessons: 0,
          resumeLessonId: null,
          _firstLessonId: null,
        });
      }
      const t = byTraining.get(row.training_id);
      t.totalLessons += 1;
      if (row.status === "completed") t.completedLessons += 1;
      if (!t._firstLessonId) t._firstLessonId = row.lesson_id;
      if (!t.resumeLessonId && row.status !== "completed") {
        t.resumeLessonId = row.lesson_id;
      }
    }

    // Enrolled trainings with zero lessons still show up (thanks to a
    // separate query) so admins see them appear even before content is added.
    const trainingsOnlyResult = await pool.query(
      `
      SELECT tp.id, tp.title, tp.description, tp.thumbnail_url, tp.created_at
      FROM enrollments e
      JOIN training_programs tp ON tp.id = e.training_id
      WHERE e.student_id = $1
      ORDER BY tp.created_at DESC
      `,
      [studentId]
    );

    const trainings = trainingsOnlyResult.rows.map((row) => {
      const withLessons = byTraining.get(row.id);
      if (withLessons) {
        // All lessons completed → resume means "review from the start".
        if (!withLessons.resumeLessonId) {
          withLessons.resumeLessonId = withLessons._firstLessonId;
        }
        delete withLessons._firstLessonId;
        return withLessons;
      }
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        coverImage: row.thumbnail_url,
        totalLessons: 0,
        completedLessons: 0,
        resumeLessonId: null,
      };
    });

    res.status(200).json({ success: true, isStudent: true, trainings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/me/trainings/:trainingId/tree
 * The module → lesson tree for the sidebar, with per-lesson status.
 */
const getMyTrainingTree = async (req, res) => {
  try {
    const { trainingId } = req.params;
    const studentId = await getStudentId(req.user.id);

    if (!studentId) {
      return res.status(403).json({ success: false, message: "Not a student account" });
    }

    const enrolled = await pool.query(
      "SELECT 1 FROM enrollments WHERE student_id = $1 AND training_id = $2",
      [studentId, trainingId]
    );
    if (enrolled.rows.length === 0) {
      return res.status(403).json({ success: false, message: "You're not enrolled in this course" });
    }

    const trainingResult = await pool.query(
      "SELECT id, title FROM training_programs WHERE id = $1",
      [trainingId]
    );
    if (trainingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const rows = await pool.query(
      `
      SELECT
        m.id AS module_id, m.title AS module_title, m.position AS module_position,
        l.id AS lesson_id, l.title AS lesson_title, l.content_type,
        l.duration_minutes, l.position AS lesson_position,
        COALESCE(lp.status, 'not_started') AS status
      FROM modules m
      JOIN lessons l ON l.module_id = m.id
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
      WHERE m.training_id = $2
      ORDER BY m.position ASC, l.position ASC
      `,
      [studentId, trainingId]
    );

    const modulesById = new Map();
    for (const row of rows.rows) {
      if (!modulesById.has(row.module_id)) {
        modulesById.set(row.module_id, {
          id: row.module_id,
          title: row.module_title,
          lessons: [],
        });
      }
      modulesById.get(row.module_id).lessons.push({
        id: row.lesson_id,
        title: row.lesson_title,
        type: row.content_type, // 'video' | 'pdf' | 'ppt' | 'notes'
        durationMinutes: row.duration_minutes,
        status: row.status,
      });
    }

    res.status(200).json({
      success: true,
      courseId: trainingId,
      title: trainingResult.rows[0].title,
      modules: Array.from(modulesById.values()),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/me/lessons/:lessonId
 * Lesson content + neighbors (prev/next across the whole course, spanning
 * module boundaries) + this student's saved progress.
 */
const getMyLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const studentId = await getStudentId(req.user.id);

    if (!studentId) {
      return res.status(403).json({ success: false, message: "Not a student account" });
    }

    const lessonResult = await pool.query(
      `
      SELECT l.*, m.training_id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.id = $1
      `,
      [lessonId]
    );
    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }
    const lesson = lessonResult.rows[0];

    const enrolled = await pool.query(
      "SELECT 1 FROM enrollments WHERE student_id = $1 AND training_id = $2",
      [studentId, lesson.training_id]
    );
    if (enrolled.rows.length === 0) {
      return res.status(403).json({ success: false, message: "You're not enrolled in this course" });
    }

    const orderedResult = await pool.query(
      `
      SELECT l2.id
      FROM modules m2
      JOIN lessons l2 ON l2.module_id = m2.id
      WHERE m2.training_id = $1
      ORDER BY m2.position ASC, l2.position ASC
      `,
      [lesson.training_id]
    );
    const orderedIds = orderedResult.rows.map((r) => r.id);
    const idx = orderedIds.indexOf(lessonId);

    const progressResult = await pool.query(
      "SELECT status, last_page FROM lesson_progress WHERE student_id = $1 AND lesson_id = $2",
      [studentId, lessonId]
    );
    const progress = progressResult.rows[0] || { status: "not_started", last_page: null };

    res.status(200).json({
      success: true,
      lesson: {
        id: lesson.id,
        courseId: lesson.training_id,
        moduleId: lesson.module_id,
        title: lesson.title,
        description: lesson.description,
        type: lesson.content_type,
        durationMinutes: lesson.duration_minutes,
        videoUrl: lesson.video_url,
        videoFileId: lesson.video_file_id,
        pdfUrl: lesson.pdf_url,
        pdfFileId: lesson.pdf_file_id,
        pdfName: lesson.pdf_name,
        pptUrl: lesson.ppt_url,
        pptFileId: lesson.ppt_file_id,
        pptName: lesson.ppt_name,
        notesContent: lesson.notes_content,
        prevLessonId: idx > 0 ? orderedIds[idx - 1] : null,
        nextLessonId: idx >= 0 && idx < orderedIds.length - 1 ? orderedIds[idx + 1] : null,
      },
      progress: {
        status: progress.status,
        lastPage: progress.last_page,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * PUT /api/me/lessons/:lessonId/progress
 * body: { status: 'in_progress' | 'completed', lastPage?: number }
 */
const updateMyLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { status, lastPage } = req.body;
    const studentId = await getStudentId(req.user.id);

    if (!studentId) {
      return res.status(403).json({ success: false, message: "Not a student account" });
    }
    if (!["in_progress", "completed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const lessonResult = await pool.query(
      `
      SELECT m.training_id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.id = $1
      `,
      [lessonId]
    );
    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }

    const enrolled = await pool.query(
      "SELECT 1 FROM enrollments WHERE student_id = $1 AND training_id = $2",
      [studentId, lessonResult.rows[0].training_id]
    );
    if (enrolled.rows.length === 0) {
      return res.status(403).json({ success: false, message: "You're not enrolled in this course" });
    }

    await pool.query(
      `
      INSERT INTO lesson_progress (id, student_id, lesson_id, status, last_page, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT (student_id, lesson_id)
      DO UPDATE SET status = $4, last_page = $5, updated_at = NOW()
      `,
      [uuidv4(), studentId, lessonId, status, lastPage ?? null]
    );

    let certificateInfo = null;
    if (status === "completed") {
      const { checkAndIssueCertificate } = require("./certificateController");
      certificateInfo = await checkAndIssueCertificate(studentId, lessonResult.rows[0].training_id);
    }

    res.status(200).json({
      success: true,
      certificate: certificateInfo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  getMyTrainings,
  getMyTrainingTree,
  getMyLesson,
  updateMyLessonProgress,
};
