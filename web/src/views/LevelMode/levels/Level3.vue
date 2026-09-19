<template>
  <div class="level-wrap">
    <Map
      :hideAi="true"
      :hideImportAi="true"
      :hideDeathLog="true"
      :hideRefreshMap="true"
      :hideItemLegend="true"
      :title="config.name"
    />
    <div class="game-timer">{{ format(elapsed) }}</div>
    <div class="level-hud">
      <div class="objective-bar">
        <span class="level-tag">{{ config.id }}. {{ config.name }}</span>
      </div>
      <div class="objective-text">{{ config.objective.description }}</div>
      <div class="progress-bar">
        <span class="portal-status">{{ reachedPortal ? "✓ 到达传送门" : "寻找传送门" }}</span>
      </div>
      <div class="legend">
        <div class="legend-item"><span class="legend-color spike"></span> 尖刺(持续伤害)</div>
        <div class="legend-item"><span class="legend-color falling"></span> 落石(定时下砸)</div>
        <div class="legend-item"><span class="legend-color door"></span> 门(需压住开关)</div>
        <div class="legend-item"><span class="legend-color sw"></span> 开关(需木箱/坦克压住)</div>
        <div class="legend-item"><span class="legend-color crate"></span> 木箱(可推动)</div>
        <div class="legend-item"><span class="legend-color portal"></span> 传送门(终点)</div>
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
  id: 3,
  name: "迷宫机关城",
  map: generateMazeMap(),
  crackHp: {},
  playerSpawn: { c: 1, r: 28 },
  enemySpawns: [
    { c: 10, r: 26 },
    { c: 10, r: 12 },
    { c: 30, r: 12 },
    { c: 30, r: 26 },
    { c: 40, r: 8 },
  ],
  initialEnemies: 5,
  objective: { type: "reachPortal", target: 1, description: "到达传送门" },
  maxEnemies: 5,
  baseEnemyHp: 3,
  playerSpeed: 100,
  enemySpeed: 60,
  special: "maze",
  noRespawn: true,
  switchLinks: {
    "36,8": ["22,14"],
  },
  crates: [
    { c: 36, r: 6 },
  ],
};

setLevelMode(config);

const reachedPortal = ref(false);

function generateMazeMap() {
  const E = 0, W = 1, G = 2, B = 3;
  const SP = 6, SK = 7, FL = 8, DR = 9, SW = 10;
  const COLS = 45, ROWS = 30;

  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push((r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) ? B : E);
    }
    map.push(row);
  }

  const sc = (c, r, v) => { if (r >= 0 && r < ROWS && c >= 0 && c < COLS) map[r][c] = v; };
  const hw = (c1, c2, r) => { for (let c = c1; c <= c2; c++) sc(c, r, W); };
  const vw = (c, r1, r2) => { for (let r = r1; r <= r2; r++) sc(c, r, W); };

  hw(0, 20, 2);
  hw(24, 44, 2);
  vw(20, 2, 4);
  vw(24, 2, 4);

  hw(4, 18, 6); vw(4, 6, 12);
  hw(4, 10, 12);
  vw(18, 6, 14);

  hw(24, 40, 6); vw(24, 6, 12);
  hw(34, 40, 12);
  vw(40, 6, 14);

  hw(14, 20, 10); vw(14, 10, 14);
  hw(24, 30, 10); vw(30, 10, 14);

  hw(0, 20, 14); hw(24, 44, 14);

  vw(10, 16, 22); hw(10, 20, 22);
  vw(20, 16, 22);
  vw(30, 16, 22); hw(24, 34, 16);
  hw(34, 40, 22); vw(40, 16, 22);

  hw(4, 14, 22); vw(4, 22, 28);
  vw(14, 22, 28);

  hw(24, 40, 28); vw(24, 22, 28);
  vw(34, 22, 28);

  hw(20, 24, 24);

  sc(10, 20, SK); sc(11, 20, SK); sc(12, 20, SK);
  sc(32, 20, SK); sc(33, 20, SK); sc(34, 20, SK);

  sc(38, 8, SW);

  sc(20, 14, DR);

  sc(22, 1, G);

  sc(1, 28, E); sc(2, 28, E);

  return map;
}

function handleLevelComplete(e) {
  reachedPortal.value = true;
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
.level-wrap { position: absolute; inset: 0; }
.game-timer {
  position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 20;
  background: rgba(0,0,0,0.5); color: #ffd76e; padding: 6px 20px; border-radius: 20px;
  font-size: 16px; font-weight: bold; letter-spacing: 2px; border: 1px solid rgba(255,215,110,0.3);
}
.level-hud {
  position: absolute; top: 100px; width: 300px; left: 20px; z-index: 20;
  display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.6);
  padding: 12px 24px; border-radius: 12px; border: 1px solid rgba(255,215,110,0.3);
}
.objective-bar { display: flex; align-items: center; gap: 16px; }
.level-tag { font-size: 14px; color: #ffd76e; font-weight: bold; letter-spacing: 2px; }
.objective-text { font-size: 13px; color: #cfe3cf; }
.progress-bar { display: flex; gap: 16px; font-size: 13px; }
.portal-status { color: #78c8ff; font-weight: bold; }
.legend { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; font-size: 11px; color: #9fb6a6; }
.legend-item { display: flex; align-items: center; gap: 8px; }
.legend-color { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }
.legend-color.spike { background: rgba(255,80,80,0.6); }
.legend-color.falling { background: rgba(150,120,80,0.6); }
.legend-color.door { background: #8B4513; }
.legend-color.sw { background: #AA0000; border: 1px solid #FFD700; }
.legend-color.crate { background: #A0791A; border: 1px solid #6B5010; }
.legend-color.portal { background: rgba(40,90,140,0.7); }
</style>
