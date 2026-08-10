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

const TABLE_NAME = process.env.DB_TABLE || "t_user_sync";

function assertIdentifier(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`非法表名: ${name}`);
  }
  return name;
}

assertIdentifier(TABLE_NAME);

let pool = null;
let readyPromise = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

function ensureTable() {
  if (!readyPromise) {
    readyPromise = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        username VARCHAR(64) DEFAULT NULL,
        phone VARCHAR(32) DEFAULT NULL,
        employee_id VARCHAR(64) DEFAULT NULL,
        post_name VARCHAR(64) DEFAULT NULL,
        create_time DATETIME DEFAULT NULL,
        update_time DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      )
      .then(() => {});
  }
  return readyPromise;
}

function saveUser(payload) {
  if (!payload || payload.code !== 200 || !payload.data) return;
  const u = payload.data;
  if (!u || !u.id) return;

  return ensureTable().then(() =>
    getPool().execute(
      `INSERT INTO \`${TABLE_NAME}\`
        (id, username, phone, employee_id, post_name, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        phone = VALUES(phone),
        employee_id = VALUES(employee_id),
        post_name = VALUES(post_name),
        update_time = NOW()`,
      [
        u.id,
        u.username || null,
        u.phone || null,
        u.employeeId || null,
        u.postName || null,
      ],
    ),
  );
}

module.exports = { saveUser, ensureTable };
