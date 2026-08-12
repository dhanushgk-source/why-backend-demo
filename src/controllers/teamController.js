const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const {
    uploadTeamImage,
    deleteTeamImage,
    getTeamImageStream,
} = require("../services/googleDriveTeamService");

let teamMigrationRan = false;
async function ensureTeamSchema() {
    if (teamMigrationRan) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS department_positions (
                department TEXT PRIMARY KEY,
                position INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
            ALTER TABLE team_members ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;
        `);
        teamMigrationRan = true;
    } catch (err) {
        console.error("⚠️ Team schema migration error:", err.message);
    }
}

/**
 * Create Team Member
 */
const createTeam = async (req, res) => {
    try {
        await ensureTeamSchema();

        const {
            name,
            designation,
            department,
            location,
            biography,
        } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Profile image is required.",
            });
        }

        const upload = await uploadTeamImage(req.file);

        // Get max position for this department
        const posRes = await pool.query(
            "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM team_members WHERE LOWER(TRIM(COALESCE(department, ''))) = LOWER(TRIM($1))",
            [department || ""]
        );
        const position = posRes.rows[0]?.next_pos || 0;

        const id = uuidv4();

        await pool.query(
            `
            INSERT INTO team_members
            (
                id,
                name,
                designation,
                department,
                location,
                biography,
                image_url,
                image_file_id,
                position
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            `,
            [
                id,
                name,
                designation,
                department,
                location,
                biography,
                upload.imageUrl,
                upload.fileId,
                position,
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
 * Get All Team Members (Ordered by Department Position, then Member Position)
 */
const getAllTeam = async (req, res) => {
    try {
        await ensureTeamSchema();

        const result = await pool.query(
            `
            SELECT 
                tm.*,
                COALESCE(dp.position, 9999) AS dept_position
            FROM team_members tm
            LEFT JOIN department_positions dp ON LOWER(TRIM(dp.department)) = LOWER(TRIM(tm.department))
            WHERE tm.is_active = true
            ORDER BY 
                COALESCE(dp.position, 9999) ASC,
                LOWER(TRIM(COALESCE(tm.department, ''))) ASC,
                tm.position ASC,
                tm.created_at ASC
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
 * Reorder Departments
 * PUT /api/team/reorder-departments
 * Body: { departments: ["Leadership", "Medical Advisory", "Tech & Product", "Operations"] }
 * or { departments: [{ department: "Leadership", position: 0 }, ...] }
 */
const reorderDepartments = async (req, res) => {
    try {
        await ensureTeamSchema();
        const { departments } = req.body;

        if (!Array.isArray(departments)) {
            return res.status(400).json({
                success: false,
                message: "departments must be an array",
            });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            for (let i = 0; i < departments.length; i++) {
                const item = departments[i];
                const deptName = typeof item === "string" ? item : item.department;
                const position = typeof item === "object" && item.position !== undefined ? item.position : i;

                if (deptName) {
                    await client.query(
                        `
                        INSERT INTO department_positions (department, position, updated_at)
                        VALUES ($1, $2, NOW())
                        ON CONFLICT (department) DO UPDATE
                        SET position = EXCLUDED.position, updated_at = NOW()
                        `,
                        [deptName.trim(), position]
                    );
                }
            }

            await client.query("COMMIT");

            res.status(200).json({
                success: true,
                message: "Departments reordered successfully.",
            });
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error reordering departments:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

/**
 * Reorder Members within a department (or globally)
 * PUT /api/team/reorder-members
 * Body: { members: [{ id: "...", position: 0 }, { id: "...", position: 1 }] }
 * or { members: ["id1", "id2", "id3"] }
 */
const reorderMembers = async (req, res) => {
    try {
        await ensureTeamSchema();
        const { members } = req.body;

        if (!Array.isArray(members)) {
            return res.status(400).json({
                success: false,
                message: "members must be an array",
            });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            for (let i = 0; i < members.length; i++) {
                const item = members[i];
                const memberId = typeof item === "string" ? item : item.id;
                const position = typeof item === "object" && item.position !== undefined ? item.position : i;

                if (memberId) {
                    await client.query(
                        `
                        UPDATE team_members
                        SET position = $1, updated_at = NOW()
                        WHERE id = $2
                        `,
                        [position, memberId]
                    );
                }
            }

            await client.query("COMMIT");

            res.status(200).json({
                success: true,
                message: "Team members reordered successfully.",
            });
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error reordering team members:", error);
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
            location,
            biography,
        } = req.body;

        await pool.query(
            `
            UPDATE team_members
            SET
            name=$1,
            designation=$2,
            department=$3,
            location=$4,
            biography=$5,
            image_url=$6,
            image_file_id=$7,
            updated_at=NOW()
            WHERE id=$8
            `,
            [
                name,
                designation,
                department,
                location,
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
    reorderDepartments,
    reorderMembers,
};