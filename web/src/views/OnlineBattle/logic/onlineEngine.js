import {
  CELL, COLS, ROWS, W, H,
  EMPTY, WALL, GATE, BORDER, CRACK, GRASS,
  drawMap,
  drawItems,
  drawBullets,
  drawGrassOverlay,
  drawParticles,
  drawFloats,
  centerOf,
  cellOf,
  gateAt,
  spawnExplosion,
  addFloat,
  sfx,
} from "../../TankGame/script/base.js";
import { battleTankImg } from "../../BattleArena/logic/gameState.js";

let onlineCtx = null;
let serverState = null;
let localTanks = [];
let localBullets = [];
let localItems = [];
let localMap = [];
let localGates = [];
let localCrackHp = {};

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
      const gate1 = { cells: g.cells, partner: null };
      const gate2 = { cells: g.partnerCells, partner: null };
      gate1.partner = gate2;
      gate2.partner = gate1;
      window.gates.push(gate1, gate2);
    }
    window.crackHp = localCrackHp;

    localTanks = (fullState.tanks || []).map((t) => ({
      ...t,
      w: 20,
      h: 20,
      alive: true,
      moveUp: false, moveDown: false, moveLeft: false, moveRight: false,
      fire: false,
      fireCd: 0,
      shieldT: 0, fireT: 0, speedT: 0, spreadT: 0,
    }));
    window.tanks = localTanks;
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
      dead: false,
    }));
    window.bullets = localBullets;
  }

  if (state && state.items) {
    localItems = state.items.map((it) => ({
      x: it.x,
      y: it.y,
      w: 18,
      h: 18,
      def: { id: it.type, name: it.name, color: "#fff" },
      dead: false,
    }));
    window.items = localItems;
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

  for (const t of localTanks) {
    if (!t.alive) continue;
    drawOnlineTank(t);
  }

  drawGrassOverlay();
  drawParticles();
  drawFloats();
}

function drawOnlineTank(t) {
  if (!onlineCtx) return;
  const c = onlineCtx;
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const ang = Math.atan2(t.dir.y, t.dir.x);

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

export function getLocalTanks() {
  return localTanks;
}

export function cleanupOnlineEngine() {
  onlineCtx = null;
  serverState = null;
  localTanks = [];
  localBullets = [];
  localItems = [];
  localMap = [];
  localGates = [];
  localCrackHp = {};
  window.tanks = [];
  window.bullets = [];
  window.items = [];
  window.map = [];
  window.gates = [];
  window.crackHp = {};
  window.particles = [];
  window.floats = [];
}
