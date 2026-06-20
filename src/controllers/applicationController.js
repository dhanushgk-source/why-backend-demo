const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const applyJob = async (req, res) => {
  try {

    const { jobId, resumeUrl } = req.body;

    const userId = req.user.id;

    const existing = await pool.query(
      `
      SELECT *
      FROM applications
      WHERE user_id = $1
      AND job_id = $2
      `,
      [userId, jobId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Already applied"
      });
    }

    await pool.query(
      `
      INSERT INTO applications
      (
        id,
        user_id,
        job_id,
        resume_url
      )
      VALUES
      ($1,$2,$3,$4)
      `,
      [
        uuidv4(),
        userId,
        jobId,
        resumeUrl
      ]
    );

    res.status(201).json({
      success: true,
      message: "Application submitted"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};

const getMyApplications = async (req, res) => {

  try {

    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
      a.*,
      j.title,
      j.location,
      j.department
      FROM applications a
      JOIN jobs j
      ON a.job_id = j.id
      WHERE a.user_id = $1
      ORDER BY a.applied_at DESC
      `,
      [userId]
    );

    res.status(200).json({
      success: true,
      applications: result.rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};


module.exports = {
  applyJob,
  getMyApplications,
};

