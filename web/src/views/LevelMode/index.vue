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
        <div class="level-stats" v-if="getLevelTime(level.id)">
          <span class="best-time"
            >⏱ {{ formatTime(getLevelTime(level.id)) }}</span
          >
        </div>
        <div v-if="!isUnlocked(level.id)" class="lock-overlay">
          <span class="lock-icon">🔒</span>
          <span class="lock-text">锁定</span>
        </div>
        <div v-else class="unlock-overlay">
          <span class="play-icon">▶</span>
          <span class="play-text">开始</span>
        </div>
      </div>
    </div>

    <div class="tips">
      <p>💡 提示：完成关卡后将解锁下一关</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  LEVELS,
  isLevelUnlocked,
  getLevelTime,
} from "../TankGame/script/levels.js";

const router = useRouter();
const levels = ref(LEVELS);

function isUnlocked(levelId) {
  return isLevelUnlocked(levelId);
}

function selectLevel(level) {
  if (!isUnlocked(level.id)) return;
  router.push({ name: "LevelGame", params: { id: level.id } });
}

function goBack() {
  router.push({ name: "TankGame" });
}

function formatTime(ms) {
  if (!ms) return "";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

onMounted(() => {
  // 可以在这里加载用户进度
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

.best-time {
  font-weight: bold;
}

.lock-overlay,
.unlock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 14px;
  gap: 8px;
}

.lock-icon,
.play-icon {
  font-size: 36px;
}

.play-icon {
  color: #4ade80;
}

.lock-text,
.play-text {
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
}

.lock-text {
  color: #ff6b6b;
}

.play-text {
  color: #4ade80;
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
