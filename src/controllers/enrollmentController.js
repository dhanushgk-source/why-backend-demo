const pool = require("../config/db");
const { randomUUID: uuidv4 } = require("crypto");
const { sendEnrollmentEmail } = require("../services/mailService");

/**
 * GET /api/admin/students/:studentId/trainings
 */
const getStudentEnrollments = async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      "SELECT training_id FROM enrollments WHERE student_id = $1",
      [studentId]
    );

    res.status(200).json({
      success: true,
      training_ids: result.rows.map((r) => r.training_id),
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
 * PUT /api/admin/students/:studentId/trainings
 * body: { training_ids: [] } — replaces the full set for this student.
 */
const setStudentEnrollments = async (req, res) => {
  const client = await pool.connect();

  try {
    const { studentId } = req.params;
    const { training_ids = [] } = req.body;

    await client.query("BEGIN");

    const previous = await client.query(
      "SELECT training_id FROM enrollments WHERE student_id = $1",
      [studentId]
    );
    const previousIds = new Set(previous.rows.map((r) => r.training_id));
    const newlyAddedIds = training_ids.filter((tId) => !previousIds.has(tId));

    await client.query("DELETE FROM enrollments WHERE student_id = $1", [studentId]);

    for (const trainingId of training_ids) {
      await client.query(
        `
        INSERT INTO enrollments (id, student_id, training_id)
        VALUES ($1,$2,$3)
        ON CONFLICT (student_id, training_id) DO NOTHING
        `,
        [uuidv4(), studentId, trainingId]
      );
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Assignments updated",
    });

    // Fire enrollment confirmation emails only for trainings that weren't
    // already assigned, so re-saving the same assignment list doesn't
    // re-notify the student. Runs after the response so it never delays it.
    if (newlyAddedIds.length > 0) {
      notifyNewEnrollments({ studentId, trainingIds: newlyAddedIds });
    }
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
 * Looks up the student and each newly-assigned training, then sends one
 * enrollment confirmation email per training. Any failure is logged only —
 * this never throws back into the request/response cycle.
 */
async function notifyNewEnrollments({ studentId, trainingIds }) {
  try {
    const studentResult = await pool.query(
      "SELECT full_name, email FROM students WHERE id = $1",
      [studentId]
    );
    const student = studentResult.rows[0];
    if (!student) return;

    const trainingsResult = await pool.query(
      "SELECT title FROM training_programs WHERE id = ANY($1::uuid[])",
      [trainingIds]
    );

    for (const training of trainingsResult.rows) {
      try {
        await sendEnrollmentEmail({
          to: student.email,
          fullName: student.full_name,
          courseName: training.title,
        });
      } catch (emailError) {
        console.error(`⚠️ Failed to send enrollment email to ${student.email}:`, emailError.message);
      }
    }
  } catch (error) {
    console.error("⚠️ Failed to look up data for enrollment emails:", error.message);
  }
}

/**
 * GET /api/admin/trainings/:trainingId/students
 */
const getTrainingEnrollments = async (req, res) => {
  try {
    const { trainingId } = req.params;

    const result = await pool.query(
      "SELECT student_id FROM enrollments WHERE training_id = $1",
      [trainingId]
    );

    res.status(200).json({
      success: true,
      student_ids: result.rows.map((r) => r.student_id),
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
 * PUT /api/admin/trainings/:trainingId/students
 * body: { student_ids: [] } — replaces the full set for this training.
 */
const setTrainingEnrollments = async (req, res) => {
  const client = await pool.connect();

  try {
    const { trainingId } = req.params;
    const { student_ids = [] } = req.body;

    await client.query("BEGIN");

    const previous = await client.query(
      "SELECT student_id FROM enrollments WHERE training_id = $1",
      [trainingId]
    );
    const previousIds = new Set(previous.rows.map((r) => r.student_id));
    const newlyAddedIds = student_ids.filter((sId) => !previousIds.has(sId));

    await client.query("DELETE FROM enrollments WHERE training_id = $1", [trainingId]);

    for (const studentId of student_ids) {
      await client.query(
        `
        INSERT INTO enrollments (id, student_id, training_id)
        VALUES ($1,$2,$3)
        ON CONFLICT (student_id, training_id) DO NOTHING
        `,
        [uuidv4(), studentId, trainingId]
      );
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Assignments updated",
    });

    // Same non-blocking pattern as setStudentEnrollments — only email
    // students who are newly assigned to this training.
    if (newlyAddedIds.length > 0) {
      notifyNewStudents({ trainingId, studentIds: newlyAddedIds });
    }
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
 * Looks up the training and each newly-assigned student, then sends one
 * enrollment confirmation email per student. Any failure is logged only —
 * this never throws back into the request/response cycle.
 */
async function notifyNewStudents({ trainingId, studentIds }) {
  try {
    const trainingResult = await pool.query(
      "SELECT title FROM training_programs WHERE id = $1",
      [trainingId]
    );
    const training = trainingResult.rows[0];
    if (!training) return;

    const studentsResult = await pool.query(
      "SELECT full_name, email FROM students WHERE id = ANY($1::uuid[])",
      [studentIds]
    );

    for (const student of studentsResult.rows) {
      try {
        await sendEnrollmentEmail({
          to: student.email,
          fullName: student.full_name,
          courseName: training.title,
        });
      } catch (emailError) {
        console.error(`⚠️ Failed to send enrollment email to ${student.email}:`, emailError.message);
      }
    }
  } catch (error) {
    console.error("⚠️ Failed to look up data for enrollment emails:", error.message);
  }
}

module.exports = {
  getStudentEnrollments,
  setStudentEnrollments,
  getTrainingEnrollments,
  setTrainingEnrollments,
};
