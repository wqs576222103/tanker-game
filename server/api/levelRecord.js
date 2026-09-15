const Router = require("@koa/router");
const { getPool, assertIdentifier } = require("../db");

const LEVEL_RECORD_TABLE = process.env.DB_LEVEL_RECORD_TABLE || "t_level_record";

assertIdentifier(LEVEL_RECORD_TABLE);

async function saveLevelRecord({ employeeId, username, levelId, kills, durationMs }) {
  return getPool().execute(
    `INSERT INTO \`${LEVEL_RECORD_TABLE}\` (employee_id, username, level_id, kills, duration_ms, create_time)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      employeeId || "",
      username || "",
      levelId || 0,
      kills || 0,
      durationMs || 0,
    ],
  );
}

async function getLevelRecords({ page = 1, pageSize = 10, keyword = "", levelId = "" }) {
  const offset = (page - 1) * pageSize;
  let whereClause = "1=1";
  const params = [];

  if (keyword) {
    whereClause += " AND (lr.employee_id LIKE ? OR lr.username LIKE ?)";
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (levelId) {
    whereClause += " AND lr.level_id = ?";
    params.push(levelId);
  }

  const [[totalRows]] = await getPool().execute(
    `SELECT COUNT(*) AS cnt FROM \`${LEVEL_RECORD_TABLE}\` lr WHERE ${whereClause}`,
    params,
  );
  const total = totalRows.cnt;

  const [rows] = await getPool().execute(
    `SELECT lr.id, lr.employee_id, lr.username, lr.level_id, lr.kills, lr.duration_ms, lr.create_time
     FROM \`${LEVEL_RECORD_TABLE}\` lr
     WHERE ${whereClause}
     ORDER BY lr.create_time DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params,
  );

  return { list: rows, total, page, pageSize };
}

const router = new Router({ prefix: "/tank-game-api/level-record" });

router.post("/", async (ctx) => {
  const { employeeId, username, levelId, kills, durationMs } = ctx.request.body || {};

  if (!employeeId || !levelId) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 employeeId 或 levelId" };
    return;
  }

  try {
    await saveLevelRecord({ employeeId, username, levelId, kills, durationMs });
    ctx.body = { code: 200, message: "保存成功" };
  } catch (err) {
    console.error(`[levelRecord] 保存关卡记录失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "保存关卡记录失败" };
  }
});

router.get("/page", async (ctx) => {
  const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize, 10) || 10));
  const keyword = ctx.query.keyword;
  const levelId = ctx.query.levelId;

  try {
    const data = await getLevelRecords({ page, pageSize, keyword, levelId });
    ctx.body = { code: 200, data };
  } catch (err) {
    console.error(`[levelRecord] 分页查询失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询关卡记录失败" };
  }
});

router.get("/best/:employeeId", async (ctx) => {
  const employeeId = ctx.params.employeeId;

  try {
    const [rows] = await getPool().execute(
      `SELECT lr.level_id, MIN(lr.duration_ms) AS best_time, MIN(lr.id) AS record_id
       FROM \`${LEVEL_RECORD_TABLE}\` lr
       WHERE lr.employee_id = ?
       GROUP BY lr.level_id`,
      [employeeId],
    );
    ctx.body = { code: 200, data: { list: rows } };
  } catch (err) {
    console.error(`[levelRecord] 查询员工最佳关卡记录失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询员工最佳关卡记录失败" };
  }
});

module.exports = router;