const mysql = require("mysql2/promise");

const config = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tanker_game",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  charset: "utf8mb4",
};

function assertIdentifier(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`非法表名: ${name}`);
  }
  return name;
}

let pool = null;

const COLUMN_SPECS = [
  [
    process.env.DB_ONLINE_PLAYER_TABLE || "t_online_battle_player",
    "quit_mid_game",
  ],
  [
    process.env.DB_BATTLE_DETAIL_TABLE || "t_battle_record_detail",
    "quit_mid_game",
  ],
];

function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

async function ensureSchemaColumns() {
  const conn = await getPool().getConnection();
  try {
    for (const [table, column] of COLUMN_SPECS) {
      assertIdentifier(table);
      const [rows] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column],
      );
      if (rows[0].cnt > 0) continue;
      await conn.execute(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否中途退出 1=是 0=否'`,
      );
      console.log(`[db] 表 ${table} 已新增字段 ${column}`);
    }
  } finally {
    conn.release();
  }
}

module.exports = { getPool, assertIdentifier, ensureSchemaColumns };
