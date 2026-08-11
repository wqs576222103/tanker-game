const http = require("http");
const Router = require("@koa/router");
const { getPool, assertIdentifier } = require("../db");

const TABLE_NAME = process.env.DB_TABLE || "t_user_sync";

assertIdentifier(TABLE_NAME);

const SOURCE_MAP = {
  localhost: "http://8.130.41.52",
  "127.0.0.1": "http://8.130.41.52",
  "::1": "http://8.130.41.52",
  "8.130.41.52": "http://8.130.41.52",
  "113.249.91.32": "http://113.249.91.32",
};

function normalizeIp(ip) {
  if (!ip) return "";
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function saveUser(payload) {
  if (!payload || payload.code !== 200 || !payload.data) return;
  const u = payload.data;
  if (!u || !u.id) return;

  return getPool().execute(
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
  );
}

function forward(ctx, targetBase, token) {
  const url = new URL(
    `${targetBase}/sszl/user/getDetailByToken/${encodeURIComponent(token)}`,
  );

  return new Promise((resolve, reject) => {
    const proxyReq = http.request(
      url,
      {
        method: ctx.method,
        headers: { ...ctx.headers, host: url.host, authorization: token },
      },
      (proxyRes) => {
        const chunks = [];
        proxyRes.on("data", (c) => chunks.push(c));
        proxyRes.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          try {
            saveUser(JSON.parse(body)).catch((err) =>
              console.error(`[db] 保存用户失败: ${err.message}`),
            );
          } catch (err) {
            console.error(`[db] 解析上游响应失败: ${err.message}`);
          }
          resolve();
        });
        ctx.status = proxyRes.statusCode;
        Object.entries(proxyRes.headers).forEach(([k, v]) => {
          ctx.set(k, v);
        });
        ctx.res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(ctx.res);
      },
    );

    proxyReq.on("error", (err) => {
      ctx.status = 502;
      ctx.body = { code: 502, message: `转发失败: ${err.message}` };
      reject(err);
    });

    ctx.req.pipe(proxyReq);
  });
}

const router = new Router({ prefix: "/tank-game-api/user" });

router.get("/infoByToken", async (ctx) => {
  const token = ctx.query.token;
  if (!token) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "缺少 token 参数" };
    return;
  }

  let clientIp = normalizeIp(ctx.socket.remoteAddress);
  const xff = ctx.headers["x-forwarded-for"];
  if (xff) {
    const first = normalizeIp(String(xff).split(",")[0].trim());
    if (first) clientIp = first;
  }

  const targetBase = SOURCE_MAP[clientIp];
  if (!targetBase) {
    ctx.status = 403;
    ctx.body = { code: 403, message: `来源 ${clientIp} 不在允许列表中` };
    return;
  }

  await forward(ctx, targetBase, token);
});

module.exports = router;
