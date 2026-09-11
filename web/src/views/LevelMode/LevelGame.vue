<template>
  <div class="level-game-wrap" :class="{ 'level-mode': levelConfig }">
    <Map></Map>

    <!-- 返回按钮 -->
    <button class="btn-back-top" @click="backToSelect">返回</button>

    <!-- 关卡目标HUD -->
    <div class="level-hud" v-if="levelConfig">
      <div class="objective-bar">
        <span class="level-tag"
          >{{ levelConfig.id }}. {{ levelConfig.name }}</span
        >
      </div>
      <div class="objective-text">
        {{ levelConfig.objective.description }}
      </div>
      <div class="progress-bar">
        <span class="kills">击杀: {{ kills }}</span>
        <span
          class="flag-status"
          v-if="levelConfig.objective.type === 'captureFlag'"
        >
          {{ flagCaptured ? "✓ 已夺取" : "待夺取" }}
        </span>
      </div>
    </div>

    <!-- 关卡完成遮罩 -->
    <div class="overlay hidden" id="ov-level-complete">
      <h1>关 卡 完 成 ！</h1>
      <p class="stats">击杀数: {{ kills }}</p>
      <p class="stats" v-if="levelTime > 0">
        用时: {{ formatTime(levelTime) }}
      </p>
      <button id="btn-next-level" @click="nextLevel">下一关</button>
      <button id="btn-retry" @click="retryLevel">重试</button>
      <button id="btn-back" class="secondary" @click="backToSelect">
        返回关卡选择
      </button>
    </div>

    <!-- 关卡失败遮罩 -->
    <div class="overlay hidden" id="ov-level-failed">
      <h2>关 卡 失 败</h2>
      <p id="ov-level-failed-reason">{{ deathReason }}</p>
      <button id="btn-retry-failed" @click="retryLevel">重新挑战</button>
      <button id="btn-back-failed" class="secondary" @click="backToSelect">
        返回关卡选择
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getToken, getUserInfo } from "@/utils/user";
import Map from "@/views/TankGame/components/Map/index.vue";
import {
  LEVELS,
  unlockNextLevel,
  saveLevelTime,
} from "@/views/TankGame/script/levels.js";
import {
  setLevelMode,
  clearLevelMode,
  startGame,
} from "@/views/TankGame/script/base.js";
import { initGame } from "@/views/TankGame/script/base.js";
import { AIPlayer } from "@/views/TankGame/script/ai-player.js";
import LevelAI from "@/views/TankGame/script/ai-tanker/level-tank.js";

const route = useRoute();
const router = useRouter();
const token = getToken();
const levelId = computed(() => parseInt(route.params.id));
const employeeId = ref("");
const username = ref("");

const levelConfig = ref(null);
const kills = ref(0);
const levelTime = ref(0);
const flagCaptured = ref(false);
const deathReason = ref("");

// 监听关卡完成事件
function handleLevelComplete(e) {
  levelTime.value = e.detail.time;
  kills.value = e.detail.kills;

  // 解锁下一关
  const nextLevel = unlockNextLevel(levelId.value);

  // 保存关卡时间
  saveLevelTime(levelId.value, e.detail.time);

  // 显示完成界面
  document.getElementById("ov-level-complete").classList.remove("hidden");
}

// 监听关卡失败事件
function handleLevelFailed(e) {
  deathReason.value = e.detail.reason;
  document.getElementById("ov-level-failed").classList.remove("hidden");
}

function nextLevel() {
  const nextId = levelId.value + 1;
  const nextLevel = LEVELS.find((l) => l.id === nextId);
  if (!nextLevel) {
    // 所有关卡完成，返回选择页
    router.push({ name: "LevelSelect" });
    return;
  }
  router.push({ name: "LevelGame", params: { id: nextId } });
}

function retryLevel() {
  // 重置关卡状态
  clearLevelMode();
  setLevelMode(levelConfig.value);

  // 重新开始游戏
  startGame();

  // 隐藏遮罩
  document.getElementById("ov-level-complete").classList.add("hidden");
  document.getElementById("ov-level-failed").classList.add("hidden");
}

function backToSelect() {
  clearLevelMode();
  router.push({ name: "LevelSelect" });
}

function formatTime(ms) {
  if (!ms) return "0:00";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
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

  // 加载关卡配置
  levelConfig.value = LEVELS.find((l) => l.id === levelId.value);
  if (!levelConfig.value) {
    router.push({ name: "LevelSelect" });
    return;
  }

  // 设置关卡模式
  setLevelMode(levelConfig.value);
  // 关卡模式使用专属AI
  AIPlayer.setDefault(LevelAI);

  // 监听事件
  window.addEventListener("levelComplete", handleLevelComplete);
  window.addEventListener("levelFailed", handleLevelFailed);

  // 初始化游戏
  initGame();
});

onUnmounted(() => {
  window.removeEventListener("levelComplete", handleLevelComplete);
  window.removeEventListener("levelFailed", handleLevelFailed);
  clearLevelMode();
});
</script>

<style scoped>
.level-game-wrap {
  position: absolute;
  inset: 0;
}

.btn-back-top {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 30;
  background: rgba(0, 0, 0, 0.5);
  color: #cfe3cf;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 20px;
  font-size: 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  letter-spacing: 1px;
}

.btn-back-top:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 215, 110, 0.5);
  color: #ffd76e;
}

.level-hud {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.6);
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 110, 0.3);
}

.objective-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.level-tag {
  font-size: 14px;
  color: #ffd76e;
  font-weight: bold;
  letter-spacing: 2px;
}

.objective-text {
  font-size: 13px;
  color: #cfe3cf;
}

.progress-bar {
  display: flex;
  gap: 16px;
  font-size: 13px;
}

.kills {
  color: #7de07d;
}

.flag-status {
  color: #ffd76e;
  font-weight: bold;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(8, 12, 16, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #d7e6d7;
  text-align: center;
  padding: 20px;
  gap: 16px;
  z-index: 100;
}

.overlay h1 {
  font-size: 42px;
  color: #ffd76e;
  letter-spacing: 6px;
  text-shadow: 0 0 20px rgba(255, 215, 110, 0.6);
}

.overlay h2 {
  font-size: 32px;
  color: #ff7b6e;
}

.stats {
  font-size: 18px;
  color: #9fb6a6;
}

#ov-level-failed-reason {
  font-size: 16px;
  color: #ff6b6b;
}

button {
  background: #e0a93a;
  color: #1c1408;
  border: none;
  padding: 12px 40px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 24px;
  cursor: pointer;
  letter-spacing: 3px;
  transition: all 0.3s;
}

button:hover {
  background: #ffd76e;
  transform: scale(1.05);
}

button.secondary {
  background: transparent;
  color: #cfe3cf;
  border: 1px solid #4a5a4a;
}

button.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.hidden {
  display: none !important;
}

@media (max-width: 768px) {
  .level-hud {
    width: 90%;
    padding: 8px 16px;
  }

  .objective-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .overlay h1 {
    font-size: 28px;
  }

  button {
    padding: 10px 30px;
    font-size: 16px;
  }
}
</style>
