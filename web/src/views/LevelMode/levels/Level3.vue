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

const config = buildLevelConfig();

setLevelMode(config);

const reachedPortal = ref(false);

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

  // 石门：堵住唯一通关路
  const di = Math.max(1, Math.min(pathCells.length - 2, Math.floor(pathCells.length * 0.55)));
  const a = pathCells[di], b = pathCells[di + 1];
  const doorC = (a.c + b.c) / 2, doorR = (a.r + b.r) / 2;
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
  const distDoor = { [ck(a.c, a.r)]: 0 };
  {
    const qd = [ck(a.c, a.r)];
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

  // 路径中段随机放置尖刺（避开起点/终点/门前门后区域）
  const doorIdx = pathCells.findIndex((c) => ck(c.c, c.r) === doorKey);
  const spikeCandidates = [];
  for (let i = 5; i < pathCells.length - 5; i++) {
    if (Math.abs(i - doorIdx) <= 2) continue;
    const c = pathCells[i];
    if (map[c.r][c.c] !== E) continue;
    if (ck(c.c, c.r) === switchKey || ck(c.c, c.r) === ck(crateC, crateR)) continue;
    spikeCandidates.push(i);
  }
  const spikesPlaced = [];
  while (spikesPlaced.length < 2 && spikeCandidates.length) {
    const ri = Math.floor(rand() * spikeCandidates.length);
    const idx = spikeCandidates.splice(ri, 1)[0];
    const c = pathCells[idx];
    sc(c.c, c.r, SK);
    spikesPlaced.push(c);
  }

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

  // 右下区域补敌（列≥23，行≥15），直接扫描地图空格
  const rightLower = [];
  for (let r = 15; r <= 27; r += 2) {
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
    if (enemySpawns.length >= 14) break;
    const tooClose = enemySpawns.some(
      (e) => Math.abs(e.c - cell.c) + Math.abs(e.r - cell.r) < 6,
    );
    if (!tooClose) enemySpawns.push(cell);
  }

  return {
    id: 3,
    name: "迷宫机关城",
    map,
    crackHp: {},
    playerSpawn: { c: START.c, r: START.r },
    enemySpawns,
    initialEnemies: Math.min(14, enemySpawns.length),
    maxEnemies: Math.min(14, enemySpawns.length),
    baseEnemyHp: 2,
    enemySpeed: 60,
    playerSpeed: 100,
    special: "maze",
    noRespawn: true,
    switchLinks: { [switchKey]: [doorKey] },
    crates: [{ c: crateC, r: crateR }],
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
.legend-color.spike { background: rgba(200,50,50,0.5); }
.legend-color.falling { background: #8B7355; }
.legend-color.door { background: #6a6a6a; }
.legend-color.sw { background: #AA0000; border: 1px solid #FFD700; }
.legend-color.crate { background: #A0791A; border: 1px solid #6B5010; }
.legend-color.portal { background: rgba(40,90,140,0.7); }
</style>
