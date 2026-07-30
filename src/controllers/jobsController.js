const pool = require("../config/db");

const getAllJobs = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM jobs
      WHERE is_active = true
      ORDER BY created_at DESC
      `
    );

    res.status(200).json({
      success: true,
      jobs: result.rows,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM jobs
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      job: result.rows[0],
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
  getAllJobs,
  getJobById,
};