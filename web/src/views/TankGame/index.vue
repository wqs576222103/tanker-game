<template>
  <div class="tank-game-wrap">
    <Map></Map>
    <div class="top-right">
      <div v-if="username" class="user-info">姓名：{{ username }}</div>
      <a
        v-if="employeeId"
        class="ranking-link"
        @click.prevent="openWindow(rankingUrl)"
        >排行榜</a
      >
      <!-- <a class="ranking-link" @click.prevent="openWindow(aiScriptUrl)"
        >玩家脚本</a
      >
      <a class="ranking-link" @click.prevent="openWindow(LevelSelectUrl)"
        >关卡模式</a
      >
      <a class="ranking-link battle" @click.prevent="openWindow(tankBattle)"
        >AI坦克对决</a
      > -->
      <button class="ranking-link battle" @click="goGuide">新手教学</button>
      <button class="ranking-link battle" @click="openGameIntro">
        游戏介绍
      </button>
      <button class="ranking-link battle" @click="goBack">更多模式🌟</button>
    </div>
    <GameIntro :visible="showIntro" @close="closeGameIntro">
      <button class="close-btn" @click="closeGameIntro">关 闭</button>
    </GameIntro>
  </div>
</template>
<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getUserInfoByToken } from "@/api";
import { getToken, getUserInfo } from "@/utils/user";
import Map from "./components/Map/index.vue";
import GameIntro from "./components/GameIntro/index.vue";
import { togglePause } from "./script/base.js";

const route = useRoute();
const router = useRouter();
const token = getToken();
const employeeId = ref("");
const username = ref("");
const showIntro = ref(false);
const childWindows = ref({});

const rankingUrl = computed(() => {
  const tokenStr = new URLSearchParams(location.search).get("token");
  const query = tokenStr ? { token: tokenStr } : {};
  return router.resolve({ name: "Ranking", query }).href;
});
const aiScriptUrl = computed(() => {
  const tokenStr = new URLSearchParams(location.search).get("token");
  const query = tokenStr ? { token: tokenStr } : {};
  return router.resolve({ name: "AiScript", query }).href;
});

const LevelSelectUrl = computed(() => {
  const tokenStr = new URLSearchParams(location.search).get("token");
  const query = tokenStr ? { token: tokenStr } : {};
  return router.resolve({ name: "LevelSelect", params: { id: 1 }, query }).href;
});

const tankBattle = computed(() => {
  const tokenStr = new URLSearchParams(location.search).get("token");
  const query = tokenStr ? { token: tokenStr } : {};
  return router.resolve({ name: "BattleArena", query }).href;
});

function openWindow(url) {
  const name = url.split("?")[0];
  if (childWindows.value[name] && !childWindows.value[name].closed) {
    childWindows.value[name].focus();
  } else {
    childWindows.value[name] = window.open(url, name);
  }
}

function goBack() {
  router.push({ name: "Home", query: { token: getToken() } });
}

function goGuide() {
  if (window.state === "playing") {
    togglePause();
  }
  router.push({ name: "Guide", query: { token: getToken() } });
}

onMounted(async () => {
  if (token) {
    try {
      const userInfo = getUserInfo();
      employeeId.value = userInfo.employeeId || "";
      username.value = userInfo.username || "";
    } catch (err) {
      console.error("获取用户信息失败:", err);
    }
  }
});

function openGameIntro() {
  if (window.state === "playing") {
    togglePause();
  }
  showIntro.value = true;
}

function closeGameIntro() {
  showIntro.value = false;
}
</script>

<style scoped>
.tank-game-wrap {
  position: absolute;
  inset: 0;
}
.top-right {
  position: absolute;
  top: 8px;
  right: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-info {
  background: rgba(255, 255, 255, 0.1);
  color: #cfe3cf;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 14px;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.ranking-link {
  background: rgba(255, 255, 255, 0.1);
  color: #cfe3cf;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 14px;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  text-decoration: none;
  cursor: pointer;
}
.ranking-link:hover {
  background: rgba(255, 255, 255, 0.2);
}
.battle {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 14px;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s;
}
.level-mode-link {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 14px;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s;
}
.level-mode-link:hover {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  transform: scale(1.05);
}
.game-intro-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #cfe3cf;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 14px;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
}
.game-intro-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
.close-btn {
  background: #4ade80;
  color: #1a1a2e;
  border: none;
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 20px;
  transition: all 0.3s;
}
.close-btn:hover {
  background: #22c55e;
  transform: scale(1.05);
}
</style>
