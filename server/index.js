const http = require("http");
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
require("dotenv").config();
const userRouter = require("./api/user");
const scoreRouter = require("./api/score");
const aiRouter = require("./api/ai");
const battleRecordRouter = require("./api/battleRecord");
const levelRecordRouter = require("./api/levelRecord");
const mapRouter = require("./api/map");
const onlineBattleRouter = require("./api/onlineBattle");
const { setupSocket } = require("./socket");

const app = new Koa();
const PORT = Number(process.env.PORT) || 3000;

app.use(bodyParser());

app.use(userRouter.routes()).use(userRouter.allowedMethods());
app.use(scoreRouter.routes()).use(scoreRouter.allowedMethods());
app.use(aiRouter.routes()).use(aiRouter.allowedMethods());
app.use(battleRecordRouter.routes()).use(battleRecordRouter.allowedMethods());
app.use(levelRecordRouter.routes()).use(levelRecordRouter.allowedMethods());
app.use(mapRouter.routes()).use(mapRouter.allowedMethods());
app.use(onlineBattleRouter.routes()).use(onlineBattleRouter.allowedMethods());

const server = http.createServer(app.callback());
setupSocket(server);

server.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});