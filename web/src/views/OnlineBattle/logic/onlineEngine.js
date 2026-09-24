import {
  CELL, COLS, ROWS, W, H,
  EMPTY, WALL, GATE, BORDER, CRACK, GRASS,
  drawMap,
  drawItems,
  drawBullets,
  drawMines,
  drawDrones,
  drawGrassOverlay,
  drawParticles,
  drawFloats,
  centerOf,
  cellOf,
  gateAt,
  spawnExplosion,
  addFloat,
  updateParticles,
  updateFloats,
  sfx,
} from "../../TankGame/script/base.js";
import { battleTankImg } from "../../BattleArena/logic/gameState.js";

let onlineCtx = null;
let serverState = null;
let localTanks = [];
let localBullets = [];
let localItems = [];
let localMines = [];
let localDrones = [];
let localMap = [];
let localGates = [];
let localCrackHp = {};
let lastFxTick = 0;

export function setOnlineCtx(ctx) {
  onlineCtx = ctx;
}

export function updateServerState(state, fullState) {
  serverState = state;
  if (fullState) {
    localMap = fullState.map || [];
    localGates = fullState.gates || [];
    localCrackHp = fullState.crackHp || {};
    window.map = localMap;
    window.gates = [];
    for (const g of localGates) {
      const color = g.color || "#58a6ff";
      const gate1 = { cells: g.cells, partner: null, color };
      const gate2 = { cells: g.partnerCells, partner: null, color };
      gate1.partner = gate2;
      gate2.partner = gate1;
      window.gates.push(gate1, gate2);
    }
    window.crackHp = localCrackHp;
    localDrones = [];
    window.drones = localDrones;

    localTanks = (fullState.tanks || []).map((t) => ({
      ...t,
      alive: true,
      moveUp: false, moveDown: false, moveLeft: false, moveRight: false,
      fire: false,
      fireCd: 0,
      invincible: 0,
      shieldT: 0, fireT: 0, speedT: 0, spreadT: 0,
      respawnIn: 0,
    }));
    window.tanks = localTanks;
  }

  if (state) {
    window.gtMs = state.gtMs || 0;
  }

  if (state && state.map) {
    localMap = state.map;
    localCrackHp = state.crackHp || {};
    window.map = localMap;
    window.crackHp = localCrackHp;
  }

  if (state && state.tanks) {
    for (const remote of state.tanks) {
      const local = localTanks.find((t) => t.id === remote.id);
      if (local) {
        local.x = remote.x;
        local.y = remote.y;
        local.dir = remote.dir;
        local.dirName = remote.dirName;
        local.hp = remote.hp;
        local.maxHp = remote.maxHp;
        local.alive = remote.alive;
        local.score = remote.score;
        local.kills = remote.kills;
        local.deaths = remote.deaths;
        local.mines = remote.mines || 0;
        local.drones = remote.drones || 0;
        local.invincible = remote.invincible || 0;
        local.shieldT = remote.shieldT || 0;
        local.fireT = remote.fireT || 0;
        local.speedT = remote.speedT || 0;
        local.spreadT = remote.spreadT || 0;
        local.respawnIn = remote.respawnIn || 0;
        local.bounces = !!remote.bounces;
        if (remote.tankName) local.tankName = remote.tankName;
      }
    }
    localTanks = localTanks.filter((t) =>
      state.tanks.some((s) => s.id === t.id),
    );
    window.tanks = localTanks;
  }

  if (state && state.bullets) {
    localBullets = state.bullets.map((b) => ({
      x: b.x,
      y: b.y,
      dx: b.dx,
      dy: b.dy,
      speed: Math.hypot(b.dx, b.dy) || 210,
      teamId: b.teamId,
      bounced: !!b.bounced,
      dead: false,
    }));
    window.bullets = localBullets;
  }

  if (state && state.drones) {
    localDrones = state.drones.map((d) => ({
      x: d.x,
      y: d.y,
      ownerId: d.ownerId,
    }));
    window.drones = localDrones;
  }

  if (state && state.items) {
    const ICONS = {
      drone: "🚁", spread: "✨", fire: "⚡", speed: "💨",
      shield: "🛡️", mine: "💣", heal: "❤️", bounce: "🔄",
    };
    localItems = state.items.map((it) => ({
      x: it.x,
      y: it.y,
      w: 18,
      h: 18,
      life: 20000,
      age: 0,
      def: {
        id: it.type,
        name: it.name,
        icon: ICONS[it.type] || "★",
        color: "#fff",
      },
      dead: false,
    }));
    window.items = localItems;
  }

  if (state && state.mines) {
    localMines = state.mines.map((m) => ({
      x: m.c * CELL,
      y: m.r * CELL,
      w: CELL,
      h: CELL,
      dead: false,
    }));
    window.mines = localMines;
  } else if (state) {
    window.mines = [];
    localMines = [];
  }
}

export function drawOnlineBattle() {
  if (!onlineCtx) return;
  if (!localMap || localMap.length === 0) return;
  const c = onlineCtx;
  c.fillStyle = "#202a1c";
  c.fillRect(0, 0, W, H);

  window.ctx = c;
  window.map = localMap;

  drawMap();
  drawItems();
  drawBullets();
  drawMines();
  drawDrones();

  for (const t of localTanks) {
    if (!t.alive) continue;
    drawOnlineTank(t);
  }

  drawGrassOverlay();

  const now = performance.now();
  if (lastFxTick) {
    const dt = Math.min(0.05, (now - lastFxTick) / 1000);
    updateParticles(dt);
    updateFloats(dt);
  }
  lastFxTick = now;
  drawParticles();
  drawFloats();
}

function burst(x, y, r, color) {
  const arr = window.particles;
  if (!arr) return;
  const n = Math.min(20, Math.floor(r / 2));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (0.5 + Math.random()) * (r / 8);
    arr.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0,
      max: 40 + Math.random() * 30,
      size: 2 + Math.random() * (r / 8),
      color,
    });
  }
}

function drawOnlineTank(t) {
  if (!onlineCtx) return;
  const c = onlineCtx;
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const ang = Math.atan2(t.dir.y, t.dir.x);
  const gtMs = window.gtMs || 0;

  if (t.invincible > 0 && Math.floor(gtMs / 100) % 2 === 0) {
    c.globalAlpha = 0.45;
  }

  c.save();
  c.translate(cx, cy);
  c.rotate(ang + Math.PI / 2);

  if (battleTankImg && battleTankImg.complete && battleTankImg.naturalWidth > 0) {
    c.drawImage(battleTankImg, -t.w / 2 - 1, -t.h / 2 - 1, t.w + 2, t.h + 2);
  } else {
    c.fillStyle = t.color || "#ff6b6b";
    c.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
  }

  c.restore();
  c.globalAlpha = 1;

  if (t.shieldT > gtMs) {
    c.strokeStyle = "rgba(88,166,255,.85)";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx, cy, 24, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = "rgba(160,220,255,.4)";
    c.beginPath();
    c.arc(cx, cy, 27, gtMs / 200, gtMs / 200 + Math.PI * 1.4);
    c.stroke();
  }

  const pct = Math.max(0, t.hp / t.maxHp);
  c.fillStyle = "#1c1f1c";
  c.fillRect(cx - t.w / 2, cy - t.h / 2 - 8, t.w, 4);
  c.fillStyle = pct > 0.5 ? "#7de07d" : pct > 0.25 ? "#ffd76e" : "#ff6b6b";
  c.fillRect(cx - t.w / 2, cy - t.h / 2 - 8, t.w * pct, 4);

  c.font = "bold 11px 'Microsoft YaHei', sans-serif";
  c.textAlign = "center";
  c.textBaseline = "bottom";
  c.fillStyle = "rgba(0,0,0,.8)";
  c.fillText(t.username || "玩家", cx + 1, cy - t.h / 2 - 11);
  c.fillStyle = "#fff";
  c.fillText(t.username || "玩家", cx, cy - t.h / 2 - 12);
}

export function playItemFx(data) {
  if (!data) return;
  const x = data.x || 0;
  const y = data.y || 0;
  const color = data.color || "#fff";
  sfx("pickup");
  burst(x + 9, y + 9, 20, color);
}

export function playTeleportFx(data) {
  if (!data) return;
  const color = data.color || "#58a6ff";
  spawnExplosion(data.x, data.y, 20, color);
  addFloat(data.x, data.y - 18, "传送", color);
  sfx("tp");
}

export function playDeathFx(data) {
  if (!data) return;
  burst(data.x, data.y, 34, data.color || "#ff8a5a");
  sfx("boom");
}

export function playRespawnFx(data) {
  if (!data) return;
  burst(data.x, data.y, 24, "#7de07d");
  addFloat(data.x, data.y - 18, "复活", "#7de07d");
  sfx("tp");
}

export function getLocalTanks() {
  return localTanks;
}

export function cleanupOnlineEngine() {
  onlineCtx = null;
  serverState = null;
  localTanks = [];
  localBullets = [];
  localItems = [];
  localMines = [];
  localDrones = [];
  localMap = [];
  localGates = [];
  localCrackHp = {};
  window.tanks = [];
  window.bullets = [];
  window.items = [];
  window.mines = [];
  window.drones = [];
  window.map = [];
  window.gates = [];
  window.crackHp = {};
  window.particles = [];
  window.floats = [];
  lastFxTick = 0;
}
