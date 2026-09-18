<template>
  <div class="level-wrap">
    <Map
      :hideAi="true"
      :hideImportAi="true"
      :hideDeathLog="true"
      :hideRefreshMap="true"
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
        <span class="dog-status">
          {{
            dogRescued ? "✓ 已解救" : dogDoorLocked ? "🔒 门已锁" : "🔓 门已开"
          }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import Map from "@/views/TankGame/components/Map/index.vue";
import { setLevelMode } from "@/views/TankGame/script/base/index.js";
import {
  CRACK,
  COLS,
  ROWS,
  protectedKey,
} from "@/views/TankGame/script/base/index.js";
import { useGameTimer } from "./useGameTimer.js";

const emit = defineEmits(["level-complete", "level-failed"]);
const { elapsed, start, stop, format } = useGameTimer();

const level2Map = (() => {
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
  wall(21, 7, 23, 7);
  wall(21, 7, 21, 9);
  wall(23, 7, 23, 9);
  wall(5, 4, 7, 4);
  wall(5, 5, 5, 7);
  wall(36, 4, 38, 4);
  wall(38, 5, 38, 7);
  wall(8, 12, 10, 12);
  wall(8, 13, 8, 15);
  wall(34, 12, 36, 12);
  wall(36, 13, 36, 15);
  wall(6, 20, 8, 20);
  wall(6, 21, 6, 23);
  wall(36, 20, 38, 20);
  wall(38, 21, 38, 23);
  wall(18, 18, 26, 18);
  wall(18, 20, 26, 20);
  wall(18, 18, 18, 20);
  wall(26, 18, 26, 20);
  return m;
})();

function initCrackHp(map) {
  const crackHp = {};
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r] && map[r][c] === CRACK) {
        crackHp[protectedKey(c, r)] = 2 + Math.floor(Math.random() * 2);
      }
    }
  }
  return crackHp;
}

const config = {
  id: 2,
  name: "解救橘猫",
  description: "击杀10个敌人后Boss出现，击败Boss获取钥匙，解救被困的橘猫！",
  map: level2Map,
  crackHp: initCrackHp(level2Map),
  playerSpawn: { c: 22, r: 26 },
  enemySpawns: [
    { c: 5, r: 3 },
    { c: 39, r: 3 },
    { c: 5, r: 15 },
    { c: 39, r: 15 },
  ],
  initialEnemies: 4,
  objective: {
    type: "rescueDog",
    target: 10,
    description: "击杀10个敌人后Boss出现，击败Boss获取钥匙解救橘猫",
  },
  dogCage: {
    dogPosition: { c: 22, r: 8 },
    cageWalls: [
      { c: 21, r: 7 },
      { c: 22, r: 7 },
      { c: 23, r: 7 },
      { c: 21, r: 8 },
      { c: 21, r: 9 },
      { c: 23, r: 8 },
      { c: 23, r: 9 },
    ],
    cageDoor: { c: 22, r: 9 },
  },
  bossThreshold: 10,
  maxEnemies: 6,
  baseEnemyHp: 2,
  playerSpeed: 80,
  enemySpeed: 55,
};

setLevelMode(config);

const kills = ref(0);
const dogRescued = ref(false);
const dogDoorLocked = ref(true);
let dogStatusInterval = null;

function updateDogStatus() {
  dogRescued.value = window.dogRescued || false;
  dogDoorLocked.value = window.dogDoorLocked || false;
  kills.value = window.kills || 0;
}

function handleLevelComplete(e) {
  kills.value = e.detail.kills;
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
  dogStatusInterval = setInterval(updateDogStatus, 200);
});

onUnmounted(() => {
  window.removeEventListener("levelComplete", handleLevelComplete);
  window.removeEventListener("levelFailed", handleLevelFailed);
  if (dogStatusInterval) {
    clearInterval(dogStatusInterval);
    dogStatusInterval = null;
  }
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
.dog-status {
  color: #7de07d;
  font-weight: bold;
}
</style>
