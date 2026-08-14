const Router = require("@koa/router");
const { getPool, assertIdentifier } = require("../db");

const SCORE_TABLE = process.env.DB_SCORE_TABLE || "t_user_score";

assertIdentifier(SCORE_TABLE);

function saveHighScore(employeeId, score) {
  if (!employeeId || typeof score !== "number") return Promise.resolve(null);
  return getPool().execute(
    `INSERT INTO \`${SCORE_TABLE}\` (employee_id, high_score, create_time, update_time)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        high_score = IF(VALUES(high_score) > high_score, VALUES(high_score), high_score),
        update_time = NOW()`,
    [employeeId, Math.floor(score)],
  );
}

function getHighScore(employeeId) {
  if (!employeeId) return Promise.resolve(null);
  return getPool()
    .execute(
      `SELECT high_score FROM \`${SCORE_TABLE}\` WHERE employee_id = ?`,
      [employeeId],
    )
    .then(([rows]) => (rows.length > 0 ? rows[0].high_score : 0));
}

function saveGameKills(employeeId, kills, bossKills) {
  if (!employeeId || typeof kills !== "number") return Promise.resolve(null);
  return getPool().execute(
    `INSERT INTO \`${SCORE_TABLE}\` (employee_id, high_score, last_kills, last_boss_kills, create_time, update_time)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        high_score = IF(VALUES(high_score) > high_score, VALUES(high_score), high_score),
        last_kills = VALUES(last_kills),
        last_boss_kills = VALUES(last_boss_kills),
        update_time = NOW()`,
    [
      employeeId,
      Math.floor(kills),
      Math.floor(kills),
      Math.floor(bossKills || 0),
    ],
  );
}

function saveDeath(employeeId) {
  if (!employeeId) return Promise.resolve(null);
  return getPool().execute(
    `INSERT INTO \`${SCORE_TABLE}\` (employee_id, high_score, deaths, create_time, update_time)
       VALUES (?, 0, 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        deaths = deaths + 1,
        update_time = NOW()`,
    [employeeId],
  );
}

const router = new Router({ prefix: "/tank-game-api/score" });

router.get("/page", async (ctx) => {
  const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(ctx.query.pageSize, 10) || 10),
  );
  const employeeId = ctx.query.employeeId;

  const offset = (page - 1) * pageSize;

  try {
    let whereClause = "1=1";
    let params = [];
    if (employeeId) {
      whereClause += " AND employee_id LIKE ?";
      params.push(`%${employeeId}%`);
    }

    const [[totalRows]] = await getPool().execute(
      `SELECT COUNT(*) AS cnt FROM \`${SCORE_TABLE}\` WHERE ${whereClause}`,
      params,
    );
    const total = totalRows.cnt;

    const [rows] = await getPool().execute(
      `SELECT employee_id, high_score, last_kills, last_boss_kills, deaths, create_time, update_time
       FROM \`${SCORE_TABLE}\`
       WHERE ${whereClause}
       ORDER BY high_score DESC, update_time DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    ctx.body = {
      code: 200,
      data: { list: rows, total, page, pageSize },
    };
  } catch (err) {
    console.error(`[score] 分页查询失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "分页查询分数失败" };
  }
});

router.get("/", async (ctx) => {
  const employeeId = ctx.query.employeeId;
  if (!employeeId) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 employeeId 参数" };
    return;
  }
  try {
    const highScore = await getHighScore(employeeId);
    ctx.body = { code: 200, data: { employeeId, highScore } };
  } catch (err) {
    console.error(`[score] 查询失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询分数失败" };
  }
});

router.post("/", async (ctx) => {
  const { employeeId, score } = ctx.request.body || {};
  if (!employeeId || typeof score !== "number") {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 employeeId 或 score" };
    return;
  }
  try {
    await saveHighScore(employeeId, score);
    const highScore = await getHighScore(employeeId);
    ctx.body = { code: 200, data: { employeeId, highScore } };
  } catch (err) {
    console.error(`[score] 保存失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "保存分数失败" };
  }
});

router.post("/kills", async (ctx) => {
  const { employeeId, kills, bossKills } = ctx.request.body || {};
  if (!employeeId || typeof kills !== "number") {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 employeeId 或 kills" };
    return;
  }
  try {
    await saveGameKills(employeeId, kills, bossKills);
    ctx.body = { code: 200, data: { employeeId, kills, bossKills } };
  } catch (err) {
    console.error(`[score] 保存击杀数失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "保存击杀数失败" };
  }
});

router.post("/deaths", async (ctx) => {
  const { employeeId } = ctx.request.body || {};
  if (!employeeId) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 employeeId 参数" };
    return;
  }
  try {
    await saveDeath(employeeId);
    ctx.body = { code: 200, data: { employeeId } };
  } catch (err) {
    console.error(`[score] 死亡数+1失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "死亡数+1失败" };
  }
});

module.exports = router;
