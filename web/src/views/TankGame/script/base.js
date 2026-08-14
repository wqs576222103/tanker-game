import playerSvg from "@/assets/player.svg";
import enemySvg from "@/assets/enemy.svg";
import bossSvg from "@/assets/enemy-boss.svg";
import { TankActions } from "./tank-actions.js";
import { AILogger } from "./ai-logger.js";
import { AIPlayer } from "./ai-player.js";
import { saveGameKills, addDeath, getScore } from "@/api/score.js";
import { getToken, getUserInfo } from "@/utils/user";

// ====================== 基础 ======================
export const CELL = 20,
  COLS = 45,
  ROWS = 30;
export const W = COLS * CELL,
  H = ROWS * CELL;
window.canvas = null;
window.ctx = null;
export function initCanvas() {
  canvas = document.getElementById("game");
  canvas.width = W;
  canvas.height = H;
  ctx = canvas.getContext("2d");
}

export const playerImg = new Image();
playerImg.src = playerSvg;
export const enemyImg = new Image();
enemyImg.src = enemySvg;

export const bossImg = new Image();
bossImg.src = bossSvg;

export const EMPTY = 0,
  WALL = 1,
  GATE = 2,
  BORDER = 3,
  CRACK = 4,
  GRASS = 5;
export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export const DIR_NAMES = ["up", "left", "down", "right"];

export const PLAYER_SPAWN = { c: 22, r: 20 };
export const ENEMY_SPAWNS = [
  { c: 1, r: 1 },
  { c: COLS - 2, r: 1 },
];

// ====================== 状态 ======================
window.state = "start"; // start | playing | paused | over
window.kills = 0;
window.bossKills = 0;
window.hiScore = +(localStorage.getItem("tank-hi") || 0);
window.hiBossKills = +(localStorage.getItem("tank-hi-boss") || 0);
window.gtMs = 0; // 游戏时间
window.spawnTimer = 2;
window.mapGenerated = false; // 地图是否已生成
window.gameSpeed = 1; // 游戏倍速 (仅AI模式可用)

window.map = [];
window.gates = [];
window.crackHp = {}; // 碎石墙耐久
window.player = null;
window.tanks = []; // 含玩家
window.bullets = [];
window.items = [];
window.mines = [];
window.drones = [];
window.particles = [];
window.floats = [];
window.lastTeleport = {}; // tank 传送冷却
window.boss = null; // 关卡boss
window.baseEnemyHp = 2; // 基础怪血量（击败boss后+1）
window.lastBossKills = 0; // 上一次出现boss的击杀数

export const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
  mine: false,
};
window.shootQueued = false;

// ESM 导入绑定不可重新赋值，供其他模块修改状态
export function setSpawnTimer(v) {
  spawnTimer = v;
}
export function setDamageFlash(v) {
  damageFlash = v;
}
export function setDeathReason(v) {
  deathReason = v;
}

// ====================== 音频 ======================
window.audioCtx = null;
export function sfx(type) {
  try {
    audioCtx =
      audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    const tones = {
      shoot: [520, 0.06, "square", 0.05],
      enemy: [220, 0.08, "sawtooth", 0.05],
      hit: [180, 0.12, "sawtooth", 0.08],
      boom: [90, 0.35, "sawtooth", 0.12],
      pickup: [660, 0.1, "sine", 0.08],
      tp: [880, 0.12, "sine", 0.06],
      over: [140, 0.8, "sawtooth", 0.1],
      bounce: [700, 0.04, "triangle", 0.04],
    };
    const p = tones[type] || tones.hit;
    o.type = p[2];
    o.frequency.setValueAtTime(p[0], t);
    if (type === "boom") o.frequency.exponentialRampToValueAtTime(30, t + p[1]);
    g.gain.setValueAtTime(p[3], t);
    g.gain.exponentialRampToValueAtTime(0.001, t + p[1]);
    o.start(t);
    o.stop(t + p[1]);
  } catch (e) {}
}

// ====================== 地图 ======================
export function cellOf(x, y) {
  return { c: Math.floor(x / CELL), r: Math.floor(y / CELL) };
}
export function centerOf(c, r) {
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}
export function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// 随机生成障碍墙（每局不同），保证出生点连通
export function genMap() {
  for (let attempt = 0; attempt < 40; attempt++) {
    map = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push(
          c === 0 || c === COLS - 1 || r === 0 || r === ROWS - 1
            ? BORDER
            : EMPTY,
        );
      }
      map.push(row);
    }
    placeRandomWalls();
    placeGrass();
    if (connectivityOk()) break;
  }
  placeGates();
  window.map = map;
  window.gates = gates;
  window.crackHp = crackHp;
}

export function protectedKey(c, r) {
  return c + "," + r;
}

export function isProtectedCell(c, r) {
  if (r >= 1 && r <= 2 && c >= 1 && c <= COLS - 2) return true; // 敌人出生车道
  if (c >= 4 && c <= 6 && r >= 14 && r <= 16) return true; // 玩家出生区
  if (
    c >= PLAYER_SPAWN.c &&
    c <= PLAYER_SPAWN.c &&
    r >= PLAYER_SPAWN.r &&
    r <= PLAYER_SPAWN.r
  )
    return true; // 玩家精确出生格
  if (c >= 20 && c <= 24 && r >= 26 && r <= 28) return true; // 下方传送门出生区
  if (c >= 1 && c <= 3 && r >= 3 && r <= 4) return true; // 左上传送门入口
  if (c >= COLS - 3 && c <= COLS - 2 && r >= 3 && r <= 4) return true; // 右上传送门入口
  if (c >= 1 && c <= 3 && r >= 13 && r <= 16) return true; // 左传送门入口
  if (c >= COLS - 4 && c <= COLS - 2 && r >= 13 && r <= 16) return true; // 右传送门入口
  return false;
}

export function placeGrass() {
  for (let i = 0; i < 16; i++) {
    let c = randInt(2, COLS - 3),
      r = randInt(3, ROWS - 3);
    const len = 2 + randInt(0, 3);
    for (let j = 0; j < len; j++) {
      if (map[r] && map[r][c] === EMPTY && !isProtectedCell(c, r))
        map[r][c] = GRASS;
      const next = Math.random();
      if (next < 0.4) c++;
      else if (next < 0.7) c--;
      else if (next < 0.85) r++;
      else r--;
      if (c < 1 || c > COLS - 2 || r < 1 || r > ROWS - 2) break;
    }
  }
}

export function placeRandomWalls() {
  const protectedCells = new Set();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (isProtectedCell(c, r)) protectedCells.add(protectedKey(c, r));

  // 随机划分两个区域：左侧/顶部为砖墙区，右侧/底部为碎石墙区，两区互不穿插
  const verticalSplit = Math.random() < 0.5;
  const divider = randInt(18, 22);
  const typeOf = (c, r) => {
    const inBrickZone = verticalSplit ? c <= divider : r <= divider;
    if (inBrickZone && Math.random() < 0.6) return CRACK;
    return inBrickZone ? WALL : CRACK;
  };

  const setWall = (c, r) => {
    if (!map[r] || map[r][c] === undefined) return;
    if (map[r][c] !== EMPTY) return;
    if (protectedCells.has(protectedKey(c, r))) return;
    map[r][c] = typeOf(c, r);
  };

  // 随机岛状簇
  for (let i = 0; i < 14; i++) {
    let c = randInt(2, COLS - 3),
      r = randInt(3, ROWS - 3);
    if (protectedCells.has(protectedKey(c, r))) continue;
    const len = 2 + randInt(0, 3);
    for (let j = 0; j < len; j++) {
      setWall(c, r);
      const next = Math.random();
      if (next < 0.4) c++;
      else if (next < 0.7) c--;
      else if (next < 0.85) r++;
      else r--;
      if (c < 1 || c > COLS - 2 || r < 1 || r > ROWS - 2) break;
    }
  }
  // 随机散点
  for (let i = 0; i < 16; i++)
    setWall(randInt(2, COLS - 3), randInt(3, ROWS - 3));
  // 长墙
  for (let i = 0; i < 2; i++) {
    const horizontal = Math.random() < 0.5;
    const c0 = randInt(2, COLS - 5),
      r0 = randInt(3, ROWS - 3);
    const len = 3 + randInt(0, 3);
    for (let j = 0; j < len; j++) {
      const c = horizontal ? c0 + j : c0;
      const r = horizontal ? r0 : r0 + j;
      setWall(c, r);
      if (!horizontal && r > ROWS - 3) break;
      if (horizontal && c > COLS - 3) break;
    }
  }
  // 初始化碎石墙耐久
  crackHp = {};
  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++) {
      if (map[r][c] === CRACK) crackHp[protectedKey(c, r)] = 2 + randInt(0, 1);
    }
}

// 玩家出生点与两处敌人生成点之间必须连通（传送门可通行）
export function connectivityOk() {
  const pass = (c, r) =>
    map[r] &&
    map[r][c] !== undefined &&
    (map[r][c] === EMPTY || map[r][c] === GATE || map[r][c] === GRASS);
  const start = { c: PLAYER_SPAWN.c, r: PLAYER_SPAWN.r };
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const n = queue.pop();
    const k = protectedKey(n.c, n.r);
    if (seen.has(k)) continue;
    seen.add(k);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nn = { c: n.c + dc, r: n.r + dr };
      if (pass(nn.c, nn.r) && !seen.has(protectedKey(nn.c, nn.r)))
        queue.push(nn);
    }
  }
  return ENEMY_SPAWNS.every((t) => seen.has(protectedKey(t.c, t.r)));
}

export function placeGates() {
  gates = [];
  const mkGate = (c1, r1, c2, r2, pair) => {
    const g = { cells: [], partner: null, pair };
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++) {
        map[r][c] = GATE;
        g.cells.push({ c, r });
      }
    gates.push(g);
    return g;
  };
  const gA = mkGate(1, 14, 1, 14, "h"),
    gB = mkGate(COLS - 2, 14, COLS - 2, 14, "h");
  const gC = mkGate(Math.floor(COLS / 2), 1, Math.floor(COLS / 2), 1, "v"),
    gD = mkGate(Math.floor(COLS / 2), 28, Math.floor(COLS / 2), 28, "v");
  gA.partner = gB;
  gB.partner = gA;
  gC.partner = gD;
  gD.partner = gC;
}

export function gateAt(c, r) {
  for (const g of gates)
    for (const cell of g.cells) if (cell.c === c && cell.r === r) return g;
  return null;
}

// 击碎碎石墙
export function damageCrack(c, r, dmg) {
  if (!map[r] || map[r][c] !== CRACK) return;
  const k = protectedKey(c, r);
  crackHp[k] = (crackHp[k] || 1) - dmg;
  const cx = c * CELL + CELL / 2,
    cy = r * CELL + CELL / 2;
  spawnExplosion(cx, cy, 10, "#c9a35a");
  if (crackHp[k] <= 0) {
    map[r][c] = EMPTY;
    delete crackHp[k];
    spawnExplosion(cx, cy, 24, "#9aa0b0");
    sfx("boom");
  } else {
    sfx("hit");
  }
}

// ====================== 实体 ======================
export function spawnExplosion(x, y, r, color) {
  const n = Math.min(20, Math.floor(r / 2));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (0.5 + Math.random()) * (r / 8);
    particles.push({
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
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0,
    max: 28,
    size: r,
    color: "rgba(255,200,90,0.8)",
    ring: true,
  });
}
export function addFloat(x, y, text, color) {
  floats.push({ x, y, text, life: 0, max: 900, color });
}

export function makeTank(x, y, dirName, isPlayer) {
  return {
    id: Math.random().toString(36).slice(2),
    x,
    y,
    w: CELL - 4,
    h: CELL - 4,
    dirName,
    dir: { ...DIRS[dirName] },
    isPlayer,
    hp: isPlayer ? 3 : 2,
    maxHp: isPlayer ? 3 : 2,
    speed: isPlayer ? 100 : 55,
    alive: true,
    invincible: 0,
    dirTimer: Math.random() * 1.2,
    fireCd: 0,
    name: isPlayer ? "玩家" : "",
    // buffs
    shieldT: 0,
    speedT: 0,
    fireT: 0,
    spreadT: 0,
    drones: 0,
    mines: 0,
    bounces: false,
    flash: 0,
  };
}

export function resetGame() {
  gtMs = 0;
  kills = 0;
  bossKills = 0;
  spawnTimer = 3;
  boss = null;
  lastBossKills = 0;
  baseEnemyHp = 2;
  if (!mapGenerated) {
    genMap();
    mapGenerated = true;
  } else {
    // 游戏重置时恢复地图中可破坏的碎石墙的耐久值
    crackHp = {};
    for (let r = 1; r < ROWS - 1; r++)
      for (let c = 1; c < COLS - 1; c++) {
        if (map[r][c] === CRACK)
          crackHp[protectedKey(c, r)] = 2 + randInt(0, 1);
      }
  }
  tanks = [];
  bullets = [];
  items = [];
  mines = [];
  drones = [];
  particles = [];
  floats = [];
  lastTeleport = {};
  window.tanks = tanks;
  window.bullets = bullets;
  window.items = items;
  window.mines = mines;
  window.drones = drones;
  window.particles = particles;
  window.floats = floats;
  window.lastTeleport = lastTeleport;
  window.map = map;
  window.gates = gates;
  window.crackHp = crackHp;
  const sp = centerOf(PLAYER_SPAWN.c, PLAYER_SPAWN.r);
  player = makeTank(sp.x - (CELL - 4) / 2, sp.y - (CELL - 4) / 2, "up", true);
  player.invincible = 2000;
  window.player = player;
  tanks.push(player);
  spawnEnemy(true);
  spawnEnemy(true);
  updateHud();
}

// 根据击杀数计算最大敌人数量：0~5击杀=2个，之后每增加10击杀加1个，最多8个
export function maxEnemies() {
  return Math.min(8, 2 + Math.floor(Math.max(0, kills - 5) / 10));
}

export function spawnEnemy(instant) {
  if (tanks.filter((t) => t.alive && !t.isPlayer).length >= maxEnemies())
    return;
  const available = ENEMY_SPAWNS.filter((s) => {
    if (!player || !player.alive) return true;
    const spCx = s.c * CELL + CELL / 2;
    const spCy = s.r * CELL + CELL / 2;
    const pCx = player.x + player.w / 2;
    const pCy = player.y + player.h / 2;
    return Math.abs(spCx - pCx) > 60 || Math.abs(spCy - pCy) > 60;
  });
  if (available.length === 0) return;
  let sp = available[0];
  let least = Infinity;
  for (const s of available) {
    const cnt = tanks.filter(
      (t) =>
        t.alive &&
        !t.isPlayer &&
        Math.abs(t.x - (s.c * CELL + 2)) < 60 &&
        Math.abs(t.y - (s.r * CELL + 2)) < 60,
    ).length;
    if (cnt < least) {
      least = cnt;
      sp = s;
    }
  }
  const x = sp.c * CELL + 2;
  const y = sp.r * CELL + 2;
  const t = makeTank(x, y, Math.random() < 0.5 ? "down" : "left", false);
  const diff = 1 + Math.floor(gtMs / 45000);
  t.speed = Math.min(55 + diff * 10, 88);
  t.hp = baseEnemyHp;
  t.maxHp = baseEnemyHp;
  t.invincible = instant ? 300 : 800;
  tanks.push(t);
  sfx("enemy");
}

// 生成关卡boss
export function spawnBoss() {
  // 寻找合适的出生位置（屏幕中央）
  let c = Math.floor(COLS / 2) - 1;
  let r = Math.floor(ROWS / 2) - 1;

  // 检查位置是否可用
  if (TankActions.blocked(c * CELL, r * CELL, CELL * 2, CELL * 2, null)) {
    // 如果中央位置不可用，尝试其他位置
    for (let i = 0; i < 10; i++) {
      const randC = randInt(2, COLS - 4);
      const randR = randInt(2, ROWS - 4);
      if (
        !TankActions.blocked(
          randC * CELL,
          randR * CELL,
          CELL * 2,
          CELL * 2,
          null,
        )
      ) {
        c = randC;
        r = randR;
        break;
      }
    }
  }

  boss = {
    id: Math.random().toString(36).slice(2),
    x: c * CELL,
    y: r * CELL,
    w: CELL * 2,
    h: CELL * 2,
    dirName: "down",
    dir: { ...DIRS.down },
    hp: kills,
    maxHp: kills,
    speed: 40,
    alive: true,
    invincible: 1000,
    spreadCd: 3,
    rotateCd: 6,
    moveTimer: 0,
  };

  sfx("boom");
  addFloat(
    boss.x + boss.w / 2,
    boss.y + boss.h / 2,
    "关卡BOSS出现！",
    "#ee5253",
  );
}

// ====================== 敌人 ======================
export function killEnemy(t) {
  t.alive = false;
  spawnExplosion(t.x + t.w / 2, t.y + t.h / 2, 34, "#ff8a5a");
  kills += 1;
  sfx("boom");
  if (Math.random() < 0.28) spawnItemAtTank(t);
  updateHud();

  // 检查是否需要生成关卡boss
  checkSpawnBoss();
}

// 检查是否需要生成关卡boss
export function checkSpawnBoss() {
  if (boss && boss.alive) return;
  // boss出现击杀数为 10 20 40 80 ... 每个翻倍
  const next = lastBossKills === 0 ? 10 : lastBossKills * 2;
  if (kills >= next) {
    lastBossKills = next;
    spawnBoss();
  }
}

// 杀死boss
export function killBoss() {
  if (!boss || !boss.alive) return;
  boss.alive = false;
  spawnExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, 60, "#ee5253");
  kills += 25;
  bossKills += 1;
  baseEnemyHp += 1;
  sfx("boom");
  addFloat(boss.x + boss.w / 2, boss.y + boss.h / 2, "BOSS已击败！", "#ee5253");
  // 防止击杀数超过阈值立即刷新下一个boss
  lastBossKills = Math.max(lastBossKills, kills);
  // 掉落高级道具
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      spawnItemAtPosition(boss.x + boss.w / 2, boss.y + boss.h / 2);
    }, i * 500);
  }
  updateHud();
}

// 在指定位置生成道具
export function spawnItemAtPosition(x, y) {
  const cc = cellOf(x, y);
  if (map[cc.r][cc.c] !== EMPTY) return;
  const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  items.push({
    def,
    x: cc.c * CELL,
    y: cc.r * CELL,
    size: CELL,
    age: 0,
    life: 12000,
    dead: false,
  });
}

// ====================== 道具 ======================
export const ITEMS = [
  { id: "drone", icon: "🚁", name: "无人机", color: "#4fd1ff", max: 3 },
  { id: "spread", icon: "✨", name: "散弹", color: "#e0a93a", max: 1 },
  { id: "fire", icon: "⚡", name: "射速", color: "#ffe14d", max: 1 },
  { id: "speed", icon: "💨", name: "移速", color: "#7de07d", max: 1 },
  { id: "shield", icon: "🛡️", name: "护盾", color: "#58a6ff", max: 1 },
  { id: "mine", icon: "💣", name: "地雷", color: "#c9845a", max: 3 },
  { id: "heal", icon: "❤️", name: "生命", color: "#ff6b81", max: 1 },
  { id: "bounce", icon: "🔄", name: "反弹", color: "#a855f7", max: 1 },
];

export function itemTimer(itemId) {
  if (itemId === "drone") return 0;
  if (itemId === "mine") return 0;
  if (itemId === "spread") return 18000; // 散弹持续时间延长一倍
  return 9000;
}

export function spawnItemAtTank(t) {
  const cc = cellOf(t.x + t.w / 2, t.y + t.h / 2);
  const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  items.push({
    def,
    x: cc.c * CELL,
    y: cc.r * CELL,
    size: CELL,
    age: 0,
    life: 12000,
    dead: false,
  });
}

export function spawnRandomItem() {
  const empty = [];
  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++) {
      if (map[r][c] !== EMPTY) continue;
      let free = true;
      for (const it of items) {
        if (it.x / CELL === c && it.y / CELL === r) {
          free = false;
          break;
        }
      }
      if (free) empty.push({ c, r });
    }
  if (empty.length === 0) return;
  const pick = empty[Math.floor(Math.random() * empty.length)];
  const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  items.push({
    def,
    x: pick.c * CELL,
    y: pick.r * CELL,
    size: CELL,
    age: 0,
    life: 12000,
    dead: false,
  });
}

window.damageFlash = 0;
window.itemSpawnTimer = 3;
window.deathReason = "";
export function updateItems(dt) {
  itemSpawnTimer -= dt;
  if (itemSpawnTimer <= 0) {
    if (items.length < 4) spawnRandomItem();
    itemSpawnTimer = 3.5 + Math.random() * 3;
  }
  for (const it of items) {
    it.age += dt;
    if (it.age * 1000 > it.life) {
      it.dead = true;
      continue;
    }
    if (
      TankActions.rectHit(
        { x: player.x, y: player.y, w: player.w, h: player.h },
        it,
      )
    ) {
      pickupItem(it);
      it.dead = true;
    }
  }
  items = items.filter((it) => !it.dead);
}

export function pickupItem(it) {
  const id = it.def.id;
  const now = gtMs;
  sfx("pickup");
  addFloat(it.x + CELL / 2, it.y - 8, it.def.name + " UP", it.def.color);
  spawnExplosion(it.x + CELL / 2, it.y + CELL / 2, 20, it.def.color);
  switch (id) {
    case "drone":
      if (player.drones < ITEMS[0].max) {
        player.drones++;
        drones.push({
          x: player.x,
          y: player.y - 20,
          w: 20,
          h: 20,
          hp: 3,
          fireCd: 0.5,
          age: 0,
        });
      }
      break;
    case "spread":
      player.spreadT = now + itemTimer("spread");
      break;
    case "fire":
      player.fireT = now + itemTimer("fire");
      break;
    case "speed":
      player.speedT = now + itemTimer("speed");
      break;
    case "shield":
      player.shieldT = now + itemTimer("shield");
      break;
    case "mine":
      player.mines += 3;
      break;
    case "heal":
      if (player.hp < player.maxHp) {
        player.hp++;
        sfx("pickup");
      }
      break;
    case "bounce":
      player.bounces = true;
      break;
  }
  updateHud();
}

// ====================== 地雷 ======================
export function explodeMine(m) {
  if (m.dead) return;
  m.dead = true;
  spawnExplosion(m.x + CELL / 2, m.y + CELL / 2, 40, "#ff9a3a");
  sfx("boom");
  const cc = cellOf(m.x + CELL / 2, m.y + CELL / 2);
  // 波及 3x3 范围内的碎石墙
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const r = cc.r + dr,
        c = cc.c + dc;
      if (map[r] && map[r][c] === CRACK) damageCrack(c, r, 2);
    }
  // 波及 3x3 范围内的敌方坦克
  const x1 = (cc.c - 1) * CELL,
    y1 = (cc.r - 1) * CELL,
    x2 = (cc.c + 2) * CELL,
    y2 = (cc.r + 2) * CELL;
  for (const t of tanks) {
    if (!t.alive || t.isPlayer) continue;
    const tx = t.x + t.w / 2,
      ty = t.y + t.h / 2;
    if (tx >= x1 && tx < x2 && ty >= y1 && ty < y2) {
      t.hp -= 6;
      spawnExplosion(t.x + t.w / 2, t.y + t.h / 2, 20, "#ff8a5a");
      if (t.hp <= 0) killEnemy(t);
    }
  }
  updateHud();
}

export function updateMines(dt) {
  for (const m of mines) {
    m.age += dt;
    for (const t of tanks) {
      if (t.isPlayer || !t.alive) continue;
      if (TankActions.rectHit({ x: t.x, y: t.y, w: t.w, h: t.h }, m)) {
        explodeMine(m);
        break;
      }
    }
  }
  mines = mines.filter((m) => !m.dead);
}

// ====================== 更新 ======================
export function update(dt) {
  gtMs += dt * 1000;

  // AI 更新（在玩家控制之前）
  AIPlayer.update(dt);

  TankActions.updatePlayer(dt);
  TankActions.updateBullets(dt);
  TankActions.updateEnemies(dt);
  updateMines(dt);
  updateItems(dt);
  updateParticles(dt);
  updateFloats(dt);

  // 更新boss
  if (boss && boss.alive) {
    TankActions.moveBoss(dt);
    TankActions.bossFire(dt);
  } else {
    // 检查是否需要生成新boss
    checkSpawnBoss();
  }
}

export function updateParticles(dt) {
  for (const p of particles) {
    p.life += dt * 1000;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
  }
  particles = particles.filter((p) => p.life < p.max);
}
export function updateFloats(dt) {
  for (const f of floats) {
    f.life += dt * 1000;
    f.y -= 0.6;
  }
  floats = floats.filter((f) => f.life < f.max);
}

// ====================== 绘制 ======================
export function drawMap() {
  const m = window.map || map;
  ctx.fillStyle = "#202a1c";
  ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * CELL,
        y = r * CELL;
      const v = m[r][c];
      if (v === EMPTY) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = "#1d2619";
          ctx.fillRect(x, y, CELL, CELL);
        }
        continue;
      }
      if (v === BORDER) {
        ctx.fillStyle = "#3d4650";
        ctx.fillRect(x, y, CELL, CELL);
        ctx.fillStyle = "#2a3138";
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = "#20262c";
        ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
        continue;
      }
      if (v === WALL) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = "#aeb6c0";
        ctx.fillRect(x, y, CELL, CELL);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = "#c6cdd6";
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        ctx.strokeStyle = "rgba(60,70,85,.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y + CELL / 2);
        ctx.lineTo(x + CELL, y + CELL / 2);
        ctx.moveTo(x + CELL / 2, y);
        ctx.lineTo(x + CELL / 2, y + CELL / 2);
        ctx.moveTo(x + CELL / 4, y + CELL / 2);
        ctx.lineTo(x + CELL / 4, y + CELL);
        ctx.moveTo(x + (CELL * 3) / 4, y + CELL / 2);
        ctx.lineTo(x + (CELL * 3) / 4, y + CELL);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      if (v === CRACK) {
        const hp = crackHp[protectedKey(c, r)] || 1;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = "#ff9f43";
        ctx.fillRect(x, y, CELL, CELL);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = "#ffbe76";
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        ctx.strokeStyle = hp <= 1 ? "#ff9a5a" : "#c2600f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + CELL - 4);
        ctx.lineTo(x + 8, y + 8);
        ctx.lineTo(x + 12, y + 5);
        ctx.lineTo(x + CELL - 3, y + 8);
        ctx.stroke();
        if (hp <= 1) {
          ctx.strokeStyle = "#ff9a5a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 5);
          ctx.lineTo(x + CELL - 4, y + CELL - 4);
          ctx.moveTo(x + CELL - 5, y + 5);
          ctx.lineTo(x + 5, y + CELL - 4);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,255,255,.55)";
        for (let i = 0; i < hp; i++) ctx.fillRect(x + 2 + i * 5, y + 2, 3, 2);
        ctx.restore();
        continue;
      }
      if (v === GRASS) {
        drawGrassCell(c, r);
        continue;
      }
      if (v === GATE) {
        const pulse = 0.5 + 0.5 * Math.sin(gtMs / 250 + c * 0.6 + r * 0.3);
        ctx.fillStyle = `rgba(40,90,140,${0.25 + pulse * 0.35})`;
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = `rgba(120,200,255,${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = `rgba(160,220,255,${0.5 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(x + CELL / 2, y + CELL / 2, 3 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
    }
  }
}

export function drawGrassCell(c, r) {
  const x = c * CELL,
    y = r * CELL;
  const seed = (c * 7919 + r * 104729) % 97;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.4)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "#1a4a1e";
  ctx.fillRect(x, y, CELL, CELL);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "#3f9e3f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const gx = x + 2 + ((seed * (i + 3)) % 16);
    const gy = y + 2 + ((seed * (i + 5)) % 16);
    ctx.moveTo(gx, gy + 3);
    ctx.lineTo(gx + 1.5, gy);
    ctx.lineTo(gx + 3, gy + 3);
  }
  ctx.stroke();
  ctx.strokeStyle = "#2e7d2e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const gx = x + 3 + ((seed * (i + 7)) % 14);
    const gy = y + 3 + ((seed * (i + 11)) % 14);
    ctx.moveTo(gx, gy + 3);
    ctx.lineTo(gx + 1.5, gy - 1);
    ctx.lineTo(gx + 3, gy + 3);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawGrassOverlay() {
  const m = window.map || map;
  ctx.globalAlpha = 0.8;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (m[r][c] === GRASS) drawGrassCell(c, r);
  ctx.globalAlpha = 1;
}

export function drawTank(t) {
  if (!t.alive) return;
  if (t.invincible > 0 && Math.floor(gtMs / 100) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }
  const cx = t.x + t.w / 2,
    cy = t.y + t.h / 2;
  const ang = Math.atan2(t.dir.y, t.dir.x);
  const img = t.isPlayer ? playerImg : enemyImg;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang + Math.PI / 2);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -t.w / 2 - 1, -t.h / 2 - 1, t.w + 2, t.h + 2);
  } else {
    ctx.fillStyle = t.isPlayer ? "#3f9e5a" : "#c0554a";
    ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
  }
  ctx.restore();
  // 玩家名称（随坦克移动）
  if (t.isPlayer) {
    const label = AIPlayer.enabled ? AIPlayer.aiName : "玩家";
    ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(0,0,0,.8)";
    ctx.fillText(label, cx + 1, cy - t.h / 2 - 5);
    ctx.fillStyle = "#e8ffcf";
    ctx.fillText(label, cx, cy - t.h / 2 - 6);
  }
  // 血条(敌人)
  if (!t.isPlayer) {
    const pct = Math.max(0, t.hp / t.maxHp);
    ctx.fillStyle = "#1c1f1c";
    ctx.fillRect(cx - t.w / 2, cy - t.h / 2 - 6, t.w, 4);
    ctx.fillStyle = pct > 0.5 ? "#7de07d" : pct > 0.25 ? "#ffd76e" : "#ff6b6b";
    ctx.fillRect(cx - t.w / 2, cy - t.h / 2 - 6, t.w * pct, 4);
  }
  ctx.globalAlpha = 1;
}

export function drawBoss() {
  if (!boss || !boss.alive) return;

  if (boss.invincible > 0 && Math.floor(gtMs / 100) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  const cx = boss.x + boss.w / 2,
    cy = boss.y + boss.h / 2;

  // 绘制boss
  ctx.save();
  ctx.translate(cx, cy);
  const ang = Math.atan2(boss.dir.y, boss.dir.x);
  ctx.rotate(ang + Math.PI / 2);

  if (bossImg && bossImg.complete && bossImg.naturalWidth > 0) {
    ctx.drawImage(
      bossImg,
      -boss.w / 2 - 1,
      -boss.h / 2 - 1,
      boss.w + 2,
      boss.h + 2,
    );
  } else {
    ctx.fillStyle = "#ee5253";
    ctx.fillRect(-boss.w / 2, -boss.h / 2, boss.w, boss.h);
  }
  ctx.restore();

  // 血条
  const pct = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = "#1c1f1c";
  ctx.fillRect(cx - boss.w / 2, cy - boss.h / 2 - 6, boss.w, 4);
  ctx.fillStyle = pct > 0.5 ? "#7de07d" : pct > 0.25 ? "#ffd76e" : "#ff6b6b";
  ctx.fillRect(cx - boss.w / 2, cy - boss.h / 2 - 6, boss.w * pct, 4);

  ctx.globalAlpha = 1;
}

export function drawPlayer() {
  drawTank(player);
  if (player.shieldT > gtMs) {
    const cx = player.x + player.w / 2,
      cy = player.y + player.h / 2;
    ctx.strokeStyle = "rgba(88,166,255,.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(160,220,255,.4)";
    ctx.beginPath();
    ctx.arc(cx, cy, 27, gtMs / 200, gtMs / 200 + Math.PI * 1.4);
    ctx.stroke();
  }
}

export function drawBullets() {
  const arr = window.bullets || bullets;
  for (const b of arr) {
    ctx.fillStyle = b.owner === "player" ? "#ffd76e" : "#ff5a4a";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    ctx.fill();
    if (b.bounced) {
      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export function drawItems() {
  const arr = window.items || items;
  for (const it of arr) {
    const left = it.life - it.age * 1000;
    const blink = left < 3000 && Math.floor(gtMs / 150) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.4;
    const x = it.x + CELL / 2,
      y = it.y + CELL / 2 + Math.sin(gtMs / 300 + it.x) * 2;
    ctx.fillStyle = it.def.color;
    ctx.globalAlpha *= 0.2;
    ctx.beginPath();
    ctx.arc(x, y, CELL / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = blink ? 0.4 : 1;
    ctx.font = "20px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(it.def.icon, x, y);
    ctx.globalAlpha = 1;
  }
}

export function drawMines() {
  for (const m of mines) {
    ctx.fillStyle = "#3a3a3a";
    ctx.beginPath();
    ctx.arc(m.x + 10, m.y + 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9845a";
    ctx.beginPath();
    ctx.arc(m.x + 10, m.y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe14d";
    ctx.fillRect(m.x + 9, m.y + 2, 2, 2);
    ctx.globalAlpha = 1;
  }
}

export function drawDrones() {
  for (const dr of drones) {
    const pulse = 0.6 + 0.4 * Math.sin(gtMs / 120 + dr.x);
    ctx.fillStyle = `rgba(79,209,255,${0.3 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(dr.x, dr.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4fd1ff";
    ctx.fillRect(dr.x - 2, dr.y - 7, 4, 14);
    ctx.fillRect(dr.x - 7, dr.y - 2, 14, 4);
    ctx.fillStyle = "#eaf9ff";
    ctx.beginPath();
    ctx.arc(dr.x, dr.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawParticles() {
  const arr = window.particles || particles;
  for (const p of arr) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = a;
    if (p.ring) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - p.life / p.max) + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawFloats() {
  const arr = window.floats || floats;
  ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of arr) {
    const a = 1 - f.life / f.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = "#000";
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// ====================== HUD ======================
export async function loadHighScore() {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.employeeId) return;
    const res = await getScore(userInfo.employeeId);
    const score = res?.data?.highScore;
    if (typeof score === "number" && score > hiScore) {
      hiScore = score;
      localStorage.setItem("tank-hi", String(hiScore));
    }
    const bossScore = res?.data?.highBossKills;
    if (typeof bossScore === "number" && bossScore > hiBossKills) {
      hiBossKills = bossScore;
      localStorage.setItem("tank-hi-boss", String(hiBossKills));
    }
    updateHud();
  } catch (err) {
    console.error("获取最高击杀数失败:", err);
  }
}

export function updateHud() {
  const heartEl = document.getElementById("hud-heart");
  if (heartEl) {
    let s = "";
    for (let i = 0; i < player.maxHp; i++) s += i < player.hp ? "❤️" : "🖤";
    heartEl.textContent = s;
  }
  const sc = document.getElementById("hud-score");
  if (sc) sc.textContent = kills;
  const bsc = document.getElementById("hud-boss-score");
  if (bsc) bsc.textContent = Math.max(hiBossKills, bossKills);
  const hi = document.getElementById("hud-hi");
  if (hi) hi.textContent = Math.max(hiScore, kills);
  let mine = document.getElementById("hud-mine");
  if (player.mines > 0) {
    if (!mine) {
      const el = document.createElement("span");
      el.className = "bar";
      el.id = "hud-mine";
      el.innerHTML = "💣 <b>0</b>";
      const buff = document.getElementById("hud-buff");
      buff.parentNode.insertBefore(el, buff);
      mine = el;
    }
    const mineB = mine.querySelector("b");
    if (mineB) mineB.textContent = player.mines;
  } else if (mine) {
    mine.remove();
  }
  const buff = document.getElementById("hud-buff");
  if (buff) {
    const arr = [];
    if (player.shieldT > gtMs)
      arr.push("🛡️" + Math.ceil((player.shieldT - gtMs) / 1000) + "s");
    if (player.fireT > gtMs)
      arr.push("⚡" + Math.ceil((player.fireT - gtMs) / 1000) + "s");
    if (player.speedT > gtMs)
      arr.push("💨" + Math.ceil((player.speedT - gtMs) / 1000) + "s");
    if (player.spreadT > gtMs)
      arr.push("✨" + Math.ceil((player.spreadT - gtMs) / 1000) + "s");
    if (player.drones > 0)
      arr.push(
        "🚁×" +
          Math.min(player.drones, ITEMS.find((i) => i.id === "drone").max),
      );
    if (player.bounces) arr.push("🔄");
    buff.textContent = arr.length ? arr.join(" ") : "";
  }
}

// ====================== 主循环 ======================
window.lastTime = 0;
export function loop(ts) {
  const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0.016);
  lastTime = ts;
  if (state === "playing") update(dt * gameSpeed);
  if (damageFlash > 0) damageFlash -= dt * 1000;
  updateHud();

  drawMap();
  drawItems();
  drawMines();
  drawDrones();
  drawBullets();
  for (const t of tanks) if (t !== player) drawTank(t);
  drawBoss();
  drawPlayer();
  drawGrassOverlay();
  drawParticles();
  drawFloats();

  if (damageFlash > 0) {
    ctx.strokeStyle = `rgba(255, 0, 0, ${0.4 * Math.min(1, damageFlash / 150)})`;
    ctx.lineWidth = 12;
    ctx.strokeRect(2, 2, W - 4, H - 4);
  }

  requestAnimationFrame(loop);
}

// ====================== 流程 ======================
export function gameOver() {
  state = "over";
  player.alive = false;
  spawnExplosion(
    player.x + player.w / 2,
    player.y + player.h / 2,
    40,
    "#ff4a3a",
  );
  sfx("over");
  if (kills > hiScore) {
    hiScore = kills;
    localStorage.setItem("tank-hi", String(hiScore));
  }
  if (bossKills > hiBossKills) {
    hiBossKills = bossKills;
    localStorage.setItem("tank-hi-boss", String(hiBossKills));
  }
  document.getElementById("ov-over-score").textContent =
    "击杀：" +
    kills +
    "　Boss击杀：" +
    hiScore +
    "　最高Boss击杀：" +
    hiBossKills;
  document.getElementById("ov-over-reason").textContent =
    "死因：" + (deathReason || "不明原因");

  const logCount = AILogger.getRecordCount();
  const logBtn = document.getElementById("btn-ai-log");
  if (logBtn) {
    logBtn.textContent = `死亡日志 (${logCount})`;
    logBtn.style.display = "inline-block";
  }

  AIPlayer.notifyDeath(deathReason);

  document.getElementById("ov-over").classList.remove("hidden");

  // 保存当局击杀数到服务器
  try {
    const userInfo = getUserInfo();
    if (userInfo.employeeId) {
      saveGameKills(userInfo.employeeId, kills, bossKills).catch((err) => {
        console.warn("[Game] 保存击杀数据失败:", err);
      });
      addDeath(userInfo.employeeId).catch((err) => {
        console.warn("[Game] 保存死亡数失败:", err);
      });
    }
  } catch (e) {
    console.warn("[Game] 保存游戏数据异常:", e);
  }
}

export function startGame() {
  resetGame();
  AIPlayer.init();
  state = "playing";
  document.getElementById("ov-start").classList.add("hidden");
  document.getElementById("ov-over").classList.add("hidden");
  document.getElementById("ov-pause").classList.add("hidden");
}

export function togglePause() {
  if (state === "playing") {
    state = "paused";
    document.getElementById("ov-pause").classList.remove("hidden");
  } else if (state === "paused") {
    state = "playing";
    document.getElementById("ov-pause").classList.add("hidden");
    lastTime = performance.now();
  }
}

// ====================== UI 初始化 ======================
export function initGame() {
  initCanvas();

  // ====================== 输入 ======================
  document.addEventListener("keydown", (e) => {
    if (state !== "playing" && state !== "paused") {
      if (e.code === "Space" || e.code === "Enter") {
        startGame();
        e.preventDefault();
      }
      return;
    }
    const k = e.key.toLowerCase();
    if (e.code === "Space") {
      keys.fire = true;
      e.preventDefault();
    } else if (e.code === "KeyJ") keys.fire = true;
    else if (k === "w" || e.code === "ArrowUp") {
      keys.up = true;
      e.preventDefault();
    } else if (k === "s" || e.code === "ArrowDown") {
      keys.down = true;
      e.preventDefault();
    } else if (k === "a" || e.code === "ArrowLeft") {
      keys.left = true;
      e.preventDefault();
    } else if (k === "d" || e.code === "ArrowRight") {
      keys.right = true;
      e.preventDefault();
    } else if (k === "k") {
      if (state === "playing") keys.mine = true;
    } else if (k === "p") togglePause();
    else if (k === "r" && state !== "start") startGame();
    else if (k === "t" && state === "playing") toggleAI();
  });
  document.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (e.code === "Space" || e.code === "KeyJ") keys.fire = false;
    else if (k === "w" || e.code === "ArrowUp") keys.up = false;
    else if (k === "s" || e.code === "ArrowDown") keys.down = false;
    else if (k === "a" || e.code === "ArrowLeft") keys.left = false;
    else if (k === "d" || e.code === "ArrowRight") keys.right = false;
    else if (k === "k") keys.mine = false;
  });

  // 移动端按钮
  document.querySelectorAll("#controls [data-key]").forEach((btn) => {
    const k = btn.dataset.key;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      keys[k] = true;
    });
    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      keys[k] = false;
    });
    btn.addEventListener("pointerleave", () => {
      keys[k] = false;
    });
    btn.addEventListener("pointercancel", () => {
      keys[k] = false;
    });
  });

  // 阻止方向键滚动
  window.addEventListener(
    "keydown",
    (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
    },
    { passive: false },
  );

  document.getElementById("btn-start").addEventListener("click", startGame);
  document.getElementById("btn-restart").addEventListener("click", startGame);
  document.getElementById("btn-restart2").addEventListener("click", () => {
    if (state !== "start") startGame();
  });
  document.getElementById("btn-pause").addEventListener("click", () => {
    if (state === "playing" || state === "paused") togglePause();
  });
  document.getElementById("btn-resume").addEventListener("click", togglePause);

  // AI 按钮
  const btnAI = document.getElementById("btn-ai");
  btnAI.addEventListener("click", toggleAI);

  // 倍速按钮（仅AI模式可用）
  const btnSpeed = document.getElementById("btn-speed");
  const SPEEDS = [1, 2, 4, 8];
  function cycleSpeed() {
    const idx = SPEEDS.indexOf(gameSpeed);
    gameSpeed = SPEEDS[(idx + 1) % SPEEDS.length];
    btnSpeed.textContent = "⏩ " + gameSpeed + "x";
  }
  btnSpeed.addEventListener("click", () => {
    if (!AIPlayer.enabled) return;
    cycleSpeed();
  });

  // ====================== 导入自定义 AI 脚本 ======================
  const btnImportAI = document.getElementById("btn-import-ai");
  const aiFileInput = document.getElementById("ai-file");

  btnImportAI.addEventListener("click", () => aiFileInput.click());

  aiFileInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const name = await AIPlayer.loadFromFile(file);
      if (!AIPlayer.enabled) {
        AIPlayer.toggle();
        btnAI.classList.toggle("active", true);
      }
      // 若已开启AI，刷新按钮/状态文案
      AIPlayer.updateUI();
      void name;
    } catch (err) {
      alert("AI 脚本加载失败：" + err.message);
    } finally {
      aiFileInput.value = "";
    }
  });

  function toggleAI() {
    const enabled = AIPlayer.toggle();
    btnAI.classList.toggle("active", enabled);
    btnSpeed.disabled = !enabled;
    if (!enabled) {
      gameSpeed = 1;
      btnSpeed.textContent = "⏩ 1x";
    }
  }

  // ====================== AI 日志面板 ======================
  function showAILog() {
    const records = AILogger.getRecords();
    const content = document.getElementById("ai-log-content");

    if (records.length === 0) {
      content.innerHTML =
        '<p style="color:#9fb6a6;text-align:center">暂无死亡日志</p>';
    } else {
      content.innerHTML = records
        .map(
          (r, i) => `
      <div class="log-item">
        <div class="log-header">死亡 #${i + 1} - ${
          r.type === "ai" ? `🤖 ${r.aiName || "AI"}` : "🎮 玩家"
        } - ${r.deathReason}</div>
        <div class="log-detail">时间: <span>${new Date(r.timestamp).toLocaleString()}</span></div>
        <div class="log-detail">击杀: <span>${r.kills ?? 0}</span></div>
        <div class="log-detail">Boss击杀: <span>${r.bossKills ?? 0}</span></div>
        <div class="log-detail">位置: <span>(${Math.round(r.playerState.x)}, ${Math.round(r.playerState.y)})</span></div>
        ${
          r.type === "ai"
            ? `<div class="log-detail">躲避中: <span>${r.aiState.wasDodging ? "是" : "否"}</span></div>`
            : ""
        }
        <div class="log-detail">环境 - 敌人数: <span>${r.surroundings.enemyCount}</span> | 子弹数: <span>${r.surroundings.bulletCount}</span></div>
        ${r.surroundings.threatBullets.length > 0 ? `<div class="log-detail">威胁子弹: <span>${r.surroundings.threatBullets.length}个</span></div>` : ""}
        ${
          r.type === "ai" && r.decisionLog.length > 0
            ? `
          <div class="log-decisions">
            <div style="margin-bottom:4px;font-weight:bold">决策历史 (最近${r.decisionLog.length}次):</div>
            ${r.decisionLog
              .slice(-5)
              .map(
                (d) => `
              <div>[${d.time.toFixed(1)}s] ${d.action}</div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `,
        )
        .join("");
    }

    document.getElementById("ov-ai-log").classList.remove("hidden");
  }

  function hideAILog() {
    document.getElementById("ov-ai-log").classList.add("hidden");
  }

  function exportAILog() {
    const json = AILogger.exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `death-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAILog() {
    AILogger.clear();
    document.getElementById("ai-log-content").innerHTML =
      '<p style="color:#9fb6a6;text-align:center">日志已清除</p>';
    const logBtn = document.getElementById("btn-ai-log");
    if (logBtn) logBtn.textContent = "死亡日志 (0)";
  }

  document.getElementById("btn-ai-log").addEventListener("click", showAILog);
  document.getElementById("btn-close-log").addEventListener("click", hideAILog);
  document
    .getElementById("btn-export-log")
    .addEventListener("click", exportAILog);
  document
    .getElementById("btn-clear-log")
    .addEventListener("click", clearAILog);
  document
    .getElementById("btn-export-death-log")
    .addEventListener("click", showAILog);

  // ====================== 画面缩放 / 全屏 ======================
  function isFullscreen() {
    return !!document.fullscreenElement;
  }

  function fitCanvas() {
    const pad = 10;
    let availW = window.innerWidth - pad;
    let availH = window.innerHeight - pad;
    const hud = document.getElementById("hud");
    const group = document.getElementById("btn-group");
    const statusEl = document.getElementById("ai-status");
    const controls = document.getElementById("controls");
    const chromeH =
      (hud ? hud.offsetHeight : 0) +
      (group ? group.offsetHeight + 8 : 0) +
      (statusEl && statusEl.style.display !== "none"
        ? statusEl.offsetHeight + 6
        : 0) +
      (controls && getComputedStyle(controls).display !== "none"
        ? controls.offsetHeight
        : 0);
    availH -= chromeH;
    const scale = Math.min(availW / W, availH / H);
    canvas.style.width = Math.round(W * scale) + "px";
    canvas.style.height = Math.round(H * scale) + "px";
  }

  function toggleFullscreen() {
    if (isFullscreen()) {
      document.exitFullscreen();
    } else {
      (
        document.documentElement.requestFullscreen ||
        document.documentElement.webkitRequestFullscreen
      ).call(document.documentElement);
    }
  }

  document
    .getElementById("btn-fullscreen")
    .addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", fitCanvas);
  document.addEventListener("webkitfullscreenchange", fitCanvas);
  window.addEventListener("resize", fitCanvas);
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyF") toggleFullscreen();
  });

  fitCanvas();

  window.addEventListener("blur", () => {
    if (state === "playing" && !AIPlayer.enabled) togglePause();
  });

  // ====================== 启动 ======================
  resetGame();
  updateHud();
  loadHighScore();
  document.getElementById("btn-speed").textContent = "⏩ 1x";
  document.getElementById("btn-speed").disabled = true;
  requestAnimationFrame((t) => {
    lastTime = t;
    requestAnimationFrame(loop);
  });
}
