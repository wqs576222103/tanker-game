import { createRouter, createWebHistory } from "vue-router";
import { getUserInfoByToken } from "@/api";
import { setUserInfo, setToken } from "@/utils/user.js";
import { clearLevelMode } from "@/views/TankGame/script/base/index.js";

const routes = [
  {
    path: "/",
    redirect: "/home",
  },
  {
    path: "/home",
    name: "Home",
    component: () => import("../views/Home/index.vue"),
  },
  {
    path: "/tank-game",
    name: "TankGame",
    component: () => import("../views/TankGame/index.vue"),
  },
  {
    path: "/battle-arena",
    name: "BattleArena",
    component: () => import("../views/BattleArena/index.vue"),
  },
  {
    path: "/ranking",
    name: "Ranking",
    component: () => import("../views/Ranking/index.vue"),
  },
  {
    path: "/ai-script",
    name: "AiScript",
    component: () => import("../views/AiScript/index.vue"),
  },
  {
    path: "/battle-record",
    name: "BattleRecord",
    component: () => import("../views/BattleRecord/index.vue"),
  },
  {
    path: "/battle-win-rate",
    name: "BattleWinRate",
    component: () => import("../views/BattleWinRate/index.vue"),
  },
  // 新增：关卡模式路由
  {
    path: "/levels",
    name: "LevelSelect",
    component: () => import("../views/LevelMode/index.vue"),
  },
  {
    path: "/level/:id",
    name: "LevelGame",
    component: () => import("../views/LevelMode/LevelGame.vue"),
  },
  {
    path: "/user-list",
    name: "UserList",
    component: () => import("../views/UserList/index.vue"),
  },
  {
    path: "/guide",
    name: "Guide",
    component: () => import("../views/Guide/index.vue"),
  },
];

const router = createRouter({
  history:
    process.env.NODE_ENV === "production"
      ? createWebHistory("/tanker")
      : createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to.name === "TankGame") {
    clearLevelMode();
  }
  const token = to.query.token;
  setToken(token);
  if (token) {
    try {
      const res = await getUserInfoByToken(token);
      if (res.code !== 200) {
        throw new Error(res.message || "获取用户信息失败");
      }
      const userInfo = res.data;
      setUserInfo(userInfo);
    } catch (err) {
      setUserInfo({});
      console.error("获取用户信息失败:", err);
    }
  }
  next();
});

export default router;
