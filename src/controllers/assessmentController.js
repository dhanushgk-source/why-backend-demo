const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const ATTACH_TYPES = ["module", "training"];
const SCORE_MODES = ["instant", "after_submit"];
const STATUSES = ["draft", "published"];
const nullableNumber = (value) => (value === "" || value == null ? null : value);

async function attachmentExists(type, id) {
  const table = type === "module" ? "modules" : "training_programs";
  const result = await pool.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

const getAssessment = async (req, res) => {
  try {
    const { attached_to_type, attached_to_id } = req.query;
    if (!ATTACH_TYPES.includes(attached_to_type) || !attached_to_id) return res.status(400).json({ success: false, message: "attached_to_type ('module' or 'training') and attached_to_id are required" });
    const result = await pool.query("SELECT * FROM assessments WHERE attached_to_type = $1 AND attached_to_id = $2", [attached_to_type, attached_to_id]);
    res.status(200).json({ success: true, assessment: result.rows[0] || null });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Server Error" }); }
};

const getAssessmentById = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM assessments WHERE id = $1", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Assessment not found" });
    res.status(200).json({ success: true, assessment: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Server Error" }); }
};

const createAssessment = async (req, res) => {
  try {
    const body = req.body;
    if (!ATTACH_TYPES.includes(body.attached_to_type) || !body.attached_to_id) return res.status(400).json({ success: false, message: "attached_to_type ('module' or 'training') and attached_to_id are required" });
    if (!body.title) return res.status(400).json({ success: false, message: "Title is required" });
    if (body.show_score_mode && !SCORE_MODES.includes(body.show_score_mode)) return res.status(400).json({ success: false, message: "show_score_mode must be 'instant' or 'after_submit'" });
    if (body.status && !STATUSES.includes(body.status)) return res.status(400).json({ success: false, message: "status must be 'draft' or 'published'" });
    if (!(await attachmentExists(body.attached_to_type, body.attached_to_id))) return res.status(404).json({ success: false, message: `${body.attached_to_type === "module" ? "Module" : "Training program"} not found` });
    const id = uuidv4();
    await pool.query(`INSERT INTO assessments (id, attached_to_type, attached_to_id, title, instructions, passing_percent, time_limit_minutes, shuffle_questions, shuffle_options, negative_marking, show_score_mode, max_attempts, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [id, body.attached_to_type, body.attached_to_id, body.title, body.instructions || null, body.passing_percent ?? 60, nullableNumber(body.time_limit_minutes), Boolean(body.shuffle_questions), Boolean(body.shuffle_options), Boolean(body.negative_marking), body.show_score_mode || "after_submit", nullableNumber(body.max_attempts), body.status || "draft"]);
    res.status(201).json({ success: true, message: "Assessment created", id });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ success: false, message: "An assessment already exists for this module or training program" });
    console.error(error); res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateAssessment = async (req, res) => {
  try {
    const body = req.body;
    if (body.show_score_mode && !SCORE_MODES.includes(body.show_score_mode)) return res.status(400).json({ success: false, message: "show_score_mode must be 'instant' or 'after_submit'" });
    if (body.status && !STATUSES.includes(body.status)) return res.status(400).json({ success: false, message: "status must be 'draft' or 'published'" });
    const result = await pool.query(`UPDATE assessments SET title=$1, instructions=$2, passing_percent=$3, time_limit_minutes=$4, shuffle_questions=$5, shuffle_options=$6, negative_marking=$7, show_score_mode=$8, max_attempts=$9, status=COALESCE($10, status), updated_at=NOW() WHERE id=$11`, [body.title, body.instructions || null, body.passing_percent ?? 60, nullableNumber(body.time_limit_minutes), Boolean(body.shuffle_questions), Boolean(body.shuffle_options), Boolean(body.negative_marking), body.show_score_mode || "after_submit", nullableNumber(body.max_attempts), body.status || null, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Assessment not found" });
    res.status(200).json({ success: true, message: "Assessment updated" });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Server Error" }); }
};

const deleteAssessment = async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM assessments WHERE id = $1", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Assessment not found" });
    res.status(200).json({ success: true, message: "Assessment removed" });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Server Error" }); }
};

module.exports = { getAssessment, getAssessmentById, createAssessment, updateAssessment, deleteAssessment };
