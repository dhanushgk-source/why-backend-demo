const pool = require("../config/db");
const { randomUUID: uuidv4 } = require("crypto");

const createJob = async (req, res) => {

  try {

    const {
      title,
      department,
      location,
      employment_type,
      experience,
      salary,
      description,
      requirements
    } = req.body;

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO jobs
      (
        id,
        title,
        department,
        location,
        employment_type,
        experience,
        salary,
        description,
        requirements
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        id,
        title,
        department,
        location,
        employment_type,
        experience,
        salary,
        description,
        requirements
      ]
    );

    res.status(201).json({
      success: true,
      message: "Job created"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};


const updateJob = async (req, res) => {

  try {

    const { id } = req.params;

    const {
      title,
      department,
      location,
      employment_type,
      experience,
      salary,
      description,
      requirements
    } = req.body;

    await pool.query(
      `
      UPDATE jobs
      SET
      title=$1,
      department=$2,
      location=$3,
      employment_type=$4,
      experience=$5,
      salary=$6,
      description=$7,
      requirements=$8
      WHERE id=$9
      `,
      [
        title,
        department,
        location,
        employment_type,
        experience,
        salary,
        description,
        requirements,
        id
      ]
    );

    res.status(200).json({
      success: true,
      message: "Job updated"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};


const deleteJob = async (req, res) => {

  try {

    const { id } = req.params;

    await pool.query(
      `
      UPDATE jobs
      SET is_active = false
      WHERE id = $1
      `,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Job removed"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};


const getAllApplications = async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
      a.*,
      u.full_name,
      u.email,
      j.title
      FROM applications a
      JOIN users u ON a.user_id = u.id
      JOIN jobs j ON a.job_id = j.id
      ORDER BY a.applied_at DESC
      `
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


const updateApplicationStatus = async (req, res) => {

  try {

    const { id } = req.params;

    const { status } = req.body;

    await pool.query(
      `
      UPDATE applications
      SET status = $1
      WHERE id = $2
      `,
      [status, id]
    );

    res.status(200).json({
      success: true,
      message: "Status updated"
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
  createJob,
  updateJob,
  deleteJob,
  getAllApplications,
  updateApplicationStatus
};