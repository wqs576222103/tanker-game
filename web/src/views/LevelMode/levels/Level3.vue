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
        <div class="legend-item"><canvas ref="legendSpike" width="20" height="20"></canvas> 尖刺(持续伤害)</div>
        <div class="legend-item"><canvas ref="legendFalling" width="20" height="20"></canvas> 落石(定时下砸)</div>
        <div class="legend-item"><canvas ref="legendDoor" width="20" height="20"></canvas> 石门(需压住开关才打开)</div>
        <div class="legend-item"><canvas ref="legendSwitch" width="20" height="20"></canvas> 开关(需木箱/坦克压住)</div>
        <div class="legend-item"><canvas ref="legendCrate" width="20" height="20"></canvas> 木箱(可推动)</div>
        <div class="legend-item"><canvas ref="legendPortal" width="20" height="20"></canvas> 传送门(终点)</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import Map from "@/views/TankGame/components/Map/index.vue";
import { setLevelMode } from "@/views/TankGame/script/base/index.js";
import { useGameTimer } from "./useGameTimer.js";

const emit = defineEmits(["level-complete", "level-failed"]);
const { elapsed, start, stop, format } = useGameTimer();

const config = buildLevelConfig();

setLevelMode(config);

const reachedPortal = ref(false);
const legendSpike = ref(null);
const legendFalling = ref(null);
const legendDoor = ref(null);
const legendSwitch = ref(null);
const legendCrate = ref(null);
const legendPortal = ref(null);

function drawLegendIcons() {
  const S = 20;
  const drawSpike = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(200,50,50,0.5)";
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = "rgba(255,80,80,0.9)";
    ctx.lineWidth = 1.5;
    const spikeCount = 3;
    const spikeWidth = S / spikeCount;
    for (let i = 0; i < spikeCount; i++) {
      const sx = i * spikeWidth + spikeWidth / 2;
      ctx.beginPath();
      ctx.moveTo(sx - 3, S - 1);
      ctx.lineTo(sx, 1);
      ctx.lineTo(sx + 3, S - 1);
      ctx.stroke();
    }
  };

  const drawFalling = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(139,115,85,0.3)";
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8B7355";
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6B5340";
    ctx.beginPath();
    ctx.arc(S / 2 - 1, S / 2 - 1, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawDoor = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = "#5a5a5a";
    ctx.fillRect(1, 1, S - 2, S - 2);
    ctx.fillStyle = "#7a7a7a";
    ctx.fillRect(2, 2, S - 4, S - 4);
  };

  const drawSwitch = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(200,0,0,0.3)";
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = "#AA0000";
    ctx.fillRect(3, 3, S - 6, S - 6);
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, 5, 0, Math.PI * 2);
    ctx.stroke();
  };

  const drawCrate = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#8B6914";
    ctx.fillRect(1, 1, S - 2, S - 2);
    ctx.fillStyle = "#A0791A";
    ctx.fillRect(2, 2, S - 4, S - 4);
    ctx.strokeStyle = "#6B5010";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, S - 2, S - 2);
    ctx.strokeStyle = "#8B6914";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(S - 2, S - 2);
    ctx.moveTo(S - 2, 2);
    ctx.lineTo(2, S - 2);
    ctx.stroke();
    ctx.fillStyle = "#C9A020";
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawPortal = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(40,90,140,0.4)";
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = "rgba(120,200,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, S - 2, S - 2);
    ctx.fillStyle = "rgba(160,220,255,0.8)";
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  drawSpike(legendSpike.value);
  drawFalling(legendFalling.value);
  drawDoor(legendDoor.value);
  drawSwitch(legendSwitch.value);
  drawCrate(legendCrate.value);
  drawPortal(legendPortal.value);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLevelConfig() {
  const E = 0, W = 1, G = 2, B = 3;
  const SK = 7, DR = 9, SW = 10;
  const COLS = 45, ROWS = 30;
  const rand = mulberry32(20260919);
  const ck = (c, r) => c + "," + r;

  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1 ? B : E);
    }
    map.push(row);
  }
  const sc = (c, r, v) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) map[r][c] = v;
  };

  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++)
      if (r % 2 === 0 || c % 2 === 0) map[r][c] = W;

  const START = { c: 1, r: 27 };
  const GOAL = { c: 43, r: 1 };
  const cellOk = (c, r) => c >= 1 && c <= 43 && r >= 1 && r <= 27;

  // DFS 生成迷宫（唯一路径树）
  const visited = new Set([ck(START.c, START.r)]);
  const stack = [{ ...START }];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nb = [];
    for (const [dc, dr] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      const nc = cur.c + dc, nr = cur.r + dr;
      if (!cellOk(nc, nr) || visited.has(ck(nc, nr))) continue;
      nb.push({ c: nc, r: nr });
    }
    if (nb.length) {
      const n = nb[Math.floor(rand() * nb.length)];
      sc((cur.c + n.c) / 2, (cur.r + n.r) / 2, E);
      visited.add(ck(n.c, n.r));
      stack.push(n);
    } else stack.pop();
  }

  // 左下角额外通道：底部一条通道向右、左侧一条通道向上，增加多路选择
  for (let c = 2; c <= 20; c += 2) sc(c, 27, E);
  for (let r = 10; r <= 26; r += 2) sc(3, r, E);

  // 堵住传送门正下方的通路，避免出现两条路线到达传送门
  sc(43, 2, W);

  sc(GOAL.c, GOAL.r, G);

  const adj = (c, r) => {
    const out = [];
    for (const [dc, dr] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      const nc = c + dc, nr = r + dr;
      if (!cellOk(nc, nr)) continue;
      if (map[(r + nr) / 2][(c + nc) / 2] !== W) out.push({ c: nc, r: nr });
    }
    return out;
  };

  // 起点到传送门的唯一路径
  const parent = {};
  const seen = new Set([ck(START.c, START.r)]);
  const q = [ck(START.c, START.r)];
  let found = null;
  while (q.length) {
    const k = q.shift();
    if (k === ck(GOAL.c, GOAL.r)) {
      found = k;
      break;
    }
    const [c, r] = k.split(",").map(Number);
    for (const n of adj(c, r)) {
      const nk = ck(n.c, n.r);
      if (seen.has(nk)) continue;
      seen.add(nk);
      parent[nk] = k;
      q.push(nk);
    }
  }
  const path = [];
  for (let k = found; k !== undefined; k = parent[k]) path.push(k);
  path.reverse();
  const pathCells = path.map((s) => {
    const [c, r] = s.split(",").map(Number);
    return { c, r };
  });

  // 石门：固定放在右上方通道口
  const doorC = 33, doorR = 2;
  sc(doorC, doorR, DR);
  const doorKey = ck(doorC, doorR);

  // 门前可达区域（不跨过石门）
  const before = new Set();
  {
    const s2 = new Set([ck(START.c, START.r)]);
    const q2 = [ck(START.c, START.r)];
    while (q2.length) {
      const k2 = q2.shift();
      before.add(k2);
      const [c, r] = k2.split(",").map(Number);
      for (const n of adj(c, r)) {
        const wc = (c + n.c) / 2, wr = (r + n.r) / 2;
        if (wr === doorR && wc === doorC) continue;
        const nk = ck(n.c, n.r);
        if (s2.has(nk)) continue;
        s2.add(nk);
        q2.push(nk);
      }
    }
  }

  // 距起点的距离（整棵迷宫树）
  const dist = { [ck(START.c, START.r)]: 0 };
  {
    const q3 = [ck(START.c, START.r)];
    while (q3.length) {
      const k3 = q3.shift();
      const [c, r] = k3.split(",").map(Number);
      for (const n of adj(c, r)) {
        const nk = ck(n.c, n.r);
        if (dist[nk] !== undefined) continue;
        dist[nk] = dist[k3] + 1;
        q3.push(nk);
      }
    }
  }

  // 开关放在门前的支线死胡同（尽量靠近石门，减少回头路）
  const leaves = [];
  for (const k3 of before) {
    if (k3 === ck(START.c, START.r)) continue;
    const [c, r] = k3.split(",").map(Number);
    if (adj(c, r).length === 1) leaves.push({ c, r });
  }
  const distDoor = {};
  {
    const doorNeighbors = adj(doorC, doorR).filter((n) => before.has(ck(n.c, n.r)));
    const startCell = doorNeighbors[0] || { c: doorC, r: doorR - 2 };
    distDoor[ck(startCell.c, startCell.r)] = 0;
    const qd = [ck(startCell.c, startCell.r)];
    while (qd.length) {
      const kd = qd.shift();
      const [c, r] = kd.split(",").map(Number);
      for (const n of adj(c, r)) {
        const nk = ck(n.c, n.r);
        if (!before.has(nk) || distDoor[nk] !== undefined) continue;
        distDoor[nk] = distDoor[kd] + 1;
        qd.push(nk);
      }
    }
  }
  const cands = leaves.filter((l) => dist[ck(l.c, l.r)] >= 3);
  cands.sort(
    (x, y) => distDoor[ck(x.c, x.r)] - distDoor[ck(y.c, y.r)] || dist[ck(y.c, y.r)] - dist[ck(x.c, x.r)],
  );
  let switchLeaf = cands[0] || leaves[0];
  if (!switchLeaf) switchLeaf = { ...pathCells[Math.max(0, Math.floor(di / 2))] };
  sc(switchLeaf.c, switchLeaf.r, SW);
  const switchKey = ck(switchLeaf.c, switchLeaf.r);
  const nbLeaf = adj(switchLeaf.c, switchLeaf.r)[0];
  const crateC = (switchLeaf.c + nbLeaf.c) / 2;
  const crateR = (switchLeaf.r + nbLeaf.r) / 2;

  // 尖刺：固定放在中间通道
  sc(21, 9, SK);
  sc(21, 15, SK);

  // 去掉绿色框位置的墙
  sc(13, 26, E);

  // 各条路线上的巡逻敌人（前段稀疏，后段密集）
  const enemySpawns = [];
  const total = pathCells.length;
  for (let i = Math.floor(total * 0.18); i < total - 2 && enemySpawns.length < 8; i++) {
    const cell = pathCells[i];
    if (map[cell.r][cell.c] !== E) continue;
    if (ck(cell.c, cell.r) === switchKey || ck(cell.c, cell.r) === ck(crateC, crateR)) continue;
    const ratio = i / total;
    const minGap = ratio < 0.5 ? 5 : 3;
    if (enemySpawns.length && i - pathCells.indexOf(enemySpawns[enemySpawns.length - 1]) < minGap) continue;
    enemySpawns.push(cell);
  }

  // 右上区域额外补敌，直接扫描地图空格（列≥23，行≤13）
  const rightUpper = [];
  for (let r = 1; r <= 13; r += 2) {
    for (let c = 23; c <= 43; c += 2) {
      if (map[r][c] !== E) continue;
      if (ck(c, r) === switchKey || ck(c, r) === ck(crateC, crateR)) continue;
      if (ck(c, r) === doorKey) continue;
      if (enemySpawns.some((e) => e.c === c && e.r === r)) continue;
      const neighbors = adj(c, r);
      if (neighbors.length >= 2) rightUpper.push({ c, r });
    }
  }
  for (const cell of rightUpper) {
    if (enemySpawns.length >= 11) break;
    const tooClose = enemySpawns.some(
      (e) => Math.abs(e.c - cell.c) + Math.abs(e.r - cell.r) < 6,
    );
    if (!tooClose) enemySpawns.push(cell);
  }

  // 右下区域补敌（列≥23，行≥15），直接扫描地图空格，优先最右下角
  const rightLower = [];
  for (let r = 27; r >= 15; r -= 2) {
    for (let c = 23; c <= 43; c += 2) {
      if (map[r][c] !== E) continue;
      if (ck(c, r) === switchKey || ck(c, r) === ck(crateC, crateR)) continue;
      if (ck(c, r) === doorKey) continue;
      if (enemySpawns.some((e) => e.c === c && e.r === r)) continue;
      const neighbors = adj(c, r);
      if (neighbors.length >= 1) rightLower.push({ c, r });
    }
  }
  for (const cell of rightLower) {
    if (enemySpawns.length >= 18) break;
    const tooClose = enemySpawns.some(
      (e) => Math.abs(e.c - cell.c) + Math.abs(e.r - cell.r) < 5,
    );
    if (!tooClose) enemySpawns.push(cell);
  }

  // 去掉玩家坦克右侧最近的一辆敌车，降低开局压力
  {
    let idx = -1;
    let best = Infinity;
    for (let i = 0; i < enemySpawns.length; i++) {
      const dc = enemySpawns[i].c - START.c;
      const dr = enemySpawns[i].r - START.r;
      if (dc <= 0) continue;
      const d = Math.hypot(dc, dr);
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    if (idx >= 0) enemySpawns.splice(idx, 1);
  }

  // 去掉玩家坦克正右下方最近的一辆敌车
  {
    let idx = -1;
    let best = Infinity;
    for (let i = 0; i < enemySpawns.length; i++) {
      const dc = enemySpawns[i].c - START.c;
      const dr = enemySpawns[i].r - START.r;
      if (dc <= 0 || dr < 0) continue;
      const d = dc + dr;
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    if (idx >= 0) enemySpawns.splice(idx, 1);
  }

  return {
    id: 3,
    name: "迷宫机关城",
    map,
    crackHp: {},
    playerSpawn: { c: START.c, r: START.r },
    enemySpawns,
    initialEnemies: Math.min(18, enemySpawns.length),
    maxEnemies: Math.min(18, enemySpawns.length),
    baseEnemyHp: 2,
    enemySpeed: 60,
    playerSpeed: 100,
    special: "maze",
    noRespawn: true,
    switchLinks: { [switchKey]: [doorKey] },
    crates: [{ c: crateC, r: crateR }],
    itemWeights: { mine: 3, heal: 3 },
    objective: {
      type: "reachPortal",
      target: 1,
      description: "穿过迷宫，推开机关打开石门，躲避落石，到达传送门",
    },
  };
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
  nextTick(drawLegendIcons);
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
.legend-item canvas { border-radius: 2px; flex-shrink: 0; }
</style>
