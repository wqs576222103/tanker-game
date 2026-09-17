<template>
  <div class="guide-wrap">
    <Map ref="mapRef" :hideAi="true" :hideSpeed="true" :hideImportAi="true" :hideDeathLog="true" title="新 手 教 学" />

    <div v-if="started && !completed" class="tutorial-hud">
      <div class="step-indicator">
        <span v-for="(_, i) in steps" :key="i" class="dot" :class="{ active: i === step, done: i < step }"></span>
      </div>
      <div class="tutorial-panel">
        <div class="step-title">Step {{ step + 1 }}/{{ steps.length }}：{{ steps[step].title }}</div>
        <div class="step-instruction">{{ steps[step].text }}</div>
        <button class="skip-btn" @click="skipStep">跳过此步 →</button>
      </div>
    </div>

    <div v-if="completed" class="tutorial-complete">
      <div class="complete-content">
        <h2>🎉 教学完成！</h2>
        <p>你已掌握所有基础操作</p>
        <button class="play-btn" @click="startFreePlay">开始自由游戏</button>
        <button class="back-btn" @click="goBack">返回主页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { getToken } from "@/utils/user";
import Map from "@/views/TankGame/components/Map/index.vue";
import {
  initGame,
  CELL,
  CRACK,
  GRASS,
  spawnItemAtCell,
} from "@/views/TankGame/script/base.js";

const router = useRouter();
const mapRef = ref(null);
const started = ref(false);
const completed = ref(false);
const step = ref(0);
const grassEntered = ref(false);
const minePickedUp = ref(false);
const shieldPickedUp = ref(false);
let mineSpawned = false;
let shieldSpawned = false;
let enemiesSpawned = false;

// ── 坐标常量 ──
const TARGET_MOVE = { r: 15, c: 33 };
const WALL_TARGET = { r: 15, c: 12 };
const MINE_TARGET = { r: 14, c: 20 };
const MINE_ITEM_POS = { r: 14, c: 20 };
const SHIELD_POS = { r: 17, c: 26 };
const HEAL_POS = { r: 17, c: 18 };
const GRASS_POS = { r: 22, c: 4 };

const steps = [
  {
    title: "移动",
    text: "使用 方向键 或 WASD 将坦克移动到绿色标记处",
    target: TARGET_MOVE,
    validate: () => {
      const p = window.player;
      if (!p) return false;
      const cc = cellOf(p);
      return cc.c >= TARGET_MOVE.c && cc.r === TARGET_MOVE.r;
    },
  },
  {
    title: "射击",
    text: "按 空格键 或 J 向黄色砖墙射击，将其击碎",
    target: WALL_TARGET,
    validate: () => {
      const m = window.map;
      return m && m[WALL_TARGET.r]?.[WALL_TARGET.c] !== CRACK;
    },
  },
  {
    title: "拾取地雷",
    text: "移动到绿色标记处拾取 💣 地雷",
    target: MINE_TARGET,
    validate: () => minePickedUp.value,
  },
  {
    title: "拾取道具",
    text: "移动到绿色标记处拾取 🛡️ 护盾",
    target: SHIELD_POS,
    validate: () => shieldPickedUp.value,
  },
  {
    title: "草丛隐蔽",
    text: "进入绿色草丛区域，坦克将被隐藏",
    target: GRASS_POS,
    validate: () => grassEntered.value,
  },
  {
    title: "消灭敌人",
    text: "找到并击中敌方坦克，消灭全部敌人完成教学",
    target: null,
    validate: () => {
      const alive = (window.tanks || []).filter((t) => !t.isPlayer && t.alive);
      return alive.length === 0;
    },
  },
];

// ── 工具 ──
function cellOf(p) {
  return {
    c: Math.floor((p.x + p.w / 2) / CELL),
    r: Math.floor((p.y + p.h / 2) / CELL),
  };
}

// ── 自定义教学地图 ──
function createTutorialMap() {
  const R = 30, C = 45;
  const m = [];
  for (let r = 0; r < R; r++) {
    const row = [];
    for (let c = 0; c < C; c++) {
      if (r === 0 || r === R - 1 || c === 0 || c === C - 1) row.push(3);
      else row.push(0);
    }
    m.push(row);
  }
  const set = (c, r, v) => { if (m[r]) m[r][c] = v; };

  // 银色墙壁（不可摧毁）
  set(10, 5, 1); set(11, 5, 1);
  set(33, 5, 1); set(34, 5, 1);
  set(5, 12, 1);
  set(39, 12, 1);
  set(15, 22, 1); set(16, 22, 1);
  set(28, 22, 1); set(29, 22, 1);
  set(20, 28, 1); set(21, 28, 1); set(22, 28, 1); set(23, 28, 1);

  // 黄色砖墙（射击目标）
  set(WALL_TARGET.c, WALL_TARGET.r, 4);

  // 草丛
  for (let r = 21; r <= 23; r++)
    for (let c = 3; c <= 5; c++) set(c, r, 5);

  return m;
}

// ── 初始化 ──
function setupTutorialGame() {
  window.tutorialMode = true;
  window.tutorialGateBlock = true;
  window.tutorialSpawnEnemies = false;
  // 敌人刷新在开阔区域，不在左右上角
  window.tutorialEnemySpawns = [
    { c: 15, r: 10 },
    { c: 30, r: 10 },
  ];
  window.tutorialHooks = {
    update: tutorialUpdate,
    render: tutorialRender,
  };
  initGame();
  window.map = createTutorialMap();
}

// ── 每帧更新 ──
function tutorialUpdate() {
  if (window.state !== "playing" || completed.value) return;

  // 阻止传送门
  if (window.gates) window.gates.length = 0;

  // 按步骤生成道具
  if (step.value === 2 && !mineSpawned) {
    mineSpawned = true;
    spawnItemAtCell(MINE_ITEM_POS.c, MINE_ITEM_POS.r, "mine");
  }
  if (step.value === 3 && !shieldSpawned) {
    shieldSpawned = true;
    spawnItemAtCell(SHIELD_POS.c, SHIELD_POS.r, "shield");
  }

  // 消灭敌人步骤才生成敌人
  if (step.value === 5 && !enemiesSpawned) {
    enemiesSpawned = true;
    window.tutorialSpawnEnemies = true;
  }

  const p = window.player;
  if (!p || !p.alive) return;

  // ── 检测必须放在 updateItems 之后（update 已处理）──
  if (!minePickedUp.value && (p.mines || 0) > 0) {
    minePickedUp.value = true;
  }
  if (!shieldPickedUp.value && (p.shieldT || 0) > (window.gtMs || 0)) {
    shieldPickedUp.value = true;
  }

  const cc = cellOf(p);
  if (window.map?.[cc.r]?.[cc.c] === GRASS) grassEntered.value = true;

  // 校验当前步骤
  if (step.value < steps.length && steps[step.value].validate()) {
    if (step.value < steps.length - 1) {
      step.value++;
    } else {
      completed.value = true;
    }
  }
}

// ── 画布渲染标记 ──
function tutorialRender(ctx) {
  if (window.state !== "playing" || completed.value) return;
  const s = steps[step.value];

  const t = performance.now();
  const pulse = Math.sin(t / 300) * 0.3 + 0.7;

  // 当前步骤目标标记（有 target 时）
  if (s?.target) {
    const x = s.target.c * CELL;
    const y = s.target.r * CELL;

    ctx.save();
    // 底色光晕
    ctx.globalAlpha = pulse * 0.45;
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(x - 6, y - 6, CELL + 12, CELL + 12);
    // 边框
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 3, y - 3, CELL + 6, CELL + 6);
    // 箭头 ▼ - 更大更醒目
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("▼", x + CELL / 2, y - 10);
    ctx.restore();
  }

  // 消灭敌人步骤：显示敌人位置标记
  if (step.value === 5) {
    const aliveEnemies = (window.tanks || []).filter((t) => !t.isPlayer && t.alive);
    for (const enemy of aliveEnemies) {
      const cx = enemy.x + enemy.w / 2;
      const cy = enemy.y + enemy.h / 2;
      const r = CELL * 1.2;

      ctx.save();
      // 红色脉冲圆圈标记敌人位置
      ctx.globalAlpha = pulse * 0.35;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // 向下箭头指示
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText("▼", cx, cy - r - 4);
      ctx.restore();
    }
  }
}

// ── 操作 ──
function skipStep() {
  if (step.value < steps.length - 1) {
    step.value++;
  } else {
    completed.value = true;
  }
}

function cleanup() {
  window.tutorialMode = false;
  window.tutorialGateBlock = false;
  window.tutorialEnemySpawns = null;
  window.tutorialHooks = { update: null, render: null };
  window.tutorialSpawnEnemies = false;
}

function startFreePlay() {
  cleanup();
  router.push({ name: "TankGame", query: { token: getToken() } });
}

function goBack() {
  cleanup();
  router.push({ name: "Home", query: { token: getToken() } });
}

onMounted(async () => {
  await nextTick();
  setupTutorialGame();
  started.value = true;
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
.guide-wrap {
  position: absolute;
  inset: 0;
}
.tutorial-hud {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}
.step-indicator {
  display: flex;
  gap: 8px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: all 0.3s;
}
.dot.active {
  background: #4ade80;
  border-color: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
}
.dot.done {
  background: #22c55e;
  border-color: #22c55e;
}
.tutorial-panel {
  background: rgba(10, 15, 20, 0.92);
  border: 1px solid rgba(74, 222, 128, 0.4);
  border-radius: 12px;
  padding: 16px 24px;
  text-align: center;
  color: #e2e8f0;
  min-width: 320px;
  pointer-events: auto;
}
.step-title {
  font-size: 15px;
  font-weight: bold;
  color: #4ade80;
  margin-bottom: 6px;
  letter-spacing: 1px;
}
.step-instruction {
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.6;
  margin-bottom: 10px;
}
.skip-btn {
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.3);
  padding: 5px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.skip-btn:hover {
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.6);
}
.tutorial-complete {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
}
.complete-content {
  background: #1a1a2e;
  border: 2px solid #4ade80;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  color: white;
}
.complete-content h2 {
  color: #4ade80;
  font-size: 28px;
  margin-bottom: 10px;
}
.complete-content p {
  color: #94a3b8;
  margin-bottom: 24px;
}
.play-btn {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: #fff;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin: 0 8px;
  transition: all 0.3s;
}
.play-btn:hover {
  transform: scale(1.05);
}
.back-btn {
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.3);
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin: 0 8px;
  transition: all 0.3s;
}
.back-btn:hover {
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.6);
}
</style>
