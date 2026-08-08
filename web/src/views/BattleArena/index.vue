<template>
  <div id="wrap">
    <div id="hud">
      <div class="l">
        <span class="bar">存活 <b id="hud-alive">0</b>/8</span>
        <span class="bar">击杀 <b id="hud-score">0</b></span>
        <span class="bar">时间 <b id="hud-time">0:00</b></span>
      </div>
      <div class="r">
        <span class="bar" id="hud-buffs"></span>
      </div>
    </div>
    <div id="canvas-wrap">
      <canvas id="game"></canvas>
      <div class="overlay" id="ov-start">
        <h1>坦 克 大 战</h1>
        <p>导入多个 AI 脚本，让它们在战场上对决！最多支持 8 个 AI 同时战斗。</p>
        <div class="items">
          🚁 无人机 &nbsp;✨ 散弹 &nbsp;⚡ 射速 &nbsp;💨 移速<br />
          🛡️ 护盾 &nbsp;💣 地雷 &nbsp;❤️ 生命恢复
        </div>
        <p>
          ⬜ 银色砖墙：反弹一次子弹（不可摧毁）　🟨 黄色砖墙：可被子弹击碎<br />
          🌿 草丛：坦克可进入隐藏　🌀 蓝色传送门双向传送
        </p>
        <button id="btn-start">开 始 对 决</button>
      </div>
      <div class="overlay hidden" id="ov-over">
        <h2>决 斗 结 束</h2>
        <p id="ov-over-winner"></p>
        <p id="ov-over-stats"></p>
        <button id="btn-restart">再 来 一 局</button>
      </div>
      <div class="overlay hidden" id="ov-pause">
        <h1>暂 停</h1>
        <p>按 P 或点击继续</p>
        <button id="btn-resume">继 续</button>
      </div>
    </div>
    <div id="tank-panel">
      <div class="panel-title">AI 战队配置</div>
      <div id="tank-list"></div>
      <div id="tank-actions">
        <button id="btn-import-ai">📥 导入 AI</button>
        <button id="btn-clear-all">🗑️ 清空</button>
        <input type="file" id="ai-file" accept=".js" multiple style="display:none" />
      </div>
    </div>
    <div id="btn-group">
      <button id="btn-pause">暂停 P</button>
      <button id="btn-restart2">重新开始 R</button>
      <button id="btn-speed">⏩ 1x</button>
      <button id="btn-fullscreen">⛶ 全屏 F</button>
    </div>
    <input type="file" id="ai-file-multi" accept=".js" multiple style="display:none" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import playerSvg from "@/assets/player.svg";
import {
  genMap,
  makeTank,
  CELL, COLS, ROWS, W, H,
  DIRS, DIR_NAMES,
  EMPTY, WALL, GATE, BORDER, CRACK, GRASS,
  spawnExplosion, addFloat, sfx,
  drawMap, drawItems, drawBullets, drawGrassOverlay,
  drawParticles, drawFloats,
  cellOf, centerOf, gateAt,
  ITEMS, spawnRandomItem,
} from "./../TankGame/script/base.js";

// ====================== AI 对决状态 ======================
const AI_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4",
  "#ffeaa7", "#dfe6e9", "#a29bfe", "#fd79a8",
];

let aiTanks = []; // { id, name, color, aiModule, tank }
let killLog = [];
let gameLoopId = null;
let lastTime = 0;
let ovPause = null;
const battleTankImg = new Image();
battleTankImg.src = playerSvg;

// ====================== AI 加载管理 ======================
function loadAIFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      try {
        // 尝试 ES 模块方式
        const blob = new Blob([text], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        let mod = null;
        try {
          mod = await import(/* @vite-ignore */ url);
        } finally {
          URL.revokeObjectURL(url);
        }
        const obj = (mod && mod.default) || (mod && mod.__AI__);
        if (obj && typeof obj.decide === "function") {
          resolve(obj);
          return;
        }
      } catch (e) {
        // 回退到 eval 方式
      }
      delete window.__AI__;
      try {
        (0, eval)(text);
      } catch (err) {
        reject(new Error("脚本解析失败：" + err.message));
        return;
      }
      const obj = window.__AI__;
      if (!obj || typeof obj.decide !== "function") {
        reject(new Error("未找到有效 AI 对象"));
        return;
      }
      resolve(obj);
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

async function importAIFiles(files) {
  const imports = Array.from(files).slice(0, 8 - aiTanks.length);
  for (const file of imports) {
    if (aiTanks.length >= 8) break;
    try {
      const aiModule = await loadAIFile(file);
      const name = aiModule.name || file.name.replace(/\.[^.]+$/, "");
      addAITank(name, aiModule);
    } catch (err) {
      alert(`导入 ${file.name} 失败: ${err.message}`);
    }
  }
  renderTankList();
}

function addAITank(name, aiModule) {
  if (aiTanks.length >= 8) return;
  const color = AI_COLORS[aiTanks.length];
  aiTanks.push({
    id: Math.random().toString(36).slice(2),
    name,
    color,
    aiModule,
    tank: null,
    kills: 0,
    deaths: 0,
  });
}

function clearAllAITanks() {
  aiTanks = [];
  renderTankList();
}

// ====================== 渲染 AI 列表 ======================
function renderTankList() {
  const list = document.getElementById("tank-list");
  if (!list) return;
  list.innerHTML = aiTanks
    .map(
      (ai, i) => `
    <div class="tank-item" style="border-left-color: ${ai.color}">
      <span class="tank-color" style="background:${ai.color}"></span>
      <span class="tank-name">${ai.name}</span>
      <span class="tank-stats">${ai.kills}杀/${ai.deaths}死</span>
      <button class="btn-remove" data-idx="${i}">✕</button>
    </div>
  `,
    )
    .join("");

  list.querySelectorAll(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      aiTanks.splice(idx, 1);
      renderTankList();
    });
  });
}

// ====================== 游戏初始化（AI 对决模式） ======================
function initBattleGame() {
  // 初始化画布
  const canvas = document.getElementById("game");
  canvas.width = W;
  canvas.height = H;
  window.canvas = canvas;
  window.ctx = canvas.getContext("2d");
  battleCtx = window.ctx;
  ovPause = document.getElementById("ov-pause");

  genMap();

  // 创建 AI 坦克
  const spawnPoints = [
    { c: 1, r: 1 },
    { c: COLS - 2, r: 1 },
    { c: 1, r: ROWS - 2 },
    { c: COLS - 2, r: ROWS - 2 },
    { c: 7, r: 1 },
    { c: COLS - 8, r: 1 },
    { c: 7, r: ROWS - 2 },
    { c: COLS - 8, r: ROWS - 2 },
  ];

  aiTanks.forEach((ai, i) => {
    const sp = spawnPoints[i] || spawnPoints[i % spawnPoints.length];
    const x = sp.c * CELL + 3;
    const y = sp.r * CELL + 3;
    const tank = makeTank(x, y, "down", false);
    tank.color = ai.color;
    tank.aiName = ai.name;
    tank.isAI = true;
    tank.aiModule = ai.aiModule;
    tank.hp = 3;
    tank.maxHp = 3;
    tank.speed = 70 + Math.random() * 30;
    ai.tank = tank;
    ai.kills = 0;
    ai.deaths = 0;
    window.tanks.push(tank);
  });

  window.bullets = [];
  window.items = [];
  window.mines = [];
  window.drones = [];
  window.particles = [];
  window.floats = [];
  window.itemSpawnTimer = 3;
  window.state = "start";
  renderTankList();
  updateBattleHud();

  // 初始化控件
  const btnStart = document.getElementById("btn-start");
  const btnRestart = document.getElementById("btn-restart");
  const btnRestart2 = document.getElementById("btn-restart2");
  const btnPause = document.getElementById("btn-pause");
  const btnResume = document.getElementById("btn-resume");
  const btnImport = document.getElementById("btn-import-ai");
  const btnClear = document.getElementById("btn-clear-all");
  const btnSpeed = document.getElementById("btn-speed");
  const btnFullscreen = document.getElementById("btn-fullscreen");
  const fileInput = document.getElementById("ai-file");
  const fileInputMulti = document.getElementById("ai-file-multi");

  if (btnStart) btnStart.addEventListener("click", startBattle);
  if (btnRestart) btnRestart.addEventListener("click", startBattle);
  if (btnRestart2) btnRestart2.addEventListener("click", startBattle);
  if (btnPause) btnPause.addEventListener("click", toggleBattlePause);
  if (btnResume) btnResume.addEventListener("click", toggleBattlePause);
  if (btnImport) btnImport.addEventListener("click", () => fileInputMulti.click());
  if (btnClear) btnClear.addEventListener("click", clearAllAITanks);

  if (fileInputMulti) {
    fileInputMulti.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        importAIFiles(e.target.files);
      }
      e.target.value = "";
    });
  }

  // 倍速控制
  const SPEEDS = [1, 2, 4, 8];
  let speedIdx = 0;
  if (btnSpeed) {
    btnSpeed.textContent = `⏩ ${SPEEDS[speedIdx]}x`;
    btnSpeed.addEventListener("click", () => {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      window.gameSpeed = SPEEDS[speedIdx];
      btnSpeed.textContent = `⏩ ${SPEEDS[speedIdx]}x`;
    });
  }

  // 全屏控制
  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", () => {
      const reqFs = document.documentElement.requestFullscreen;
      const webkitReqFs = document.documentElement.webkitRequestFullscreen;
      const exitFs = document.exitFullscreen;
      const webkitExitFs = document.webkitExitFullscreen;
      if (!document.fullscreenElement) {
        (reqFs || webkitReqFs).call(document.documentElement);
      } else {
        (exitFs || webkitExitFs)();
      }
    });
  }

  // 键盘控制
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      if (state === "start") {
        startBattle();
        e.preventDefault();
      }
    } else if (e.key.toLowerCase() === "p") {
      if (state === "playing" || state === "paused") {
        toggleBattlePause();
      }
    } else if (e.key.toLowerCase() === "r") {
      startBattle();
    } else if (e.key.toLowerCase() === "f") {
      if (btnFullscreen) btnFullscreen.click();
    } else if (e.key >= "1" && e.key <= "8") {
      const speedIdx = ["1", "2", "4", "8"].indexOf(e.key);
      if (speedIdx >= 0) {
        window.gameSpeed = [1, 2, 4, 8][speedIdx];
        if (btnSpeed) btnSpeed.textContent = `⏩ ${window.gameSpeed}x`;
      }
    }
  });

  // 调整画布大小
  function fitCanvas() {
    const pad = 10;
    let availW = window.innerWidth - 320 - pad; // 留出右侧面板
    let availH = window.innerHeight - pad;
    const scale = Math.min(availW / W, availH / H);
    const canvas = document.getElementById("game");
    if (canvas) {
      canvas.style.width = Math.round(W * scale) + "px";
      canvas.style.height = Math.round(H * scale) + "px";
    }
  }
  window.addEventListener("resize", fitCanvas);
  fitCanvas();
  document.addEventListener("fullscreenchange", fitCanvas);
  document.addEventListener("webkitfullscreenchange", fitCanvas);

  // 阻止方向键滚动
  window.addEventListener(
    "keydown",
    (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code))
        e.preventDefault();
    },
    { passive: false },
  );

  // 启动游戏循环
  lastTime = performance.now();
  gameLoopId = requestAnimationFrame(battleLoop);
  if (aiTanks.length === 0) {
    // 没有导入 AI，显示提示并初始绘制一帧
    const ovStart = document.getElementById("ov-start");
    if (ovStart) ovStart.classList.remove("hidden");
    drawBattle();
  }
}

function startBattle() {
  // 清理旧的 AI 坦克
  window.tanks.splice(0, window.tanks.length);
  window.bullets.splice(0, window.bullets.length);
  window.items.splice(0, window.items.length);
  window.mines.splice(0, window.mines.length);
  window.drones.splice(0, window.drones.length);
  window.particles.splice(0, window.particles.length);
  window.floats.splice(0, window.floats.length);

  // 重新生成地图
  genMap();

  // 创建新的 AI 坦克
  const spawnPoints = [
    { c: 1, r: 1 },
    { c: COLS - 2, r: 1 },
    { c: 1, r: ROWS - 2 },
    { c: COLS - 2, r: ROWS - 2 },
    { c: 7, r: 1 },
    { c: COLS - 8, r: 1 },
    { c: 7, r: ROWS - 2 },
    { c: COLS - 8, r: ROWS - 2 },
  ];

  aiTanks.forEach((ai, i) => {
    const sp = spawnPoints[i] || spawnPoints[i % spawnPoints.length];
    const x = sp.c * CELL + 3;
    const y = sp.r * CELL + 3;
    const tank = makeTank(x, y, "down", false);
    tank.color = ai.color;
    tank.aiName = ai.name;
    tank.isAI = true;
    tank.aiModule = ai.aiModule;
    tank.hp = 3;
    tank.maxHp = 3;
    tank.speed = 70 + Math.random() * 30;
    ai.tank = tank;
    ai.kills = 0;
    ai.deaths = 0;
    window.tanks.push(tank);
  });

  window.boss = null;
  window.lastBossKills = 0;
  window.lastTeleport = {};
  window.state = "playing";

  const ovStart = document.getElementById("ov-start");
  if (ovStart) ovStart.classList.add("hidden");
  const ovOver = document.getElementById("ov-over");
  if (ovOver) ovOver.classList.add("hidden");
  if (ovPause) ovPause.classList.add("hidden");

  lastTime = performance.now();
}

function toggleBattlePause() {
  if (window.state === "playing") {
    window.state = "paused";
    if (ovPause) ovPause.classList.remove("hidden");
  } else if (window.state === "paused") {
    window.state = "playing";
    if (ovPause) ovPause.classList.add("hidden");
    lastTime = performance.now();
  }
}

// ====================== 游戏循环 ======================
function battleLoop(ts) {
  const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0.016);
  lastTime = ts;

  if (window.state === "playing" && aiTanks.length > 0) {
    updateBattle(dt);
  }

  drawBattle();
  gameLoopId = requestAnimationFrame(battleLoop);
}

function updateBattle(dt) {
  window.gtMs += dt * 1000;

  // 刷新道具
  if (!window.itemSpawnTimer) window.itemSpawnTimer = 3;
  window.itemSpawnTimer -= dt;
  if (window.itemSpawnTimer <= 0 && window.items.length < 4) {
    spawnRandomItem();
    window.itemSpawnTimer = 3.5 + Math.random() * 3;
  }

  // 更新每个 AI 坦克
  for (const ai of aiTanks) {
    if (!ai.tank || !ai.tank.alive) continue;
    const action = ai.aiModule.decide(buildBattleContext(ai), dt);
    applyBattleAction(ai.tank, action);
  }

  // 移动所有坦克并处理射击
  for (const t of window.tanks) {
    if (!t.alive) continue;
    moveBattleTank(t, dt);
    battleFire(t, dt);
  }

  // 更新子弹
  updateBattleBullets(dt);

  // 检测碰撞
  checkBulletCollisions();
  checkTankCollisions();

  // 更新粒子效果
  for (const p of window.particles) {
    p.life += dt * 1000;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
  }
  window.particles = window.particles.filter((p) => p.life < p.max);
  for (const f of window.floats) {
    f.life += dt * 1000;
    f.y -= 0.6;
  }
  window.floats = window.floats.filter((f) => f.life < f.max);

  // 检查游戏结束
  checkBattleEnd();

  // 更新 HUD
  updateBattleHud();
}

function moveBattleTank(t, dt) {
  let dx = 0, dy = 0;
  if (t.moveUp) dy -= 1;
  if (t.moveDown) dy += 1;
  if (t.moveLeft) dx -= 1;
  if (t.moveRight) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const sp = t.speed * dt;
    const nx = t.x + dx * sp;
    const ny = t.y + dy * sp;
    if (!isBlocked(nx, t.y, t.w, t.h, t)) t.x = nx;
    if (!isBlocked(t.x, ny, t.w, t.h, t)) t.y = ny;
  }

  t.dir = { x: dx, y: dy };
  t.dirName = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
  if (t.invincible > 0) t.invincible -= dt * 1000;
  if (t.fireCd > 0) t.fireCd -= dt;

  // 传送门
  if (dx !== 0 || dy !== 0) {
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    const g = gateAt(cellOf(cx, cy).c, cellOf(cx, cy).r);
    const partner = g && g.partner;
    if (partner && (window.lastTeleport[t.id] || 0) + 1000 < window.gtMs) {
      const cen = centerOf(partner.cells[0].c, partner.cells[0].r);
      t.x = cen.x - t.w / 2;
      t.y = cen.y - t.h / 2;
      window.lastTeleport[t.id] = window.gtMs;
      spawnExplosion(cen.x, cen.y, 26, "#58a6ff");
      addFloat(cen.x, cen.y - 18, "传送", "#58a6ff");
      sfx("tp");
    }
  }
}

function isBlocked(x, y, w, h, self) {
  const c1 = Math.max(0, Math.floor(x / CELL));
  const c2 = Math.min(COLS - 1, Math.floor((x + w - 1) / CELL));
  const r1 = Math.max(0, Math.floor(y / CELL));
  const r2 = Math.min(ROWS - 1, Math.floor((y + h - 1) / CELL));
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const v = window.map[r][c];
      if (v === WALL || v === BORDER || v === CRACK) return true;
    }
  }
  for (const o of window.tanks) {
    if (!o.alive || o === self) continue;
    if (o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y) return true;
  }
  return false;
}

function battleFire(t, dt) {
  if (!t.fire || t.fireCd > 0) return;
  const base = t.fireT > window.gtMs ? 0.16 : 0.34;
  t.fireCd = base;
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const ang = Math.atan2(t.dir.y, t.dir.x);
  const fx = cx + t.dir.x * (t.w / 2);
  const fy = cy + t.dir.y * (t.h / 2);

  if (t.spreadT > window.gtMs) {
    for (let i = -1; i <= 1; i++) {
      bullets.push({
        x: fx, y: fy, dx: Math.cos(ang + i * 0.18) * 210, dy: Math.sin(ang + i * 0.18) * 210,
        speed: 210, owner: t, dmg: 1, dead: false, bounced: false,
      });
    }
  } else {
    bullets.push({
      x: fx, y: fy, dx: Math.cos(ang) * 210, dy: Math.sin(ang) * 210,
      speed: 210, owner: t, dmg: 1, dead: false, bounced: false,
    });
  }
  sfx("shoot");
}

function updateBattleBullets(dt) {
  for (const b of window.bullets) {
    if (b.dead) continue;
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    const cc = { c: Math.floor(b.x / CELL), r: Math.floor(b.y / CELL) };
    if (cc.r < 0 || cc.r >= ROWS || cc.c < 0 || cc.c >= COLS) {
      b.dead = true;
      continue;
    }
      const tile = window.map[cc.r][cc.c];
    if (tile === GATE) {
      const g = gateAt(cc.c, cc.r);
      const partner = g && g.partner;
      if (partner) {
        const pc = partner.cells[0];
        const dir = { x: b.dx / b.speed, y: b.dy / b.speed };
        let tx, ty;
        if (dir.y !== 0) {
          tx = pc.c * CELL + CELL / 2;
          ty = pc.r * CELL + (dir.y < 0 ? -4 : CELL + 1);
        } else {
          tx = pc.c * CELL + (dir.x < 0 ? -4 : CELL + 1);
          ty = pc.r * CELL + CELL / 2;
        }
        b.x = tx;
        b.y = ty;
        sfx("tp");
      }
    } else if (tile === WALL) {
      b.dead = true;
      b.bounced = true;
      b.dx = -b.dx;
      b.dy = -b.dy;
      sfx("bounce");
    } else if (tile === CRACK) {
      b.dead = true;
      if (window.crackHp[`${cc.c},${cc.r}`]) {
        window.crackHp[`${cc.c},${cc.r}`] -= b.dmg || 1;
        if (window.crackHp[`${cc.c},${cc.r}`] <= 0) {
          delete window.crackHp[`${cc.c},${cc.r}`];
            window.map[cc.r][cc.c] = EMPTY;
          spawnExplosion(cc.c * CELL + CELL / 2, cc.r * CELL + CELL / 2, 24, "#9aa0b0");
          sfx("boom");
        }
      }
    }
  }
  window.bullets = window.bullets.filter((b) => !b.dead);
}

function buildBattleContext(ai) {
  const ownTank = ai.tank;
  if (!ownTank || !ownTank.alive) {
    return {
      CELL, COLS, ROWS, W, H,
      DIRS,
      TILE: { EMPTY, WALL, GATE, BORDER, CRACK, GRASS },
      state: window.state, kills: window.kills, gtMs: window.gtMs,
      player: null,
      enemies: window.tanks
        .filter((t) => t.alive && t !== ownTank)
        .map((t) => ({
          id: t.id, x: t.x, y: t.y, w: t.w, h: t.h,
          dirName: t.dirName, dir: { x: t.dir.x, y: t.dir.y },
          speed: t.speed, hp: t.hp, maxHp: t.maxHp,
          color: t.color, isAI: t.isAI,
        })),
      bullets: window.bullets.filter((b) => !b.dead).map((b) => ({
        x: b.x, y: b.y,
        dir: { x: b.dx || 0, y: b.dy || 0 },
        speed: b.speed || 210,
        owner: b.owner, dmg: b.dmg,
      })),
      items: window.items.filter((it) => !it.dead).map((it) => ({
        x: it.x, y: it.y, type: it.def.id, name: it.def.name,
      })),
      mines: window.mines.filter((m) => !m.dead).map((m) => ({ x: m.x, y: m.y })),
      map: window.map,
      cellOf: (x, y) => ({ c: Math.floor(x / CELL), r: Math.floor(y / CELL) }),
      distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
      mapAt: (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= COLS) ? BORDER : window.map[r][c],
      isObstacle: (c, r) => {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
        const v = window.map[r][c];
        return v === WALL || v === BORDER || v === CRACK;
      },
    };
  }

  return {
    CELL, COLS, ROWS, W, H,
    DIRS,
    TILE: { EMPTY, WALL, GATE, BORDER, CRACK, GRASS },
    state,
    kills,
    gtMs,
    player: {
      x: ownTank.x, y: ownTank.y, w: ownTank.w, h: ownTank.h,
      dirName: ownTank.dirName, dir: { x: ownTank.dir.x, y: ownTank.dir.y },
      hp: ownTank.hp, maxHp: ownTank.maxHp,
      shieldT: ownTank.shieldT, fireT: ownTank.fireT,
      speedT: ownTank.speedT, spreadT: ownTank.spreadT,
      drones: ownTank.drones, mines: ownTank.mines,
    },
    enemies: window.tanks
      .filter((t) => t.alive && t !== ownTank)
      .map((t) => ({
        id: t.id, x: t.x, y: t.y, w: t.w, h: t.h,
        dirName: t.dirName, dir: { x: t.dir.x, y: t.dir.y },
        speed: t.speed, hp: t.hp, maxHp: t.maxHp,
        color: t.color, isAI: t.isAI,
      })),
    bullets: window.bullets.filter((b) => !b.dead).map((b) => ({
      x: b.x, y: b.y,
      dir: { x: b.dx || 0, y: b.dy || 0 },
      speed: b.speed || 210,
      owner: b.owner, dmg: b.dmg,
      bounced: b.bounced,
    })),
    items: window.items.filter((it) => !it.dead).map((it) => ({
      x: it.x, y: it.y, type: it.def.id, name: it.def.name,
      age: it.age, life: it.life,
    })),
    mines: window.mines.filter((m) => !m.dead).map((m) => ({ x: m.x, y: m.y })),
    drones: window.drones.map((d) => ({ x: d.x, y: d.y, hp: d.hp })),
    boss: window.boss && window.boss.alive
      ? { x: window.boss.x, y: window.boss.y, w: window.boss.w, h: window.boss.h,
          dirName: window.boss.dirName, dir: { x: window.boss.dir.x, y: window.boss.dir.y },
          speed: window.boss.speed, hp: window.boss.hp, maxHp: window.boss.maxHp }
      : null,
    gates: window.gates.map((g) => ({
      cells: g.cells.map((c) => ({ column: c.c, row: c.r })),
      partnerCells: g.partner ? g.partner.cells.map((c) => ({ column: c.c, row: c.r })) : [],
    })),
    map: window.map,
    cellOf: (x, y) => ({ c: Math.floor(x / CELL), r: Math.floor(y / CELL) }),
    centerOf: (c, r) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }),
    distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    mapAt: (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= COLS) ? BORDER : window.map[r][c],
    crackHpAt: (c, r) => window.crackHp[`${c},${r}`] || 0,
    isObstacle: (c, r) => {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
      const v = window.map[r][c];
      return v === WALL || v === BORDER || v === CRACK;
    },
  };
}

function applyBattleAction(tank, action) {
  if (!action) return;
  tank.moveUp = !!action.up;
  tank.moveDown = !!action.down;
  tank.moveLeft = !!action.left;
  tank.moveRight = !!action.right;
  tank.fire = !!action.fire;
  tank.mine = !!action.mine;
}

function checkBulletCollisions() {
  for (const b of window.bullets) {
    if (b.dead) continue;

    // 检测与墙的碰撞
    const cc = { c: Math.floor(b.x / CELL), r: Math.floor(b.y / CELL) };
    if (cc.r >= 0 && cc.r < ROWS && cc.c >= 0 && cc.c < COLS) {
    const tile = window.map[cc.r][cc.c];
      if (tile === WALL) {
        b.dead = true;
        b.bounced = true;
        b.dx = -b.dx;
        b.dy = -b.dy;
        sfx("bounce");
        continue;
      }
      if (tile === CRACK) {
        if (window.crackHp[`${cc.c},${cc.r}`]) {
          window.crackHp[`${cc.c},${cc.r}`] -= b.dmg || 1;
          if (window.crackHp[`${cc.c},${cc.r}`] <= 0) {
            delete window.crackHp[`${cc.c},${cc.r}`];
          window.map[cc.r][cc.c] = EMPTY;
            spawnExplosion(cc.c * CELL + CELL / 2, cc.r * CELL + CELL / 2, 24, "#9aa0b0");
            sfx("boom");
          } else {
            sfx("hit");
          }
        }
        b.dead = true;
        continue;
      }
    }

    // 检测与坦克的碰撞
    for (const t of window.tanks) {
      if (!t.alive) continue;
      if (b.owner === t) continue;
      if (
        b.x > t.x && b.x < t.x + t.w &&
        b.y > t.y && b.y < t.y + t.h
      ) {
        t.hp -= b.dmg || 1;
        b.dead = true;
        spawnExplosion(b.x, b.y, 12, "#ff9f43");
        sfx("hit");

        if (t.hp <= 0) {
          t.alive = false;
          const killer = bullets.find((bb) => bb === b && bb.owner);
          if (killer && killer.owner) {
            const killerAI = aiTanks.find((ai) => ai.tank === killer.owner);
            if (killerAI) killerAI.kills++;
          }
          const dyingAI = aiTanks.find((ai) => ai.tank === t);
          if (dyingAI) dyingAI.deaths++;
          spawnExplosion(t.x + t.w / 2, t.y + t.h / 2, 34, t.color || "#ff8a5a");
          sfx("boom");
          addFloat(t.x + t.w / 2, t.y, `+1 击杀`, "#ffd76e");
        }
        break;
      }
    }
  }
}

function checkTankCollisions() {
  for (let i = 0; i < window.tanks.length; i++) {
    for (let j = i + 1; j < window.tanks.length; j++) {
      const a = window.tanks[i], b = window.tanks[j];
      if (!a.alive || !b.alive) continue;
      if (
        a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y
      ) {
        // 简单的推开逻辑
        const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
        const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const push = 2;
        if (a.moveRight && !b.moveLeft) { a.x += push; b.x -= push; }
        if (a.moveLeft && !b.moveRight) { a.x -= push; b.x += push; }
        if (a.moveDown && !b.moveUp) { a.y += push; b.y -= push; }
        if (a.moveUp && !b.moveDown) { a.y -= push; b.y += push; }
      }
    }
  }
}

function checkBattleEnd() {
  const aliveTanks = window.tanks.filter((t) => t.alive);
  if (aliveTanks.length <= 1) {
    state = "over";
    const winner = aliveTanks[0];
    const winnerAI = winner ? aiTanks.find((ai) => ai.tank === winner) : null;

    const winnerText = winnerAI
      ? `🏆 胜利者：${winnerAI.name}！`
      : "平局！";
    document.getElementById("ov-over-winner").textContent = winnerText;

    const stats = aiTanks
      .map((ai) => `${ai.name}: ${ai.kills}杀`)
      .join("　");
    document.getElementById("ov-over-stats").textContent = stats;
    document.getElementById("ov-over").classList.remove("hidden");
  }
}

// ====================== 绘制 ======================
let battleCtx = null;

function drawBattle() {
  if (!battleCtx) return;
  const c = battleCtx;
  // 清屏
  c.fillStyle = "#202a1c";
  c.fillRect(0, 0, W, H);

  // 临时设置全局 ctx 供 base.js 函数使用
  window.ctx = c;
  window.map = window.map || [];

  // 绘制地图
  drawMap();
  drawItems();
  drawBullets();

  // 绘制 AI 坦克
  for (const t of window.tanks) {
    if (!t.alive) continue;
    drawBattleTank(t);
  }

  drawGrassOverlay();
  drawParticles();
  drawFloats();
}

function drawBattleTank(t) {
  if (!battleCtx) return;
  const c = battleCtx;
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const ang = Math.atan2(t.dir.y, t.dir.x);

  c.save();
  c.translate(cx, cy);
  c.rotate(ang + Math.PI / 2);

  // 绘制坦克主体
  if (battleTankImg && battleTankImg.complete && battleTankImg.naturalWidth > 0) {
    c.drawImage(battleTankImg, -t.w / 2 - 1, -t.h / 2 - 1, t.w + 2, t.h + 2);
  } else {
    c.fillStyle = t.color || "#ff6b6b";
    c.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
  }

  c.restore();

  // 血条
  const pct = Math.max(0, t.hp / t.maxHp);
  c.fillStyle = "#1c1f1c";
  c.fillRect(cx - t.w / 2, cy - t.h / 2 - 8, t.w, 4);
  c.fillStyle = pct > 0.5 ? "#7de07d" : pct > 0.25 ? "#ffd76e" : "#ff6b6b";
  c.fillRect(cx - t.w / 2, cy - t.h / 2 - 8, t.w * pct, 4);

  // 名称
  c.font = "bold 11px 'Microsoft YaHei', sans-serif";
  c.textAlign = "center";
  c.textBaseline = "bottom";
  c.fillStyle = "rgba(0,0,0,.8)";
  c.fillText(t.aiName || "AI", cx + 1, cy - t.h / 2 - 11);
  c.fillStyle = "#fff";
  c.fillText(t.aiName || "AI", cx, cy - t.h / 2 - 12);
}

function updateBattleHud() {
  const alive = window.tanks.filter((t) => t.alive).length;
  const el = document.getElementById("hud-alive");
  if (el) el.textContent = alive;
  const sc = document.getElementById("hud-score");
  if (sc) sc.textContent = kills;

  const mins = Math.floor(gtMs / 60000);
  const secs = Math.floor((gtMs % 60000) / 1000);
  const te = document.getElementById("hud-time");
  if (te) te.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;

  // 更新各 AI 的击杀/死亡显示
  aiTanks.forEach((ai, i) => {
  const el = document.getElementById(`tank-stats-${i}`);
    if (el) el.textContent = `${ai.kills}杀/${ai.deaths}死`;
  });
}

// ====================== Vue 生命周期 ======================
onMounted(() => {
  initBattleGame();
});

onUnmounted(() => {
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
  }
});
</script>

<style scoped>
#wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: #1a2118;
  overflow: hidden;
}

#canvas-wrap {
  position: relative;
  flex-shrink: 1;
  min-width: 0;
}

canvas {
  display: block;
  background: #1a2118;
  border: 2px solid #3a4a3a;
  border-radius: 6px;
  box-shadow: 0 0 30px rgba(0, 0, 0, .6);
  touch-action: none;
}

#hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #cfe3cf;
  padding: 8px 12px;
  font-size: 14px;
  background: rgba(0, 0, 0, .5);
  border-radius: 6px 6px 0 0;
  z-index: 10;
  flex-wrap: wrap;
  gap: 4px;
}

#hud .l,
#hud .r {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

#hud .bar {
  background: rgba(255, 255, 255, .06);
  padding: 4px 10px;
  border-radius: 12px;
}

/* AI 战队配置面板 */
#tank-panel {
  margin-top: 30px;
  width: 280px;
  background: rgba(0, 0, 0, .4);
  border: 1px solid #3a4a3a;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-title {
  font-size: 16px;
  font-weight: bold;
  color: #ffd76e;
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #3a4a3a;
}

#tank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tank-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, .05);
  padding: 8px 10px;
  border-radius: 6px;
  border-left: 4px solid;
}

.tank-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tank-name {
  flex: 1;
  font-size: 13px;
  color: #cfe3cf;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tank-stats {
  font-size: 12px;
  color: #9fb6a6;
}

.btn-remove {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-remove:hover {
  background: rgba(255, 107, 107, .2);
}

#tank-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #3a4a3a;
}

#tank-actions button {
  background: #26332b;
  color: #cfe3cf;
  border: 1px solid #4a5a4a;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

#tank-actions button:hover {
  background: #3a4a3a;
}

#btn-group {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
}

#btn-group button {
  background: #26332b;
  color: #cfe3cf;
  border: 1px solid #4a5a4a;
  padding: 8px 22px;
  border-radius: 20px;
  font-size: 15px;
  cursor: pointer;
}

#btn-group button:active {
  background: #3a4a3a;
}

.ai-status {
  text-align: center;
  font-size: 13px;
  color: #9fb6a6;
  margin-top: 6px;
}

#btn-group button:active {
  background: #3a4a3a;
}

.overlay {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: rgba(8, 12, 16, .86);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #d7e6d7;
  text-align: center;
  padding: 20px;
  gap: 12px;
  z-index: 5;
}

.overlay h1 {
  font-size: 34px;
  letter-spacing: 6px;
  color: #ffd76e;
  text-shadow: 0 0 16px rgba(255, 215, 110, .5);
}

.overlay h2 {
  font-size: 26px;
  color: #ff7b6e;
}

.overlay p {
  font-size: 14px;
  color: #9fb6a6;
  line-height: 1.9;
}

.overlay .items {
  font-size: 13px;
  color: #cfe3cf;
  line-height: 2;
  text-align: left;
  background: rgba(255, 255, 255, .05);
  padding: 10px 18px;
  border-radius: 10px;
  max-width: 90%;
}

.overlay button {
  background: #e0a93a;
  color: #1c1408;
  border: none;
  padding: 12px 40px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 24px;
  cursor: pointer;
  letter-spacing: 3px;
}

.overlay button:active {
  transform: scale(.96);
}

.hidden {
  display: none !important;
}

#btn-ai-log {
  background: #4a7a4a;
  color: #fff;
  border: 1px solid #6a9a6a;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 10px;
}

#btn-ai-log:hover {
  background: #5a8a5a;
}
</style>
