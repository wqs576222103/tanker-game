const Router = require("@koa/router");
const { getPool, assertIdentifier } = require("../db");

const ROOM_TABLE = process.env.DB_ONLINE_ROOM_TABLE || "t_online_battle_room";
const PLAYER_TABLE = process.env.DB_ONLINE_PLAYER_TABLE || "t_online_battle_player";
const USER_TABLE = process.env.DB_TABLE || "t_user_sync";

assertIdentifier(ROOM_TABLE);
assertIdentifier(PLAYER_TABLE);
assertIdentifier(USER_TABLE);

async function saveOnlineBattleRecord({ roomId, winnerEmployeeId, winnerName, playerCount, gameDurationMs, isDraw, players }) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO \`${ROOM_TABLE}\` (room_id, player_count, game_duration_ms, is_draw, winner_employee_id, winner_name, status, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 2, NOW())`,
      [roomId, playerCount || 0, gameDurationMs || 0, isDraw ? 1 : 0, winnerEmployeeId || "", winnerName || ""],
    );

    if (players && players.length > 0) {
      const placeholders = players.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())").join(", ");
      const flatValues = [];
      for (const p of players) {
        flatValues.push(
          roomId,
          p.employeeId || "",
          p.username || "",
          p.tankName || "",
          p.teamId || 0,
          p.score || 0,
          p.kills || 0,
          p.deaths || 0,
          p.deathReason || "",
          p.isWinner ? 1 : 0,
        );
      }
      await conn.execute(
        `INSERT INTO \`${PLAYER_TABLE}\` (room_id, employee_id, username, tank_name, team_id, score, kills, deaths, death_reason, is_winner, create_time)
         VALUES ${placeholders}`,
        flatValues,
      );
    }

    await conn.commit();
    return result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

const router = new Router({ prefix: "/tank-game-api/online-battle" });

router.get("/rooms", async (ctx) => {
  const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize, 10) || 20));
  const offset = (page - 1) * pageSize;

  try {
    const [[totalRows]] = await getPool().execute(
      `SELECT COUNT(*) AS cnt FROM \`${ROOM_TABLE}\` WHERE status = 2`,
    );

    const [rows] = await getPool().execute(
      `SELECT r.id, r.room_id, r.player_count, r.game_duration_ms, r.is_draw,
              r.winner_employee_id, r.winner_name, r.create_time,
              u.username AS winner_username
       FROM \`${ROOM_TABLE}\` r
       LEFT JOIN \`${USER_TABLE}\` u ON r.winner_employee_id = u.employee_id
       WHERE r.status = 2
       ORDER BY r.create_time DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
    );

    let playersMap = {};
    if (rows.length > 0) {
      const roomIds = rows.map((r) => r.room_id);
      const placeholders = roomIds.map(() => "?").join(", ");
      const [playerRows] = await getPool().execute(
        `SELECT room_id, employee_id, username, tank_name, team_id, score,
                kills, deaths, death_reason, is_winner
         FROM \`${PLAYER_TABLE}\`
         WHERE room_id IN (${placeholders})
         ORDER BY score DESC`,
        roomIds,
      );
      playersMap = playerRows.reduce((acc, p) => {
        if (!acc[p.room_id]) acc[p.room_id] = [];
        acc[p.room_id].push(p);
        return acc;
      }, {});
    }

    const list = rows.map((r) => ({ ...r, players: playersMap[r.room_id] || [] }));
    ctx.body = { code: 200, data: { list, total: totalRows.cnt, page, pageSize } };
  } catch (err) {
    console.error(`[onlineBattle] 查询房间列表失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询失败" };
  }
});

router.get("/room/:roomId", async (ctx) => {
  const roomId = ctx.params.roomId;
  try {
    const [rooms] = await getPool().execute(
      `SELECT r.id, r.room_id, r.player_count, r.game_duration_ms, r.is_draw,
              r.winner_employee_id, r.winner_name, r.create_time
       FROM \`${ROOM_TABLE}\` r WHERE r.room_id = ?`,
      [roomId],
    );
    if (rooms.length === 0) {
      ctx.status = 404;
      ctx.body = { code: 404, message: "房间不存在" };
      return;
    }

    const [players] = await getPool().execute(
      `SELECT p.employee_id, p.username, p.tank_name, p.team_id, p.score,
              p.kills, p.deaths, p.death_reason, p.is_winner
       FROM \`${PLAYER_TABLE}\` p
       WHERE p.room_id = ?
       ORDER BY p.score DESC`,
      [roomId],
    );

    ctx.body = { code: 200, data: { room: rooms[0], players } };
  } catch (err) {
    console.error(`[onlineBattle] 查询房间详情失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询失败" };
  }
});

router.get("/ranking", async (ctx) => {
  const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
  const pageSize = Math.min(100, parseInt(ctx.query.pageSize, 10) || 20);
  const offset = (page - 1) * pageSize;

  try {
    const [[totalRows]] = await getPool().execute(
      `SELECT COUNT(*) AS cnt FROM \`${PLAYER_TABLE}\` GROUP BY employee_id`,
    );

    const [rows] = await getPool().execute(
      `SELECT p.employee_id, ANY_VALUE(p.username) AS username,
              COUNT(*) AS total_battles,
              SUM(p.is_winner) AS wins,
              SUM(p.kills) AS total_kills,
              SUM(p.deaths) AS total_deaths,
              ROUND(SUM(p.is_winner) * 100.0 / COUNT(*), 1) AS win_rate
       FROM \`${PLAYER_TABLE}\` p
       GROUP BY p.employee_id
       ORDER BY wins DESC, total_kills DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
    );

    ctx.body = { code: 200, data: { list: rows, total: totalRows.cnt, page, pageSize } };
  } catch (err) {
    console.error(`[onlineBattle] 查询排行失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询失败" };
  }
});

module.exports = router;
module.exports.saveOnlineBattleRecord = saveOnlineBattleRecord;
