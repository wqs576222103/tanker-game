import {
  CELL,
  COLS,
  ROWS,
  W,
  H,
  EMPTY,
  WALL,
  GATE,
  BORDER,
  CRACK,
  DIRS,
  ENEMY_SPAWNS,
} from "./constants.js";
import { cellOf, centerOf, randInt, protectedKey } from "./map.js";
import { sfx } from "./audio.js";
import { spawnExplosion, addFloat, makeTank } from "./effects.js";
import { updateHud } from "./hud.js";
import { checkLevelWin, showLevelComplete } from "./level.js";
import { spawnItemAtTank, spawnItemAtPosition, spawnKeyItem } from "./items.js";
import { TankActions } from "../tank-actions.js";

// ====================== 敌人 & Boss ======================

function isPassableCell(c, r) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  const t = window.map[r][c];
  return t !== WALL && t !== BORDER && t !== CRACK && t !== GATE;
}

function findNearestPassable(c, r) {
  if (isPassableCell(c, r)) return { c, r };
  for (let dist = 1; dist <= 10; dist++) {
    for (let dr = -dist; dr <= dist; dr++) {
      for (let dc = -dist; dc <= dist; dc++) {
        if (Math.abs(dr) !== dist && Math.abs(dc) !== dist) continue;
        if (isPassableCell(c + dc, r + dr)) return { c: c + dc, r: r + dr };
      }
    }
  }
  return { c, r };
}
export function spawnEnemy(instant) {
  if (window.levelMode && window.levelConfig?.noRespawn) {
    const aliveEnemies = window.tanks.filter(
      (t) => t.alive && !t.isPlayer,
    ).length;
    const totalSpawned = (window.levelConfig.enemySpawns || []).length;
    if (aliveEnemies >= totalSpawned) return;
  }
  if (window.tanks.filter((t) => t.alive && !t.isPlayer).length >= maxEnemies())
    return;

  const enemySpawns =
    window.tutorialEnemySpawns && window.tutorialMode
      ? window.tutorialEnemySpawns
      : window.customEnemySpawns
        ? window.customEnemySpawns
        : window.levelMode && window.levelConfig?.enemySpawns
          ? window.levelConfig.enemySpawns
          : ENEMY_SPAWNS;

  // 过滤掉不安全或不可通行的出生点
  const safeSpawns = enemySpawns
    .map((s) => findNearestPassable(s.c, s.r))
    .filter((s) => {
      if (!window.player || !window.player.alive) return true;
      const spCx = s.c * CELL + CELL / 2;
      const spCy = s.r * CELL + CELL / 2;
      const pCx = window.player.x + window.player.w / 2;
      const pCy = window.player.y + window.player.h / 2;
      return Math.abs(spCx - pCx) > 60 || Math.abs(spCy - pCy) > 60;
    });
  if (safeSpawns.length === 0) return;

  const free = safeSpawns.filter((s) => {
    const sx = s.c * CELL + 2;
    const sy = s.r * CELL + 2;
    return !window.tanks.some(
      (t) => t.alive && Math.abs(t.x - sx) < CELL && Math.abs(t.y - sy) < CELL,
    );
  });
  if (free.length === 0) return;

  let sp = free[0];
  let least = Infinity;
  for (const s of free) {
    const cnt = window.tanks.filter(
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
  if (window.levelMode && window.levelConfig?.enemySpeed) {
    t.speed = window.levelConfig.enemySpeed;
  }
  const diff = 1 + Math.floor(window.gtMs / 45000);
  t.speed =
    window.levelMode && window.levelConfig?.enemySpeed
      ? window.levelConfig.enemySpeed
      : Math.min(55 + diff * 10, 88);
  t.hp = window.baseEnemyHp;
  t.maxHp = window.baseEnemyHp;
  t.invincible = window.tutorialMode ? 0 : instant ? 300 : 800;
  window.tanks.push(t);
  sfx("enemy");
}

export function spawnBoss() {
  let c = Math.floor(COLS / 2) - 1;
  let r = Math.floor(ROWS / 2) - 1;

  if (TankActions.blocked(c * CELL, r * CELL, CELL * 2, CELL * 2, null)) {
    // 收集所有不被阻挡的 2x2 空地位置，优先选离中心近的
    const candidates = [];
    for (let rr = 1; rr <= ROWS - 4; rr++) {
      for (let cc = 1; cc <= COLS - 4; cc++) {
        if (
          !TankActions.blocked(cc * CELL, rr * CELL, CELL * 2, CELL * 2, null)
        ) {
          const dist =
            Math.abs(cc - Math.floor(COLS / 2)) +
            Math.abs(rr - Math.floor(ROWS / 2));
          candidates.push({ c: cc, r: rr, dist });
        }
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.dist - b.dist);
      c = candidates[0].c;
      r = candidates[0].r;
    }
  }

  window.boss = {
    id: Math.random().toString(36).slice(2),
    x: c * CELL,
    y: r * CELL,
    w: CELL * 2,
    h: CELL * 2,
    dirName: "down",
    dir: { ...DIRS.down },
    hp: window.kills,
    maxHp: window.kills,
    speed: 40,
    alive: true,
    invincible: 1000,
    spreadCd: 3,
    rotateCd: 6,
    moveTimer: 0,
  };

  sfx("boom");
  addFloat(
    window.boss.x + window.boss.w / 2,
    window.boss.y + window.boss.h / 2,
    "关卡BOSS出现！",
    "#ee5253",
  );
}

export function maxEnemies() {
  if (window.levelMode && window.levelConfig?.maxEnemies) {
    return window.levelConfig.maxEnemies;
  }
  return Math.min(8, 2 + Math.floor(Math.max(0, window.kills - 5) / 10));
}

export function killEnemy(t) {
  t.alive = false;
  spawnExplosion(t.x + t.w / 2, t.y + t.h / 2, 34, "#ff8a5a");
  window.kills += 1;
  window.levelEnemiesDefeated = (window.levelEnemiesDefeated || 0) + 1;
  sfx("enemyDeath");
  if (Math.random() < 0.28) spawnItemAtTank(t);
  updateHud();

  if (
    window.levelMode &&
    window.levelConfig?.flagWallCells &&
    window.kills >= (window.levelConfig.objective.target || 5)
  ) {
    for (const cell of window.levelConfig.flagWallCells) {
      if (window.map[cell.r] && window.map[cell.r][cell.c] === WALL) {
        window.map[cell.r][cell.c] = EMPTY;
      }
    }
    addFloat(
      window.flagPosition ? window.flagPosition.x + CELL / 2 : W / 2,
      window.flagPosition ? window.flagPosition.y : H / 2,
      "旗帜区域已开放！",
      "#ffd76e",
    );
  }

  checkSpawnBoss();

  if (window.levelMode && checkLevelWin()) {
    showLevelComplete();
  }
}

export function checkSpawnBoss() {
  if (window.boss && window.boss.alive) return;

  if (window.levelMode && window.levelConfig?.objective.type === "rescueDog") {
    const threshold = window.levelConfig.bossThreshold || 10;
    if (window.kills >= threshold && !window.boss) {
      spawnBoss();
    }
    return;
  }

  if (window.levelMode) return;

  const next = window.lastBossKills === 0 ? 10 : window.lastBossKills * 2;
  if (window.kills >= next) {
    window.lastBossKills = next;
    spawnBoss();
  }
}

export function killBoss() {
  if (!window.boss || !window.boss.alive) return;
  window.boss.alive = false;
  spawnExplosion(
    window.boss.x + window.boss.w / 2,
    window.boss.y + window.boss.h / 2,
    60,
    "#ee5253",
  );
  window.kills += 25;
  window.bossKills += 1;
  window.baseEnemyHp += 1;
  sfx("boom");
  addFloat(
    window.boss.x + window.boss.w / 2,
    window.boss.y + window.boss.h / 2,
    "BOSS已击败！",
    "#ee5253",
  );
  window.lastBossKills = Math.max(window.lastBossKills, window.kills);

  if (
    window.levelMode &&
    window.levelConfig?.objective.type === "rescueDog" &&
    !window.bossKeyDropped
  ) {
    window.bossKeyDropped = true;
    setTimeout(() => {
      spawnKeyItem(
        window.boss.x + window.boss.w / 2,
        window.boss.y + window.boss.h / 2,
      );
    }, 500);
  } else {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        spawnItemAtPosition(
          window.boss.x + window.boss.w / 2,
          window.boss.y + window.boss.h / 2,
        );
      }, i * 500);
    }
  }
  updateHud();
}
