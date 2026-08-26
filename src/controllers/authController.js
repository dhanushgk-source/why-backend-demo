const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
    

// 1. Careers / Job Applicant Registration - Instant Happy Path (No Admin Approval Required)
const register = async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body;

    // If request contains student-specific fields or explicit student role, route to student registration
    if (req.body.department || req.body.courseIds || role === "student") {
      return registerStudent(req, res);
    }

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // Check existing email
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = "applicant";

    // Insert user as applicant
    await pool.query(
      `
      INSERT INTO users (id, full_name, email, phone, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [userId, fullName, email, phone || null, hashedPassword, assignedRole]
    );

    const token = jwt.sign(
      {
        id: userId,
        email: email,
        role: assignedRole,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        fullName: fullName,
        email: email,
        phone: phone || null,
        role: assignedRole,
      },
      message: "Account created successfully! You can now apply for jobs.",
    });

  } catch (error) {
    console.error("Error in register:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// 2. LMS Student Registration - Requires Admin Approval
const registerStudent = async (req, res) => {
  try {
    const { fullName, email, phone, department, password, courseIds } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // Check existing email
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const userId = uuidv4();
    const studentId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user with role 'student'
    await pool.query(
      `
      INSERT INTO users (id, full_name, email, phone, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, 'student')
      `,
      [userId, fullName, email, phone || null, hashedPassword]
    );

    // Insert student with pending_approval status
    await pool.query(
      `
      INSERT INTO students (id, user_id, full_name, email, phone, department, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending_approval')
      `,
      [studentId, userId, fullName, email, phone || null, department || null]
    );

    // Enroll in requested courses
    if (Array.isArray(courseIds) && courseIds.length > 0) {
      for (const trainingId of courseIds) {
        await pool.query(
          `
          INSERT INTO enrollments (id, student_id, training_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (student_id, training_id) DO NOTHING
          `,
          [uuidv4(), studentId, trainingId]
        );
      }
    }

    return res.status(201).json({
      success: true,
      pendingApproval: true,
      message: "Registration submitted successfully! Your account and course requests are pending admin approval.",
    });

  } catch (error) {
    console.error("Error in registerStudent:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required"
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact Super Admin.",
      });
    }

    if (user.role === "student") {
      const studentResult = await pool.query(
        "SELECT status FROM students WHERE user_id = $1",
        [user.id]
      );

      const status = studentResult.rows[0]?.status;

      if (status === "pending_approval") {
        return res.status(403).json({
          success: false,
          pendingApproval: true,
          message: "Your registration is currently pending admin approval. You will receive an email once approved."
        });
      }

      if (status === "inactive" || status === "rejected") {
        return res.status(403).json({
          success: false,
          message: "This account has been deactivated or rejected. Contact support."
        });
      }
    }

    let permissions = user.permissions;
    if (typeof permissions === "string") {
      try { permissions = JSON.parse(permissions); } catch { permissions = []; }
    }
    if (!Array.isArray(permissions)) permissions = [];
    if (user.role === "super_admin" || (user.role === "admin" && permissions.length === 0)) {
      permissions = ["*"];
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status || "active",
        permissions: permissions,
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const userResult = await pool.query(
      "SELECT id, full_name, email FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "If an account exists for this email, a password reset link has been sent.",
      });
    }

    const user = userResult.rows[0];
    const { createSetupToken } = require("../utils/accountSetupToken");
    const { sendPasswordResetEmail } = require("../services/mailService");

    const rawToken = await createSetupToken(user.id, "reset_password");
    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.full_name,
      rawToken,
    });

    return res.status(200).json({
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("⚠️ Error sending forgot password email:", error);
    return res.status(500).json({ success: false, message: "Failed to send password reset link" });
  }
};

const setPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and new password are required" });
    }

    const { verifySetupToken, consumeSetupToken } = require("../utils/accountSetupToken");

    const tokenRow = await verifySetupToken(token);
    if (!tokenRow) {
      return res.status(400).json({
        success: false,
        message: "This link is invalid or has expired. Please request a new link.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      tokenRow.userId,
    ]);

    await consumeSetupToken(tokenRow.id);

    return res.status(200).json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    console.error("Error setting password:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const firebaseAuth = async (req, res) => {
  try {
    const { email, fullName, photoUrl, firebaseUid, phone, department } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required from Google Auth",
      });
    }

    // Check if user exists in database
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      if (user.role === "student") {
        const studentResult = await pool.query(
          "SELECT id, status FROM students WHERE user_id = $1",
          [user.id]
        );

        const student = studentResult.rows[0];
        const status = student?.status;

        if (status === "pending_approval" || status === "pending_verification") {
          return res.status(403).json({
            success: false,
            pendingApproval: true,
            message: "Your Google account is registered and awaiting admin verification. You will be able to log in once an admin approves your profile.",
          });
        }

        if (status === "inactive" || status === "rejected") {
          return res.status(403).json({
            success: false,
            message: "This account has been deactivated or rejected. Please contact your administrator.",
          });
        }
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    }

    // First time Google Sign Up - create new student in pending_approval state
    const userId = uuidv4();
    const studentId = uuidv4();
    const crypto = require("crypto");
    const randomPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    await pool.query(
      `
      INSERT INTO users (id, full_name, email, phone, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, 'student')
      `,
      [userId, fullName || email.split("@")[0], email, phone || null, hashedPassword]
    );

    await pool.query(
      `
      INSERT INTO students (id, user_id, full_name, email, phone, department, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending_approval')
      `,
      [studentId, userId, fullName || email.split("@")[0], email, phone || null, department || null]
    );

    return res.status(201).json({
      success: true,
      pendingApproval: true,
      isNewUser: true,
      message: "Google account registration submitted! Your account is currently awaiting admin verification.",
    });
  } catch (error) {
    console.error("⚠️ Error in firebaseAuth:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during Google Authentication",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, currentPassword, newPassword } = req.body;

    const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = userRes.rows[0];

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is required to set a new password." });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Incorrect current password." });
      }
      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, userId]);
    }

    // Update name and phone
    const updatedRes = await pool.query(
      `
      UPDATE users
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone)
      WHERE id = $3
      RETURNING id, full_name, email, phone, role, status, permissions
      `,
      [fullName || null, phone || null, userId]
    );

    const updatedUser = updatedRes.rows[0];
    let permissions = updatedUser.permissions;
    if (typeof permissions === "string") {
      try { permissions = JSON.parse(permissions); } catch { permissions = []; }
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser.id,
        fullName: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status || "active",
        permissions: Array.isArray(permissions) ? permissions : [],
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  register,
  registerStudent,
  login,
  firebaseAuth,
  forgotPassword,
  setPassword,
  updateProfile,
};