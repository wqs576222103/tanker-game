<template>
  <div class="level-wrap">
    <Map
      :hideAi="true"
      :hideImportAi="true"
      :hideDeathLog="true"
      :title="config.name"
    />

    <div class="game-timer">{{ format(elapsed) }}</div>

    <div class="level-hud">
      <div class="objective-bar">
        <span class="level-tag">{{ config.id }}. {{ config.name }}</span>
      </div>
      <div class="objective-text">{{ config.objective.description }}</div>
      <div class="progress-bar">
        <span class="kills">击杀: {{ kills }}</span>
        <span class="flag-status">{{
          flagCaptured ? "✓ 已夺取" : "待夺取"
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import Map from "@/views/TankGame/components/Map/index.vue";
import { setLevelMode } from "@/views/TankGame/script/base/index.js";
import { useGameTimer } from "./useGameTimer.js";

const emit = defineEmits(["level-complete", "level-failed"]);
const { elapsed, start, stop, format } = useGameTimer();

const config = {
  id: 1,
  name: "夺旗精英",
  map: level1Map(),
  crackHp: {},
  playerSpawn: { c: 22, r: 26 },
  enemySpawns: [
    { c: 5, r: 3 },
    { c: 39, r: 3 },
  ],
  initialEnemies: 4,
  flag: {
    x: 22 * 20,
    y: 3 * 20,
    team: "enemy",
  },
  flagWallCells: [
    { c: 22, r: 2 },
    { c: 21, r: 3 },
    { c: 23, r: 3 },
    { c: 22, r: 4 },
  ],
  objective: {
    type: "captureFlag",
    target: 5,
    description: "击杀5名敌人后夺取旗帜",
  },
  maxEnemies: 6,
  baseEnemyHp: 2,
  playerSpeed: 80,
  enemySpeed: 55,
};

setLevelMode(config);

const kills = ref(0);
const flagCaptured = ref(false);

function level1Map() {
  const R = 30,
    C = 45;
  const m = [];
  for (let r = 0; r < R; r++) {
    const row = [];
    for (let c = 0; c < C; c++) {
      if (r === 0 || r === R - 1 || c === 0 || c === C - 1) row.push(3);
      else row.push(0);
    }
    m.push(row);
  }
  const set = (c, r, v) => {
    if (m[r]) m[r][c] = v;
  };
  const wall = (c1, r1, c2, r2) => {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) set(c, r, 1);
  };
  wall(5, 5, 7, 5);
  wall(5, 6, 5, 8);
  wall(36, 5, 38, 5);
  wall(38, 6, 38, 8);
  wall(10, 12, 12, 12);
  wall(10, 13, 10, 15);
  wall(32, 12, 34, 12);
  wall(34, 13, 34, 15);
  wall(20, 14, 24, 14);
  wall(20, 16, 24, 16);
  wall(20, 14, 20, 16);
  wall(24, 14, 24, 16);
  wall(8, 22, 10, 22);
  wall(8, 23, 8, 25);
  wall(34, 22, 36, 22);
  wall(36, 23, 36, 25);
  set(22, 2, 1);
  set(21, 3, 1);
  set(23, 3, 1);
  set(22, 4, 1);
  return m;
}

function handleLevelComplete(e) {
  kills.value = e.detail.kills;
  flagCaptured.value = true;
  const time = stop();
  emit("level-complete", { ...e.detail, time });
}

function handleLevelFailed(e) {
  stop();
  emit("level-failed", e.detail);
}

onMounted(() => {
  start();
  window.addEventListener("levelComplete", handleLevelComplete);
  window.addEventListener("levelFailed", handleLevelFailed);
});

onUnmounted(() => {
  window.removeEventListener("levelComplete", handleLevelComplete);
  window.removeEventListener("levelFailed", handleLevelFailed);
});
</script>

<style scoped>
.level-wrap {
  position: absolute;
  inset: 0;
}
.game-timer {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  background: rgba(0, 0, 0, 0.5);
  color: #ffd76e;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
  border: 1px solid rgba(255, 215, 110, 0.3);
}
.level-hud {
  position: absolute;
  top: 100px;
  width: 300px;
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
</style>
