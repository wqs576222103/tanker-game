<template>
  <div class="level-mode-wrap">
    <div class="header">
      <h1 class="title">关 卡 模 式</h1>
      <button class="back-btn" @click="goBack">返回主菜单</button>
    </div>

    <div class="level-grid">
      <div
        v-for="level in levels"
        :key="level.id"
        class="level-card"
        :class="{ locked: !isUnlocked(level.id) }"
        @click="selectLevel(level)"
      >
        <div class="level-number">{{ level.id }}</div>
        <div class="level-name">{{ level.name }}</div>
        <div class="level-desc">{{ level.description }}</div>
        <div class="level-objective">
          <span class="obj-icon">🎯</span>
          <span>{{ level.objective.description }}</span>
        </div>
        <div class="level-bottom">
          <template v-if="employeeId">
            <div class="level-stats" v-if="globalBestRecords[level.id]">
              <div class="global-best">
                <span class="best-label">🏆最佳记录</span>
                <span class="best-separator">·</span>
                <span class="best-username">{{
                  globalBestRecords[level.id].username
                }}</span>
                <span class="best-time"
                  >用时：{{
                    formatTime(globalBestRecords[level.id].bestTime)
                  }}</span
                >
              </div>
            </div>
            <div class="level-stats" v-else-if="getLevelBestTime(level.id)">
              <span class="personal-best"
                >⏱ 个人最佳 用时：{{
                  formatTime(getLevelBestTime(level.id))
                }}</span
              >
            </div>
            <div v-else class="level-stats">
              <span class="no-record">暂无记录</span>
            </div>
          </template>
          <div class="level-stats" v-else-if="getLevelBestTime(level.id)">
            <span class="personal-best"
              >⏱ 最佳用时：{{ formatTime(getLevelBestTime(level.id)) }}</span
            >
          </div>
          <div class="level-stats" v-else>
            <span class="no-record"></span>
          </div>
          <div class="level-action" v-if="!isUnlocked(level.id)">
            <span class="lock-icon">🔒</span>
          </div>
          <div class="level-action play" v-else>
            <span class="play-icon">▶</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tips">
      <p>💡 提示：完成关卡后将解锁下一关</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { getToken, getUserInfo } from "@/utils/user";
import {
  getUserBestLevelRecords,
  getGlobalBestLevelRecords,
} from "@/api/levelRecord";
import {
  LEVELS,
  isLevelUnlocked,
  getUnlockedLevel,
} from "../TankGame/script/levels.js";

const router = useRouter();
const userInfo = computed(() => getUserInfo());
const employeeId = computed(() => userInfo.value?.employeeId);
const levels = ref(LEVELS);
const userBestTimes = ref({});
const userUnlockedLevel = ref(1);
const globalBestRecords = ref({});

function isUnlocked(levelId) {
  return levelId <= userUnlockedLevel.value;
}

function selectLevel(level) {
  if (!isUnlocked(level.id)) return;
  router.push({
    name: "LevelGame",
    params: { id: level.id },
    query: { token: getToken() },
  });
}

function goBack() {
  router.push({ name: "Home", query: { token: getToken() } });
}

function formatTime(ms) {
  if (ms == null) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getLevelBestTime(levelId) {
  return userBestTimes.value[levelId];
}

function loadLocalLevelRecords() {
  try {
    const records = JSON.parse(
      localStorage.getItem("tank-level-records") || "[]",
    );
    const bestTimes = {};
    for (const record of records) {
      const levelId = record.levelId;
      if (!bestTimes[levelId] || record.durationMs < bestTimes[levelId]) {
        bestTimes[levelId] = record.durationMs;
      }
    }
    return bestTimes;
  } catch {
    return {};
  }
}

async function loadUserLevelData() {
  const token = getToken();
  if (!token) {
    const localBestTimes = loadLocalLevelRecords();
    userBestTimes.value = localBestTimes;
    userUnlockedLevel.value = getUnlockedLevel();
    return;
  }

  try {
    const userInfo = getUserInfo();
    const employeeId = userInfo.employeeId;
    if (!employeeId) return;

    const res = await getUserBestLevelRecords(employeeId);
    if (res.code === 200 && res.data?.list) {
      const records = res.data.list;
      const bestTimes = {};
      let maxUnlocked = 1;

      for (const record of records) {
        const levelId = record.level_id;
        bestTimes[levelId] = record.best_time;
        if (levelId >= maxUnlocked) {
          maxUnlocked = levelId + 1;
        }
      }

      userBestTimes.value = bestTimes;
      userUnlockedLevel.value = Math.min(maxUnlocked, LEVELS.length);
    }
  } catch (err) {
    console.error("加载关卡数据失败:", err);
  }
}

async function loadGlobalBestRecords() {
  try {
    const res = await getGlobalBestLevelRecords();
    if (res.code === 200 && res.data?.list) {
      const records = res.data.list;
      const bestMap = {};
      for (const record of records) {
        bestMap[record.level_id] = {
          username: record.username,
          bestTime: record.best_time,
        };
      }
      globalBestRecords.value = bestMap;
    }
  } catch (err) {
    console.error("加载全局最佳记录失败:", err);
  }
}

onMounted(async () => {
  await Promise.all([loadUserLevelData(), loadGlobalBestRecords()]);
});
</script>

<style scoped>
.level-mode-wrap {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a2118 0%, #2a3a28 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  overflow-y: auto;
}

.header {
  width: 100%;
  max-width: 1200px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.title {
  font-size: 36px;
  color: #ffd76e;
  letter-spacing: 8px;
  text-shadow: 0 0 20px rgba(255, 215, 110, 0.5);
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #cfe3cf;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  width: 100%;
  max-width: 1200px;
  padding: 10px;
}

.level-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.level-card:hover:not(.locked) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 215, 110, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(255, 215, 110, 0.2);
}

.level-card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.level-number {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 48px;
  font-weight: bold;
  color: rgba(255, 215, 110, 0.3);
  line-height: 1;
}

.level-name {
  font-size: 22px;
  color: #ffd76e;
  font-weight: bold;
  letter-spacing: 2px;
}

.level-desc {
  font-size: 14px;
  color: #9fb6a6;
  line-height: 1.6;
}

.level-objective {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #cfe3cf;
  background: rgba(255, 215, 110, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
}

.level-stats {
  font-size: 13px;
  color: #7de07d;
}

.level-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.level-action {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.level-action.play {
  background: rgba(74, 222, 128, 0.2);
}

.global-best {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 215, 110, 0.15);
  padding: 6px 10px;
  border-radius: 8px;
}

.best-label {
  font-size: 12px;
  color: #ffd76e;
  white-space: nowrap;
}

.best-separator {
  color: rgba(255, 255, 255, 0.3);
}

.best-username {
  color: #cfe3cf;
  font-size: 12px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.best-time {
  color: #7de07d;
  font-weight: bold;
  font-size: 13px;
}

.personal-best {
  font-size: 12px;
  color: #9fb6a6;
}

.lock-icon,
.play-icon {
  font-size: 18px;
}

.play-icon {
  color: #4ade80;
}

.lock-icon {
  color: #ff6b6b;
}

.tips {
  margin-top: 30px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: #9fb6a6;
  font-size: 14px;
}

@media (max-width: 768px) {
  .level-grid {
    grid-template-columns: 1fr;
  }

  .title {
    font-size: 24px;
  }
}
</style>
