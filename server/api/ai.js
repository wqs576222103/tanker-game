const fs = require("fs");
const path = require("path");
const Router = require("@koa/router");
const multer = require("@koa/multer");
const { getPool, assertIdentifier } = require("../db");

const AI_TABLE = process.env.DB_AI_TABLE || "t_user_ai";

assertIdentifier(AI_TABLE);

const UPLOAD_DIR = path.join(__dirname, "..", "upload", "ai");
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
      .basename(file.originalname || "ai.js", ext)
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

const router = new Router({ prefix: "/tank-game-api/ai" });

// 上传 AI 脚本文件，并记录 employeeId 与脚本路径
router.post("/upload", uploadSingle("file"), async (ctx) => {
  const employeeId = String(
    (ctx.request.body && ctx.request.body.employeeId) || "",
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
  // multer 保存时可能尚未解析到 employeeId 字段，这里统一按 employeeId 重命名
  const ext = path.extname(file.originalname || ".js").toLowerCase() || ".js";
  const base = path
    .basename(file.originalname || "ai.js", ext)
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 40);
  const finalName = `${employeeId.replace(/[^\w.\-]/g, "_")}-${Date.now()}-${base}${ext}`;
  const finalPath = path.join(UPLOAD_DIR, finalName);
  if (file.path && path.resolve(file.path) !== path.resolve(finalPath)) {
    try {
      fs.renameSync(file.path, finalPath);
    } catch (err) {
      console.error(`[ai] 重命名上传文件失败: ${err.message}`);
    }
  }
  const scriptPath = `/tank-game-api/ai/file/${finalName}`;
  try {
    await getPool().execute(
      `INSERT INTO \`${AI_TABLE}\` (employee_id, file_name, script_path, create_time, update_time)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        file_name = VALUES(file_name),
        script_path = VALUES(script_path),
        update_time = NOW()`,
      [employeeId, file.originalname, scriptPath],
    );
    ctx.body = {
      code: 200,
      data: {
        employeeId,
        fileName: file.originalname,
        scriptPath,
      },
    };
  } catch (err) {
    console.error(`[ai] 保存AI脚本记录失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "保存AI脚本记录失败" };
  }
});

// 查询某个员工最新导入的 AI 脚本信息
router.get("/", async (ctx) => {
  const employeeId = String(ctx.query.employeeId || "").trim();
  if (!employeeId) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 employeeId 参数" };
    return;
  }
  try {
    const [rows] = await getPool().execute(
      `SELECT employee_id, file_name, script_path, update_time
       FROM \`${AI_TABLE}\` WHERE employee_id = ?`,
      [employeeId],
    );
    const data =
      rows.length > 0
        ? {
            employeeId: rows[0].employee_id,
            fileName: rows[0].file_name,
            scriptPath: rows[0].script_path,
            updateTime: rows[0].update_time,
          }
        : null;
    ctx.body = { code: 200, data };
  } catch (err) {
    console.error(`[ai] 查询AI脚本失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = { code: 500, message: "查询AI脚本失败" };
  }
});

// 下载已上传的 AI 脚本文件内容
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

module.exports = router;
