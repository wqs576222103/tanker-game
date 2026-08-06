const express = require("express");
const pool = require("../db");

const router = express.Router();

// POST /api/death-log  保存一条死亡日志
router.post("/", async (req, res) => {
  try {
    const d = req.body;

    const sql = `
      INSERT INTO death_log (
        log_type, ai_name, score, death_reason,
        player_hp, player_max_hp, player_x, player_y,
        player_dir_x, player_dir_y, has_shield,
        survival_weight, kill_weight, item_weight,
        selected_action, move_dir, was_dodging,
        enemy_count, nearby_enemies, bullet_count, threat_bullets,
        decision_log, context
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `;

    const ps = d.playerState || {};
    const ai = d.aiState || {};
    const env = d.surroundings || {};

    const values = [
      d.type || "player",
      d.aiName || null,
      d.score || 0,
      d.deathReason || "",
      ps.hp || 0,
      ps.maxHp || 5,
      ps.x || 0,
      ps.y || 0,
      ps.dir?.x ?? 0,
      ps.dir?.y ?? 0,
      ps.hasShield ? 1 : 0,
      ai.survivalWeight ?? null,
      ai.killWeight ?? null,
      ai.itemWeight ?? null,
      ai.selectedAction || null,
      ai.moveDir || null,
      ai.wasDodging ? 1 : null,
      env.enemyCount || 0,
      env.nearbyEnemies ? JSON.stringify(env.nearbyEnemies) : null,
      env.bulletCount || 0,
      env.threatBullets ? JSON.stringify(env.threatBullets) : null,
      d.decisionLog ? JSON.stringify(d.decisionLog) : null,
      d.context ? JSON.stringify(d.context) : null,
    ];

    const [result] = await pool.execute(sql, values);

    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error("保存死亡日志失败:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/death-log  查询死亡日志列表
//   ?page=1&pageSize=20&type=ai|player
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize) || 20),
    );
    const offset = (page - 1) * pageSize;
    const type = req.query.type;

    let where = "";
    const params = [];
    if (type === "ai" || type === "player") {
      where = "WHERE log_type = ?";
      params.push(type);
    }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM death_log ${where}`,
      params,
    );

    const [rows] = await pool.execute(
      `SELECT * FROM death_log ${where} ORDER BY id DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    // 解析 JSON 字段
    const list = rows.map((r) => ({
      ...r,
      nearby_enemies: r.nearby_enemies ? JSON.parse(r.nearby_enemies) : null,
      threat_bullets: r.threat_bullets ? JSON.parse(r.threat_bullets) : null,
      decision_log: r.decision_log ? JSON.parse(r.decision_log) : null,
      context: r.context ? JSON.parse(r.context) : null,
    }));

    res.json({ ok: true, total, page, pageSize, list });
  } catch (err) {
    console.error("查询死亡日志失败:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/death-log/stats  统计信息
router.get("/stats", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        COUNT(*)                          AS total,
        SUM(log_type = 'ai')             AS ai_count,
        SUM(log_type = 'player')         AS player_count,
        ROUND(AVG(score), 1)             AS avg_score,
        MAX(score)                       AS max_score,
        ROUND(AVG(player_hp), 1)         AS avg_hp_at_death
      FROM death_log
    `);
    res.json({ ok: true, stats: rows[0] });
  } catch (err) {
    console.error("统计失败:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/death-log  清空日志
router.delete("/", async (req, res) => {
  try {
    await pool.execute("TRUNCATE TABLE death_log");
    res.json({ ok: true });
  } catch (err) {
    console.error("清空日志失败:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
