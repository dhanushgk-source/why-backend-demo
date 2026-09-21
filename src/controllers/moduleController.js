const pool = require("../config/db");
const { randomUUID: uuidv4 } = require("crypto");

/**
 * GET /api/admin/trainings/:trainingId/modules
 */
const getModules = async (req, res) => {
  try {
    const { trainingId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM modules
      WHERE training_id = $1
      ORDER BY position ASC, created_at ASC
      `,
      [trainingId]
    );

    res.status(200).json({
      success: true,
      modules: result.rows,
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
 * POST /api/admin/trainings/:trainingId/modules
 */
const createModule = async (req, res) => {
  try {
    const { trainingId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM modules WHERE training_id = $1",
      [trainingId]
    );
    const nextPosition = countResult.rows[0].count;

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO modules (id, training_id, title, description, position)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [id, trainingId, title, description || null, nextPosition]
    );

    res.status(201).json({
      success: true,
      message: "Module created",
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
 * PUT /api/admin/trainings/:trainingId/modules/:moduleId
 */
const updateModule = async (req, res) => {
  try {
    const { trainingId, moduleId } = req.params;
    const { title, description } = req.body;

    const result = await pool.query(
      `
      UPDATE modules
      SET title=$1, description=$2, updated_at=NOW()
      WHERE id=$3 AND training_id=$4
      `,
      [title, description || null, moduleId, trainingId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Module updated",
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
 * DELETE /api/admin/trainings/:trainingId/modules/:moduleId
 * Cascades to its lessons.
 */
const deleteModule = async (req, res) => {
  try {
    const { trainingId, moduleId } = req.params;

    const result = await pool.query(
      "DELETE FROM modules WHERE id = $1 AND training_id = $2",
      [moduleId, trainingId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Module removed",
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
 * PUT /api/admin/trainings/:trainingId/modules/reorder
 * body: { module_ids: [] } — full ordered list for this training.
 */
const reorderModules = async (req, res) => {
  const client = await pool.connect();

  try {
    const { trainingId } = req.params;
    const { module_ids = [] } = req.body;

    await client.query("BEGIN");

    for (let i = 0; i < module_ids.length; i++) {
      await client.query(
        "UPDATE modules SET position = $1 WHERE id = $2 AND training_id = $3",
        [i, module_ids[i], trainingId]
      );
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Modules reordered",
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
  getModules,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
};
