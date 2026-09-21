const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { createSetupToken } = require("../utils/accountSetupToken");
const { sendAccountSetupEmail, sendPasswordResetEmail } = require("../services/mailService");

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
 *
 * If the email already belongs to a `users` row that isn't a provisioned
 * student yet (e.g. it self-registered through the public site and only
 * ever got a generic account), this promotes that existing row into a
 * student instead of failing — the previous behavior blocked admins from
 * ever adding a student whose email had touched the public register form.
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

    const existingUser = await client.query(
      "SELECT id, role FROM users WHERE email = $1",
      [email]
    );

    let userId;
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await client.query("BEGIN");

    if (existingUser.rows.length > 0) {
      const existingUserId = existingUser.rows[0].id;
      const existingRole = existingUser.rows[0].role;

      if (existingRole === "admin") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "This email belongs to an admin account and can't be added as a student",
        });
      }

      const existingStudent = await client.query(
        "SELECT id FROM students WHERE user_id = $1",
        [existingUserId]
      );

      if (existingStudent.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      // Promote: this user row exists (e.g. self-registered via the public
      // site) but was never provisioned as a student. Reuse it — refresh
      // its login details/password and turn it into a student account.
      userId = existingUserId;
      await client.query(
        `
        UPDATE users
        SET full_name=$1, phone=$2, password_hash=$3, role='student'
        WHERE id=$4
        `,
        [full_name, phone || null, passwordHash, userId]
      );
    } else {
      userId = uuidv4();
      await client.query(
        `
        INSERT INTO users
        (id, full_name, email, phone, password_hash, role)
        VALUES ($1,$2,$3,$4,$5,'student')
        `,
        [userId, full_name, email, phone || null, passwordHash]
      );
    }

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

    console.log(`Temp password for ${email}: ${tempPassword}`);

    // Email is sent only after the student record is fully committed, and
    // never blocks or alters the API response below. The password itself
    // is never emailed — only a token-based set-password link, using the
    // existing account-setup token mechanism.
    try {
      const rawToken = await createSetupToken(userId, "set_password");
      await sendAccountSetupEmail({ to: email, fullName: full_name, rawToken });
    } catch (emailError) {
      console.error(`⚠️ Failed to send account setup email to ${email}:`, emailError.message);
    }

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
      "SELECT user_id, email, full_name FROM students WHERE id = $1",
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

    console.log(`New temp password for ${existing.rows[0].email}: ${tempPassword}`);

    // Same non-blocking pattern as account creation — the password is
    // never emailed, only a token-based reset link.
    try {
      const rawToken = await createSetupToken(existing.rows[0].user_id, "reset_password");
      await sendPasswordResetEmail({
        to: existing.rows[0].email,
        fullName: existing.rows[0].full_name,
        rawToken,
      });
    } catch (emailError) {
      console.error(`⚠️ Failed to send password reset email to ${existing.rows[0].email}:`, emailError.message);
    }

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

/**
 * POST /api/admin/students/:id/resend-setup-email
 */
const resendStudentSetupEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT user_id, email, full_name FROM students WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!process.env.BREVO_API_KEY && (!process.env.SMTP_HOST && !process.env.SMTP_USER && !process.env.SMTP_PASS)) {
      console.warn("⚠️ Neither BREVO_API_KEY nor SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are set.");
      return res.status(500).json({
        success: false,
        message: "Email provider is not configured on backend server. Please set BREVO_API_KEY or SMTP credentials on Render.",
      });
    }

    const rawToken = await createSetupToken(existing.rows[0].user_id, "set_password");
    await sendAccountSetupEmail({
      to: existing.rows[0].email,
      fullName: existing.rows[0].full_name,
      rawToken,
    });

    res.status(200).json({
      success: true,
      message: "Setup email sent",
    });
  } catch (error) {
    console.error("⚠️ Failed to resend setup email:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send setup email",
    });
  }
};

/**
 * PUT /api/admin/students/:id/approve
 */
const approveStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const studentResult = await pool.query(
      "UPDATE students SET status = 'active' WHERE id = $1 RETURNING *",
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const student = studentResult.rows[0];

    // Fetch enrolled course titles
    const coursesRes = await pool.query(
      `
      SELECT tp.title
      FROM enrollments e
      JOIN training_programs tp ON tp.id = e.training_id
      WHERE e.student_id = $1
      `,
      [id]
    );
    const courseNames = coursesRes.rows.map((r) => r.title);

    try {
      const { sendEnrollmentEmail } = require("../services/mailService");
      await sendEnrollmentEmail({
        to: student.email,
        fullName: student.full_name,
        courseName: courseNames.join(", ") || "Your Training Course",
      });
    } catch (err) {
      console.error("⚠️ Failed to send approval email:", err.message);
    }

    res.status(200).json({
      success: true,
      message: "Student approved and active",
      student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * PUT /api/admin/students/:id/reject
 */
const rejectStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE students SET status = 'rejected' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.status(200).json({
      success: true,
      message: "Student registration rejected",
      student: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
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
  resendStudentSetupEmail,
  approveStudent,
  rejectStudent,
};

