const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const {
  uploadTeamImage,
  deleteTeamImage,
  getTeamImageStream,
} = require("../services/googleDriveTeamService");

/**
 * Create Team Member
 */
const createTeam = async (req, res) => {
  try {
    const {
      name,
      designation,
      department,
      biography,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile image is required.",
      });
    }

    const upload = await uploadTeamImage(req.file);

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO team_members
      (
        id,
        name,
        designation,
        department,
        biography,
        image_url,
        image_file_id
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        id,
        name,
        designation,
        department,
        biography,
        upload.imageUrl,
        upload.fileId,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Team member created successfully.",
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
 * Get All Team Members
 */
const getAllTeam = async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT *
      FROM team_members
      WHERE is_active = true
      ORDER BY created_at DESC
      `
    );

    res.status(200).json({
      success: true,
      team: result.rows,
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
 * Get Team Member By ID
 */
const getTeamById = async (req, res) => {
  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM team_members
      WHERE id=$1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }

    res.status(200).json({
      success: true,
      member: result.rows[0],
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
 * Update Team Member
 */
const updateTeam = async (req, res) => {
  try {

    const { id } = req.params;

    const existing = await pool.query(
      `
      SELECT *
      FROM team_members
      WHERE id=$1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }

    let imageUrl = existing.rows[0].image_url;
    let imageFileId = existing.rows[0].image_file_id;

    if (req.file) {

      if (imageFileId) {
        await deleteTeamImage(imageFileId);
      }

      const upload = await uploadTeamImage(req.file);

      imageUrl = upload.imageUrl;
      imageFileId = upload.fileId;
    }

    const {
      name,
      designation,
      department,
      biography,
    } = req.body;

    await pool.query(
      `
      UPDATE team_members
      SET
      name=$1,
      designation=$2,
      department=$3,
      biography=$4,
      image_url=$5,
      image_file_id=$6,
      updated_at=NOW()
      WHERE id=$7
      `,
      [
        name,
        designation,
        department,
        biography,
        imageUrl,
        imageFileId,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Team member updated successfully.",
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
 * Delete Team Member
 */
const deleteTeam = async (req, res) => {
  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT image_file_id
      FROM team_members
      WHERE id=$1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }

    if (result.rows[0].image_file_id) {
      await deleteTeamImage(
        result.rows[0].image_file_id
      );
    }

    await pool.query(
      `
      DELETE FROM team_members
      WHERE id=$1
      `,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Team member deleted successfully.",
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
 * Stream Team Image (proxy)
 * Serves the image through our own domain instead of hotlinking
 * Google's endpoints directly, which avoids their 429 rate limiting
 * and browser CORB warnings.
 */
const getTeamImage = async (req, res) => {
  try {
    const { fileId } = req.params;

    const driveRes = await getTeamImageStream(fileId);

    res.setHeader(
      "Content-Type",
      driveRes.headers["content-type"] || "image/jpeg"
    );
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    driveRes.data
      .on("error", (err) => {
        console.error("Team image stream error:", err.message);
        if (!res.headersSent) {
          res.sendStatus(404);
        }
      })
      .pipe(res);
  } catch (error) {
    console.error(
      "Get Team Image Error:",
      error.response?.data || error.message
    );

    res.status(404).send("Image not found");
  }
};

module.exports = {
  createTeam,
  getAllTeam,
  getTeamById,
  updateTeam,
  deleteTeam,
  getTeamImage,
};