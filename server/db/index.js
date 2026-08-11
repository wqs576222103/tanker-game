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

function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

module.exports = { getPool, assertIdentifier };
