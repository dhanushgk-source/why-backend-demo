const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

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

module.exports = {
  getStudentEnrollments,
  setStudentEnrollments,
  getTrainingEnrollments,
  setTrainingEnrollments,
};
