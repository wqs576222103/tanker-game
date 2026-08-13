import { createRouter, createWebHistory } from "vue-router";
import { getUserInfoByToken } from "@/api";

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
    path: "/tank-game-mobile",
    name: "TankGameMobile",
    component: () => import("../views/TankGame/mobile.vue"),
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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const token = to.query.token;
  if (token) {
    try {
      const userInfo = await getUserInfoByToken(token);
      localStorage.setItem("tanke-userToken", token);
      localStorage.setItem("tanke-userInfo", JSON.stringify(userInfo));
    } catch (err) {
      console.error("获取用户信息失败:", err);
    }
  }
  next();
});

export default router;
