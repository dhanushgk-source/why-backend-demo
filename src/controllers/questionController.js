const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const QUESTION_TYPES = ["multiple_choice", "fill_gap", "ordering", "match_pairs", "free_text"];
const nullableNumber = (value) => (value === "" || value == null ? null : value);

const getQuestions = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM questions WHERE assessment_id = $1 ORDER BY position ASC, created_at ASC", [req.params.assessmentId]);
    res.status(200).json({ success: true, questions: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Server Error" }); }
};

function validateQuestion(body, res) {
  if (!QUESTION_TYPES.includes(body.question_type)) { res.status(400).json({ success: false, message: `question_type must be one of: ${QUESTION_TYPES.join(", ")}` }); return false; }
  if (!body.prompt) { res.status(400).json({ success: false, message: "Prompt is required" }); return false; }
  return true;
}

const createQuestion = async (req, res) => {
  try {
    const { assessmentId } = req.params; const body = req.body;
    if (!validateQuestion(body, res)) return;
    const count = await pool.query("SELECT COUNT(*)::int AS count FROM questions WHERE assessment_id = $1", [assessmentId]);
    const id = uuidv4();
    await pool.query(`INSERT INTO questions (id, assessment_id, question_type, prompt, marks, time_limit_seconds, default_score, config, position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, assessmentId, body.question_type, body.prompt, body.marks ?? 1, nullableNumber(body.time_limit_seconds), body.default_score ?? 1, JSON.stringify(body.config || {}), count.rows[0].count]);
    res.status(201).json({ success: true, message: "Question added", id });
  } catch (error) {
    if (error.code === "23503") return res.status(404).json({ success: false, message: "Assessment not found" });
    console.error(error); res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const body = req.body;
    if (!validateQuestion(body, res)) return;
    const result = await pool.query(`UPDATE questions SET question_type=$1, prompt=$2, marks=$3, time_limit_seconds=$4, default_score=$5, config=$6, updated_at=NOW() WHERE id=$7 AND assessment_id=$8`, [body.question_type, body.prompt, body.marks ?? 1, nullableNumber(body.time_limit_seconds), body.default_score ?? 1, JSON.stringify(body.config || {}), req.params.questionId, req.params.assessmentId]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Question not found" });
    res.status(200).json({ success: true, message: "Question updated" });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Server Error" }); }
};

const deleteQuestion = async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM questions WHERE id = $1 AND assessment_id = $2", [req.params.questionId, req.params.assessmentId]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Question not found" });
    res.status(200).json({ success: true, message: "Question removed" });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Server Error" }); }
};

const reorderQuestions = async (req, res) => {
  const client = await pool.connect();
  try {
    const { question_ids = [] } = req.body;
    await client.query("BEGIN");
    for (let i = 0; i < question_ids.length; i++) await client.query("UPDATE questions SET position = $1 WHERE id = $2 AND assessment_id = $3", [i, question_ids[i], req.params.assessmentId]);
    await client.query("COMMIT");
    res.status(200).json({ success: true, message: "Questions reordered" });
  } catch (error) {
    await client.query("ROLLBACK"); console.error(error); res.status(500).json({ success: false, message: "Server Error" });
  } finally { client.release(); }
};

module.exports = { getQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions };
