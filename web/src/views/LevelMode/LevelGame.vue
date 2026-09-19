<template>
  <div class="level-game-wrap">
    <component
      v-if="levelComponent"
      :is="levelComponent"
      :key="retryKey"
      @level-complete="onLevelComplete"
      @level-failed="onLevelFailed"
    />

    <button class="btn-back-top" @click="backToSelect">返回关卡选择</button>

    <div class="overlay hidden" id="ov-level-complete">
      <h1>关 卡 完 成 ！</h1>
      <p class="stats">击杀数: {{ finalKills }}</p>
      <p class="stats" v-if="levelTime > 0">
        用时: {{ formatTime(levelTime) }}
      </p>
      <button id="btn-next-level" @click="nextLevel">下一关</button>
      <button id="btn-retry" @click="retryLevel">重新挑战</button>
      <button id="btn-back" class="secondary" @click="backToSelect">
        返回关卡选择
      </button>
    </div>

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
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import { getToken, getUserInfo } from "@/utils/user";
import { saveLevelRecord } from "@/api/levelRecord";
import { LEVELS, unlockNextLevel } from "@/views/TankGame/script/levels.js";
import { clearLevelMode } from "@/views/TankGame/script/base/index.js";
import { AIPlayer } from "@/views/TankGame/script/ai-player.js";
import LevelAI from "@/views/TankGame/script/ai-tanker/level-tank.js";
import Level1 from "./levels/Level1.vue";
import Level2 from "./levels/Level2.vue";
import Level3 from "./levels/Level3.vue";

const route = useRoute();
const router = useRouter();
const token = getToken();
const levelId = computed(() => parseInt(route.params.id));
const employeeId = ref("");
const username = ref("");

const levelComponents = { 1: Level1, 2: Level2, 3: Level3 };
const levelComponent = computed(() => levelComponents[levelId.value]);

const levelConfig = computed(() => LEVELS.find((l) => l.id === levelId.value));
const levelTime = ref(0);
const finalKills = ref(0);
const deathReason = ref("");
const retryKey = ref(0);

if (!levelConfig.value) {
  clearLevelMode();
  router.replace({ name: "LevelSelect" });
}

onBeforeRouteLeave(() => {
  clearLevelMode();
});

function onLevelComplete(detail) {
  levelTime.value = detail.time;
  finalKills.value = detail.kills;
  unlockNextLevel(levelId.value);

  const record = {
    employeeId: employeeId.value,
    username: username.value,
    levelId: levelId.value,
    kills: detail.kills,
    durationMs: detail.time,
  };

  if (employeeId.value) {
    saveLevelRecord(record).catch((err) => {
      console.error("保存关卡记录失败:", err);
    });
  } else {
    saveLevelRecordToLocal(record);
  }

  document.getElementById("ov-level-complete").classList.remove("hidden");
}

function saveLevelRecordToLocal(record) {
  try {
    const records = JSON.parse(
      localStorage.getItem("tank-level-records") || "[]",
    );
    records.push({
      ...record,
      create_time: new Date().toISOString(),
    });
    localStorage.setItem("tank-level-records", JSON.stringify(records));
  } catch (err) {
    console.error("保存本地关卡记录失败:", err);
  }
}

function onLevelFailed(detail) {
  deathReason.value = detail.reason;
  document.getElementById("ov-level-failed").classList.remove("hidden");
}

function nextLevel() {
  const nextId = levelId.value + 1;
  if (!LEVELS.find((l) => l.id === nextId)) {
    router.push({ name: "LevelSelect" });
    return;
  }
  window.flagPosition = null;
  window.flagCaptured = false;
  window.flagCarrier = null;
  router.push({ name: "LevelGame", params: { id: nextId } });
}

function retryLevel() {
  document.getElementById("ov-level-complete").classList.add("hidden");
  document.getElementById("ov-level-failed").classList.add("hidden");
  retryKey.value++;
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
  if (!levelConfig.value) return;

  if (token) {
    try {
      const userInfo = getUserInfo();
      employeeId.value = userInfo.employeeId || "";
      username.value = userInfo.username || "";
    } catch (err) {
      console.error("获取用户信息失败:", err);
    }
  }

  if (AIPlayer.enabled) {
    AIPlayer.toggle();
  }
  AIPlayer.setDefault(LevelAI);
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
  padding: 8px;
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
  padding: 12px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 24px;
  cursor: pointer;
  letter-spacing: 3px;
  transition: all 0.3s;
  width: 200px;
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
  .overlay h1 {
    font-size: 28px;
  }

  button {
    padding: 12px;
    font-size: 16px;
  }
}
</style>
