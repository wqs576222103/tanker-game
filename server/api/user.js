const http = require("http");

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

function forward(req, res, targetBase, token, search) {
  const url = new URL(
    `${targetBase}/sszl/user/getDetailByToken/${encodeURIComponent(token)}`,
  );
  if (search) url.search = search;

  const proxyReq = http.request(
    url,
    {
      method: req.method,
      headers: { ...req.headers, host: url.host, authorization: token },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ code: 502, message: `转发失败: ${err.message}` }));
  });

  req.pipe(proxyReq);
}

function handle(req, res) {
  const match = req.url.match(/^\/user\/infoByToken\/([^/?#]+)/);
  if (!match) return false;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  let clientIp = normalizeIp(req.socket.remoteAddress);
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const first = normalizeIp(String(xff).split(",")[0].trim());
    if (first) clientIp = first;
  }

  const targetBase = SOURCE_MAP[clientIp];
  if (!targetBase) {
    res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({ code: 403, message: `来源 ${clientIp} 不在允许列表中` }),
    );
    return true;
  }

  const token = decodeURIComponent(match[1]);
  const search = req.url.includes("?")
    ? req.url.slice(req.url.indexOf("?"))
    : "";
  forward(req, res, targetBase, token, search);
  return true;
}

module.exports = { handle };
