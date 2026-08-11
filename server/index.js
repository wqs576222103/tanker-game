const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
require("dotenv").config();
const userRouter = require("./api/user");
const scoreRouter = require("./api/score");

const app = new Koa();
const PORT = Number(process.env.PORT) || 3000;

app.use(bodyParser());

app.use(userRouter.routes()).use(userRouter.allowedMethods());
app.use(scoreRouter.routes()).use(scoreRouter.allowedMethods());

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
