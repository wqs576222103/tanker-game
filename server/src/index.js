require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// 路由
app.use("/api/death-log", require("./routes/deathLog"));

// 健康检查
app.get("/api/health", async (_req, res) => {
  try {
    await pool.ping();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
  console.log(`坦克大战后端运行在 http://localhost:${PORT}`);
});
