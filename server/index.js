const http = require("http");
const userRoutes = require("./api/user");

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {
  if (userRoutes.handle(req, res)) return;

  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ code: 404, message: "Not Found" }));
});

server.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
