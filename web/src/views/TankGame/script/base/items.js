import { CELL, COLS, ROWS, EMPTY, CRACK } from "./constants.js";
import { cellOf, damageCrack } from "./map.js";
import { sfx } from "./audio.js";
import { spawnExplosion, addFloat } from "./effects.js";
import { checkLevelWin, showLevelComplete } from "./level.js";
import { TankActions } from "../tank-actions.js";
import { updateHud } from "./hud.js";
import { killEnemy, killBoss } from "./enemies.js";

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
  if (itemId === "spread") return 18000;
  return 9000;
}

export function spawnItemAtTank(t) {
  const cc = cellOf(t.x + t.w / 2, t.y + t.h / 2);
  const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  window.items.push({
    def,
    x: cc.c * CELL,
    y: cc.r * CELL,
    size: CELL,
    age: 0,
    life: 12000,
    dead: false,
  });
}

export function spawnItemAtCell(c, r, itemId) {
  const def = ITEMS.find((it) => it.id === itemId);
  if (!def) return;
  window.items.push({
    def,
    x: c * CELL,
    y: r * CELL,
    size: CELL,
    age: 0,
    life: 999999999,
    dead: false,
  });
}

export function spawnRandomItem() {
  const empty = [];
  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++) {
      if (window.map[r][c] !== EMPTY) continue;
      let free = true;
      for (const it of window.items) {
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
  window.items.push({
    def,
    x: pick.c * CELL,
    y: pick.r * CELL,
    size: CELL,
    age: 0,
    life: 12000,
    dead: false,
  });
}

export function spawnItemAtPosition(x, y) {
  const cc = cellOf(x, y);
  if (window.map[cc.r][cc.c] !== EMPTY) return;
  const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  window.items.push({
    def,
    x: cc.c * CELL,
    y: cc.r * CELL,
    size: CELL,
    age: 0,
    life: 12000,
    dead: false,
  });
}

export function spawnKeyItem(x, y) {
  const cc = cellOf(x, y);
  if (window.map[cc.r][cc.c] !== EMPTY) return;
  window.items.push({
    def: { id: "key", icon: "🔑", name: "钥匙", color: "#ffd700", max: 1 },
    x: cc.c * CELL,
    y: cc.r * CELL,
    size: CELL,
    age: 0,
    life: 30000,
    dead: false,
  });
  addFloat(x, y - 10, "钥匙已掉落！", "#ffd700");
}

export function unlockDogDoor() {
  if (!window.dogDoorLocked) return;
  window.dogDoorLocked = false;

  const cfg = window.levelConfig;
  if (!cfg?.dogCage?.cageDoor) return;

  const door = cfg.dogCage.cageDoor;
  if (window.map[door.r] && window.map[door.r][door.c] !== undefined) {
    window.map[door.r][door.c] = EMPTY;
  }

  addFloat(door.c * CELL + CELL / 2, door.r * CELL, "门已打开！", "#ffd700");
  sfx("pickup");
}

export function rescueDog() {
  if (window.dogRescued) return;
  if (window.dogDoorLocked) return;

  const cfg = window.levelConfig;
  if (!cfg?.dogCage?.dogPosition) return;

  const dogPos = cfg.dogCage.dogPosition;
  const dogX = dogPos.c * CELL + CELL / 2;
  const dogY = dogPos.r * CELL + CELL / 2;

  if (!window.player || !window.player.alive) return;
  const playerCx = window.player.x + window.player.w / 2;
  const playerCy = window.player.y + window.player.h / 2;
  const dist = Math.hypot(playerCx - dogX, playerCy - dogY);

  if (dist < CELL * 2) {
    window.dogRescued = true;
    addFloat(dogX, dogY - 20, "小狗已解救！", "#7de07d");
    sfx("pickup");
    spawnExplosion(dogX, dogY, 30, "#7de07d");
    if (checkLevelWin()) {
      showLevelComplete();
    }
  }
}

export function updateItems(dt) {
  window.itemSpawnTimer -= dt;
  if (window.itemSpawnTimer <= 0) {
    if (window.items.length < 4) spawnRandomItem();
    window.itemSpawnTimer = 3.5 + Math.random() * 3;
  }
  for (const it of window.items) {
    it.age += dt;
    if (it.age * 1000 > it.life) {
      it.dead = true;
      continue;
    }
    if (
      TankActions.rectHit(
        { x: window.player.x, y: window.player.y, w: window.player.w, h: window.player.h },
        it,
      )
    ) {
      pickupItem(it);
      it.dead = true;
    }
  }
  window.items = window.items.filter((it) => !it.dead);
}

export function pickupItem(it) {
  const id = it.def.id;
  const now = window.gtMs;
  sfx("pickup");
  addFloat(it.x + CELL / 2, it.y - 8, it.def.name + " UP", it.def.color);
  spawnExplosion(it.x + CELL / 2, it.y + CELL / 2, 20, it.def.color);
  switch (id) {
    case "key":
      unlockDogDoor();
      break;
    case "drone":
      if (window.player.drones < ITEMS[0].max) {
        window.player.drones++;
        window.drones.push({
          x: window.player.x,
          y: window.player.y - 20,
          w: 20,
          h: 20,
          hp: 3,
          fireCd: 0.5,
          age: 0,
        });
      }
      break;
    case "spread":
      window.player.spreadT = now + itemTimer("spread");
      break;
    case "fire":
      window.player.fireT = now + itemTimer("fire");
      break;
    case "speed":
      window.player.speedT = now + itemTimer("speed");
      break;
    case "shield":
      window.player.shieldT = now + itemTimer("shield");
      break;
    case "mine":
      window.player.mines += 3;
      break;
    case "heal":
      if (window.player.hp < window.player.maxHp) {
        window.player.hp++;
        sfx("pickup");
      }
      break;
    case "bounce":
      window.player.bounces = true;
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
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const r = cc.r + dr,
        c = cc.c + dc;
      if (window.map[r] && window.map[r][c] === CRACK) damageCrack(c, r, 2);
    }
  const x1 = (cc.c - 1) * CELL,
    y1 = (cc.r - 1) * CELL,
    x2 = (cc.c + 2) * CELL,
    y2 = (cc.r + 2) * CELL;
  for (const t of window.tanks) {
    if (!t.alive || t.isPlayer) continue;
    const tx = t.x + t.w / 2,
      ty = t.y + t.h / 2;
    if (tx >= x1 && tx < x2 && ty >= y1 && ty < y2) {
      t.hp -= 6;
      spawnExplosion(t.x + t.w / 2, t.y + t.h / 2, 20, "#ff8a5a");
      if (t.hp <= 0) killEnemy(t);
    }
  }
  if (window.boss && window.boss.alive) {
    const bx = window.boss.x + window.boss.w / 2,
      by = window.boss.y + window.boss.h / 2;
    if (bx >= x1 && bx < x2 && by >= y1 && by < y2) {
      window.boss.hp -= 6;
      window.boss.flash = 90;
      spawnExplosion(window.boss.x + window.boss.w / 2, window.boss.y + window.boss.h / 2, 40, "#ff8a5a");
      if (window.boss.hp <= 0) killBoss();
    }
  }
  updateHud();
}

export function updateMines(dt) {
  for (const m of window.mines) {
    m.age += dt;
    for (const t of window.tanks) {
      if (t.isPlayer || !t.alive) continue;
      if (TankActions.rectHit({ x: t.x, y: t.y, w: t.w, h: t.h }, m)) {
        explodeMine(m);
        break;
      }
    }
    if (!m.dead && window.boss && window.boss.alive) {
      if (TankActions.rectHit({ x: window.boss.x, y: window.boss.y, w: window.boss.w, h: window.boss.h }, m)) {
        explodeMine(m);
      }
    }
  }
  window.mines = window.mines.filter((m) => !m.dead);
}
