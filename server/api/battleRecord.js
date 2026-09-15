const Router = require("@koa/router");
const { getPool, assertIdentifier } = require("../db");

const RECORD_TABLE = process.env.DB_BATTLE_RECORD_TABLE || "t_battle_record";
const DETAIL_TABLE = process.env.DB_BATTLE_DETAIL_TABLE || "t_battle_record_detail";
const USER_TABLE = process.env.DB_TABLE || "t_user_sync";

assertIdentifier(RECORD_TABLE);
assertIdentifier(DETAIL_TABLE);
assertIdentifier(USER_TABLE);

async function saveBattleRecord({ winnerName, winnerEmployeeId, totalPlayers, gameDurationMs, isDraw, players }) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO \`${RECORD_TABLE}\` (winner_name, winner_employee_id, total_players, game_duration_ms, is_draw, create_time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        winnerName || "",
        winnerEmployeeId || "",
        totalPlayers || 0,
        gameDurationMs || 0,
        isDraw ? 1 : 0,
      ],
    );
    const recordId = result.insertId;

    if (players && players.length > 0) {
      const placeholders = players.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, NOW())").join(", ");
      const flatValues = [];
      for (const p of players) {
        flatValues.push(
          recordId,
          p.employeeId || "",
          p.tankName || "",
          p.score || 0,
          p.kills || 0,
          p.deaths || 0,
          p.deathReason || "",
          p.isWinner ? 1 : 0,
        );
      }
      await conn.execute(
        `INSERT INTO \`${DETAIL_TABLE}\` (record_id, employee_id, tank_name, score, kills, deaths, death_reason, is_winner, create_time)
         VALUES ${placeholders}`,
        flatValues,
      );
    }

    await conn.commit();
    return recordId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

const router = new Router({ prefix: "/tank-game-api/battle-record" });

router.post("/", async (ctx) => {
  const body = ctx.request.body || {};
  const { winnerName, winnerEmployeeId, totalPlayers, gameDurationMs, isDraw, players } = body;

  if (!players || !Array.isArray(players) || players.length === 0) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 players 数组" };
    return;
  }

  try {
    const recordId = await saveBattleRecord({
      winnerName,
      winnerEmployeeId,
      totalPlayers,
      gameDurationMs,
      isDraw,
      players,
    });
    ctx.body = { code: 200, data: { recordId } };
  } catch (err) {
    console.error(`[battleRecord] 保存战斗记录失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "保存战斗记录失败" };
  }
});

router.get("/page", async (ctx) => {
  const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize, 10) || 10));
  const keyword = ctx.query.keyword;
  const offset = (page - 1) * pageSize;

  try {
    let whereClause = "1=1";
    const params = [];
    if (keyword) {
      whereClause += ` AND r.id IN (
        SELECT d.record_id FROM \`${DETAIL_TABLE}\` d
        LEFT JOIN \`${USER_TABLE}\` u ON d.employee_id = u.employee_id
        WHERE d.employee_id LIKE ? OR d.tank_name LIKE ? OR u.username LIKE ?
      )`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const [[totalRows]] = await getPool().execute(
      `SELECT COUNT(*) AS cnt FROM \`${RECORD_TABLE}\` r WHERE ${whereClause}`,
      params,
    );
    const total = totalRows.cnt;

    const [rows] = await getPool().execute(
      `SELECT r.id, r.winner_name, r.winner_employee_id, r.total_players,
              r.game_duration_ms, r.is_draw, r.create_time, u.username AS winner_username
       FROM \`${RECORD_TABLE}\` r
       LEFT JOIN \`${USER_TABLE}\` u ON r.winner_employee_id = u.employee_id
       WHERE ${whereClause}
       ORDER BY r.create_time DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    ctx.body = { code: 200, data: { list: rows, total, page, pageSize } };
  } catch (err) {
    console.error(`[battleRecord] 分页查询失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询战斗记录失败" };
  }
});

router.get("/win-rate", async (ctx) => {
  const keyword = ctx.query.keyword;
  const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize, 10) || 20));
  const offset = (page - 1) * pageSize;

  try {
    let whereClause = "1=1";
    const params = [];
    if (keyword) {
      whereClause += " AND (d.employee_id LIKE ? OR d.tank_name LIKE ? OR u.username LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const [[totalRows]] = await getPool().execute(
      `SELECT COUNT(*) AS cnt FROM (
        SELECT d.employee_id, d.tank_name
        FROM \`${DETAIL_TABLE}\` d
        LEFT JOIN \`${USER_TABLE}\` u ON d.employee_id = u.employee_id
        WHERE ${whereClause}
        GROUP BY d.employee_id, d.tank_name
      ) t`,
      params,
    );

    const [rows] = await getPool().execute(
      `SELECT d.employee_id, d.tank_name, ANY_VALUE(u.username) AS username,
              COUNT(*) AS total_battles,
              SUM(d.is_winner) AS wins,
              SUM(d.kills) AS total_kills,
              SUM(d.deaths) AS total_deaths
       FROM \`${DETAIL_TABLE}\` d
       LEFT JOIN \`${USER_TABLE}\` u ON d.employee_id = u.employee_id
       WHERE ${whereClause}
       GROUP BY d.employee_id, d.tank_name
       ORDER BY CASE WHEN total_battles = 0 THEN 0 ELSE wins / total_battles END DESC, total_kills DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    const list = rows.map((r) => ({
      ...r,
      win_rate: r.total_battles > 0 ? Math.round((r.wins / r.total_battles) * 1000) / 10 : 0,
    }));

    ctx.body = { code: 200, data: { list, total: totalRows.cnt, page, pageSize } };
  } catch (err) {
    console.error(`[battleRecord] 查询胜率榜失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询胜率榜失败" };
  }
});

router.get("/:id", async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  if (!id) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少记录 ID" };
    return;
  }

  try {
    const [records] = await getPool().execute(
      `SELECT r.id, r.winner_name, r.winner_employee_id, r.total_players,
              r.game_duration_ms, r.is_draw, r.create_time
       FROM \`${RECORD_TABLE}\` r WHERE r.id = ?`,
      [id],
    );
    if (records.length === 0) {
      ctx.status = 404;
      ctx.body = { code: 404, message: "记录不存在" };
      return;
    }

    const [details] = await getPool().execute(
      `SELECT d.employee_id, d.tank_name, d.score, d.kills, d.deaths,
              d.death_reason, d.is_winner, u.username
       FROM \`${DETAIL_TABLE}\` d
       LEFT JOIN \`${USER_TABLE}\` u ON d.employee_id = u.employee_id
       WHERE d.record_id = ?
       ORDER BY d.score DESC, d.kills DESC`,
      [id],
    );

    ctx.body = { code: 200, data: { record: records[0], players: details } };
  } catch (err) {
    console.error(`[battleRecord] 查询详情失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询战斗详情失败" };
  }
});

router.get("/employee/:employeeId", async (ctx) => {
  const employeeId = ctx.params.employeeId;
  const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
  const pageSize = Math.min(100, parseInt(ctx.query.pageSize, 10) || 20);
  const offset = (page - 1) * pageSize;

  try {
    const [[totalRows]] = await getPool().execute(
      `SELECT COUNT(*) AS cnt FROM \`${DETAIL_TABLE}\` WHERE employee_id = ?`,
      [employeeId],
    );

    const [rows] = await getPool().execute(
      `SELECT d.id, d.record_id, d.tank_name, d.score, d.kills, d.deaths,
              d.death_reason, d.is_winner, d.create_time
       FROM \`${DETAIL_TABLE}\` d
       WHERE d.employee_id = ?
       ORDER BY d.create_time DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [employeeId],
    );

    ctx.body = {
      code: 200,
      data: { list: rows, total: totalRows.cnt, page, pageSize },
    };
  } catch (err) {
    console.error(`[battleRecord] 查询员工战斗记录失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询员工战斗记录失败" };
  }
});

module.exports = router;
