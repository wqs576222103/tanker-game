const fs = require("fs");
const path = require("path");
const Router = require("@koa/router");
const multer = require("@koa/multer");
const { getPool, assertIdentifier } = require("../db");

const MAP_TABLE = process.env.DB_MAP_TABLE || "t_map_script";
const USER_TABLE = process.env.DB_TABLE || "t_user_sync";

assertIdentifier(MAP_TABLE);
assertIdentifier(USER_TABLE);

const UPLOAD_DIR = path.join(__dirname, "..", "upload", "map");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_SIZE = 500 * 1024; // 500KB
const ALLOWED_EXT = [".js", ".mjs", ".txt"];

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || ".js").toLowerCase() || ".js";
    const base = path
      .basename(file.originalname || "map.js", ext)
      .replace(/[^\w.\-]/g, "_")
      .slice(0, 40);
    cb(
      null,
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`,
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      cb(new Error("仅支持 .js / .mjs / .txt 脚本文件"));
      return;
    }
    cb(null, true);
  },
});

function uploadSingle(field) {
  return async (ctx, next) => {
    try {
      await upload.single(field)(ctx, next);
    } catch (err) {
      ctx.status = 400;
      ctx.body = { code: 400, message: err.message || "文件上传失败" };
    }
  };
}

const router = new Router({ prefix: "/tank-game-api/map" });

// 上传地图脚本文件
router.post("/upload", uploadSingle("file"), async (ctx) => {
  const employeeId = String(
    (ctx.request.body && ctx.request.body.employeeId) || "",
  ).trim();
  const mapName = String(
    (ctx.request.body && ctx.request.body.mapName) || "未命名地图",
  ).trim();
  if (!employeeId) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 employeeId 参数" };
    return;
  }
  const file = ctx.request.file;
  if (!file) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少上传文件" };
    return;
  }
  const ext = path.extname(file.originalname || ".js").toLowerCase() || ".js";
  const base = path
    .basename(file.originalname || "map.js", ext)
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 40);
  const finalName = `${employeeId.replace(/[^\w.\-]/g, "_")}-${Date.now()}-${base}${ext}`;
  const finalPath = path.join(UPLOAD_DIR, finalName);
  if (file.path && path.resolve(file.path) !== path.resolve(finalPath)) {
    try {
      fs.renameSync(file.path, finalPath);
    } catch (err) {
      console.error(`[map] 重命名上传文件失败: ${err.message}`);
    }
  }
  const scriptPath = `/tank-game-api/map/file/${finalName}`;

  try {
    const [result] = await getPool().execute(
      `INSERT INTO \`${MAP_TABLE}\` (employee_id, map_name, file_name, script_path, create_time)
       VALUES (?, ?, ?, ?, NOW())`,
      [employeeId, mapName, file.originalname, scriptPath],
    );
    ctx.body = {
      code: 200,
      data: {
        id: result.insertId,
        employeeId,
        mapName,
        fileName: file.originalname,
        scriptPath,
      },
    };
  } catch (err) {
    console.error(`[map] 保存地图脚本记录失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "保存地图脚本记录失败" };
  }
});

// 查询所有地图脚本列表
router.get("/list", async (ctx) => {
  const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(ctx.query.pageSize, 10) || 20),
  );
  const keyword = ctx.query.keyword;
  const offset = (page - 1) * pageSize;

  try {
    let whereClause = "1=1";
    const params = [];
    if (keyword) {
      whereClause +=
        " AND (m.map_name LIKE ? OR m.employee_id LIKE ? OR u.username LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const [[totalRows]] = await getPool().execute(
      `SELECT COUNT(*) AS cnt
       FROM \`${MAP_TABLE}\` m
       LEFT JOIN \`${USER_TABLE}\` u ON m.employee_id = u.employee_id
       WHERE ${whereClause}`,
      params,
    );
    const total = totalRows.cnt;

    const [rows] = await getPool().execute(
      `SELECT m.id, m.employee_id, u.username, m.map_name, m.file_name, m.script_path, m.create_time
       FROM \`${MAP_TABLE}\` m
       LEFT JOIN \`${USER_TABLE}\` u ON m.employee_id = u.employee_id
       WHERE ${whereClause}
       ORDER BY m.create_time DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    ctx.body = {
      code: 200,
      data: { list: rows, total, page, pageSize },
    };
  } catch (err) {
    console.error(`[map] 分页查询地图脚本失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询地图脚本列表失败" };
  }
});

// 查询某个员工的地图脚本列表
router.get("/user/:employeeId", async (ctx) => {
  const employeeId = String(ctx.params.employeeId || "").trim();
  if (!employeeId) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 employeeId 参数" };
    return;
  }
  try {
    const [rows] = await getPool().execute(
      `SELECT id, employee_id, map_name, file_name, script_path, create_time
       FROM \`${MAP_TABLE}\` WHERE employee_id = ?
       ORDER BY create_time DESC`,
      [employeeId],
    );
    ctx.body = {
      code: 200,
      data: rows.map((r) => ({
        id: r.id,
        employeeId: r.employee_id,
        mapName: r.map_name,
        fileName: r.file_name,
        scriptPath: r.script_path,
        createTime: r.create_time,
      })),
    };
  } catch (err) {
    console.error(`[map] 查询用户地图脚本失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询用户地图脚本失败" };
  }
});

// 获取单个地图脚本信息
router.get("/:id", async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  if (!id) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 id 参数" };
    return;
  }
  try {
    const [rows] = await getPool().execute(
      `SELECT m.id, m.employee_id, u.username, m.map_name, m.file_name, m.script_path, m.create_time
       FROM \`${MAP_TABLE}\` m
       LEFT JOIN \`${USER_TABLE}\` u ON m.employee_id = u.employee_id
       WHERE m.id = ?`,
      [id],
    );
    if (rows.length === 0) {
      ctx.status = 404;
      ctx.body = { code: 404, message: "地图脚本不存在" };
      return;
    }
    const r = rows[0];
    ctx.body = {
      code: 200,
      data: {
        id: r.id,
        employeeId: r.employee_id,
        username: r.username,
        mapName: r.map_name,
        fileName: r.file_name,
        scriptPath: r.script_path,
        createTime: r.create_time,
      },
    };
  } catch (err) {
    console.error(`[map] 查询地图脚本详情失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询地图脚本详情失败" };
  }
});

// 下载已上传的地图脚本文件内容
router.get("/file/:name", async (ctx) => {
  const name = path.basename(ctx.params.name || "");
  if (!name) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少文件名" };
    return;
  }
  const full = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(full)) {
    ctx.status = 404;
    ctx.body = { code: 404, message: "文件不存在" };
    return;
  }
  ctx.type = "application/javascript";
  ctx.body = fs.createReadStream(full);
});

// 删除地图脚本
router.delete("/:id", async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  if (!id) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 id 参数" };
    return;
  }
  try {
    const [rows] = await getPool().execute(
      `SELECT id, script_path FROM \`${MAP_TABLE}\` WHERE id = ?`,
      [id],
    );
    if (rows.length === 0) {
      ctx.status = 404;
      ctx.body = { code: 404, message: "地图脚本不存在" };
      return;
    }
    // 删除文件
    const scriptPath = rows[0].script_path;
    if (scriptPath) {
      const fileName = path.basename(scriptPath);
      const filePath = path.join(UPLOAD_DIR, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`[map] 删除地图文件失败: ${err.message}`);
        }
      }
    }
    // 删除数据库记录
    await getPool().execute(`DELETE FROM \`${MAP_TABLE}\` WHERE id = ?`, [id]);
    ctx.body = { code: 200, data: { success: true } };
  } catch (err) {
    console.error(`[map] 删除地图脚本失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "删除地图脚本失败" };
  }
});

module.exports = router;
