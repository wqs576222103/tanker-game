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
      `SELECT employee_id, high_score, create_time, update_time
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

module.exports = router;
