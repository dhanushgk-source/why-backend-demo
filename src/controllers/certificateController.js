const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { sendCertificateEmail } = require("../services/mailService");

async function getStudentId(userId) {
  const result = await pool.query(
    "SELECT id FROM students WHERE user_id = $1",
    [userId]
  );
  return result.rows[0]?.id || null;
}

/**
  * Helper to check course progress and issue certificate if 100% completed.
  */
async function checkAndIssueCertificate(studentId, trainingId) {
  try {
    const totalLessonsRes = await pool.query(
      `
      SELECT COUNT(l.id)::int AS total
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE m.training_id = $1
      `,
      [trainingId]
    );
    const totalLessons = totalLessonsRes.rows[0]?.total || 0;
    if (totalLessons === 0) return { issued: false };

    const completedLessonsRes = await pool.query(
      `
      SELECT COUNT(lp.id)::int AS completed
      FROM lesson_progress lp
      JOIN lessons l ON l.id = lp.lesson_id
      JOIN modules m ON m.id = l.module_id
      WHERE m.training_id = $1 AND lp.student_id = $2 AND lp.status = 'completed'
      `,
      [trainingId, studentId]
    );
    const completedLessons = completedLessonsRes.rows[0]?.completed || 0;

    if (completedLessons < totalLessons) {
      return { issued: false, completedLessons, totalLessons };
    }

    // Check if certificate already exists
    const existing = await pool.query(
      "SELECT id, certificate_number FROM certificates WHERE student_id = $1 AND training_id = $2",
      [studentId, trainingId]
    );

    if (existing.rows.length > 0) {
      return {
        issued: true,
        certificateId: existing.rows[0].id,
        certificateNumber: existing.rows[0].certificate_number,
        alreadyIssued: true,
      };
    }

    // Issue new certificate
    const certificateId = uuidv4();
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const certificateNumber = `CERT-WHY-${Date.now().toString(36).toUpperCase()}-${suffix}`;

    await pool.query(
      `
      INSERT INTO certificates (id, student_id, training_id, certificate_number, issued_at)
      VALUES ($1, $2, $3, $4, NOW())
      `,
      [certificateId, studentId, trainingId, certificateNumber]
    );

    // Send email asynchronously
    notifyCertificateIssued({ studentId, trainingId, certificateId, certificateNumber });

    return {
      issued: true,
      certificateId,
      certificateNumber,
      alreadyIssued: false,
    };
  } catch (error) {
    console.error("⚠️ Error checking/issuing certificate:", error.message);
    return { issued: false, error: error.message };
  }
}

async function notifyCertificateIssued({ studentId, trainingId, certificateId, certificateNumber }) {
  try {
    const studentRes = await pool.query("SELECT full_name, email FROM students WHERE id = $1", [studentId]);
    const trainingRes = await pool.query("SELECT title FROM training_programs WHERE id = $1", [trainingId]);

    const student = studentRes.rows[0];
    const training = trainingRes.rows[0];

    if (student && training) {
      await sendCertificateEmail({
        to: student.email,
        fullName: student.full_name,
        courseName: training.title,
        certificateId,
        certificateNumber,
      });
    }
  } catch (err) {
    console.error("⚠️ Failed to send certificate email:", err.message);
  }
}

/**
 * GET /api/certificates/my
 */
const getMyCertificates = async (req, res) => {
  try {
    const studentId = await getStudentId(req.user.id);
    if (!studentId) {
      return res.status(200).json({ success: true, certificates: [] });
    }

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.certificate_number,
        c.issued_at,
        tp.id AS training_id,
        tp.title AS course_title,
        tp.description AS course_description,
        tp.category AS course_category,
        tp.thumbnail_url AS course_cover
      FROM certificates c
      JOIN training_programs tp ON tp.id = c.training_id
      WHERE c.student_id = $1
      ORDER BY c.issued_at DESC
      `,
      [studentId]
    );

    res.status(200).json({
      success: true,
      certificates: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/certificates/:id
 */
const getCertificateById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.certificate_number,
        c.issued_at,
        s.full_name AS student_name,
        s.email AS student_email,
        s.department AS student_department,
        tp.id AS training_id,
        tp.title AS course_title,
        tp.category AS course_category,
        tp.description AS course_description
      FROM certificates c
      JOIN students s ON s.id = c.student_id
      JOIN training_programs tp ON tp.id = c.training_id
      WHERE c.id = $1 OR c.certificate_number = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    res.status(200).json({
      success: true,
      certificate: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/admin/students/:studentId/certificates
 */
const getStudentCertificatesAdmin = async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.certificate_number,
        c.issued_at,
        tp.title AS course_title,
        tp.category AS course_category
      FROM certificates c
      JOIN training_programs tp ON tp.id = c.training_id
      WHERE c.student_id = $1
      ORDER BY c.issued_at DESC
      `,
      [studentId]
    );

    res.status(200).json({
      success: true,
      certificates: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

async function runCertificatesMigration() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id UUID PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        training_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
        certificate_number TEXT UNIQUE NOT NULL,
        issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (student_id, training_id)
      );
      CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
      CREATE INDEX IF NOT EXISTS idx_certificates_training ON certificates(training_id);
    `);
    console.log("✅ Certificates table verified in DB.");
  } catch (err) {
    console.error("⚠️ Certificates migration error:", err.message);
  }
}

module.exports = {
  runCertificatesMigration,
  checkAndIssueCertificate,
  getMyCertificates,
  getCertificateById,
  getStudentCertificatesAdmin,
};
