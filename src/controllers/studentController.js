const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

function generateTempPassword() {
  // 10-char readable temp password, e.g. "K3F9-QZ2M"
  return crypto.randomBytes(6).toString("hex").slice(0, 10);
}

/**
 * GET /api/students
 */
const getAllStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, full_name, email, phone, employee_id, department, status, created_at, updated_at
      FROM students
      ORDER BY created_at DESC
      `
    );

    res.status(200).json({
      success: true,
      students: result.rows,
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
 * GET /api/students/:id
 */
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT id, full_name, email, phone, employee_id, department, status, created_at, updated_at
      FROM students
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      student: result.rows[0],
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
 * POST /api/admin/students
 * Creates a `users` row (role: student, temp password) plus the `students` row.
 */
const createStudent = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      full_name,
      email,
      phone,
      employee_id,
      department,
      status,
    } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await client.query("BEGIN");

    const userId = uuidv4();
    await client.query(
      `
      INSERT INTO users
      (id, full_name, email, phone, password_hash, role)
      VALUES ($1,$2,$3,$4,$5,'student')
      `,
      [userId, full_name, email, phone || null, passwordHash]
    );

    const studentId = uuidv4();
    await client.query(
      `
      INSERT INTO students
      (id, user_id, full_name, email, phone, employee_id, department, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        studentId,
        userId,
        full_name,
        email,
        phone || null,
        employee_id || null,
        department || null,
        status || "active",
      ]
    );

    await client.query("COMMIT");

    // TODO: wire up an email service and send `tempPassword` to the student.
    console.log(`Temp password for ${email}: ${tempPassword}`);

    res.status(201).json({
      success: true,
      message: "Student created",
      tempPassword,
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
 * PUT /api/admin/students/:id
 */
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      full_name,
      email,
      phone,
      employee_id,
      department,
      status,
    } = req.body;

    const existing = await pool.query(
      "SELECT user_id FROM students WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    await pool.query(
      `
      UPDATE students
      SET
        full_name=$1,
        email=$2,
        phone=$3,
        employee_id=$4,
        department=$5,
        status=$6,
        updated_at=NOW()
      WHERE id=$7
      `,
      [full_name, email, phone || null, employee_id || null, department || null, status, id]
    );

    // Keep the linked login record's name/email in sync.
    await pool.query(
      `
      UPDATE users
      SET full_name=$1, email=$2, phone=$3
      WHERE id=$4
      `,
      [full_name, email, phone || null, existing.rows[0].user_id]
    );

    res.status(200).json({
      success: true,
      message: "Student updated",
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
 * DELETE /api/admin/students/:id
 * Hard delete — also removes the linked login (`users`) row, which cascades
 * to the student's enrollments.
 */
const archiveStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT user_id FROM students WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // students row cascades on delete when its users row is removed
    await pool.query("DELETE FROM users WHERE id = $1", [existing.rows[0].user_id]);

    res.status(200).json({
      success: true,
      message: "Student removed",
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
 * PATCH /api/admin/students/:id/status
 */
const setStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'inactive'",
      });
    }

    const result = await pool.query(
      `
      UPDATE students
      SET status=$1, updated_at=NOW()
      WHERE id=$2
      `,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Status updated",
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
 * POST /api/admin/students/:id/reset-password
 */
const resetStudentPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT user_id, email FROM students WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [passwordHash, existing.rows[0].user_id]
    );

    // TODO: wire up an email service and send `tempPassword` to the student.
    console.log(`New temp password for ${existing.rows[0].email}: ${tempPassword}`);

    res.status(200).json({
      success: true,
      message: "Password reset",
      tempPassword,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  archiveStudent,
  setStudentStatus,
  resetStudentPassword,
};
