import { createRouter, createWebHistory } from "vue-router";
import { getUserInfoByToken } from "@/api";
import { setUserInfo, setToken } from "@/utils/user.js";

const routes = [
  {
    path: "/",
    redirect: "/tank-game",
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
];

const router = createRouter({
  history:
    process.env.NODE_ENV === "production"
      ? createWebHistory("/tanker")
      : createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
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
