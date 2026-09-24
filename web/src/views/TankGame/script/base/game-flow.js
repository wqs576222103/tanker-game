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
  SPEED,
  SPIKE,
  DOOR,
  SWITCH,
  PORTAL,
  PLAYER_SPAWN,
} from "./constants.js";
import {
  genMap,
  centerOf,
  protectedKey,
  randInt,
  initDoorStates,
  toggleSwitch,
  isSpeedCell,
  isSpikeCell,
  isPortalCell,
} from "./map.js";
import {
  sfx,
  stopBgm,
  playBgm,
  getDeathSoundTimer,
  setDeathSoundTimer,
} from "./audio.js";
import { spawnExplosion, addFloat, makeTank } from "./effects.js";
import {
  spawnEnemy,
  spawnBoss,
  checkSpawnBoss,
  maxEnemies,
} from "./enemies.js";
import {
  spawnItemAtTank,
  spawnRandomItem,
  spawnItemAtCell,
  updateItems,
  updateMines,
  rescueDog,
  ITEMS,
} from "./items.js";
import { updateParticles, updateFloats } from "./effects.js";
import { updateHud, loadHighScore } from "./hud.js";
import { AIPlayer } from "../ai-player.js";
import { AILogger } from "../ai-logger.js";
import { TankActions } from "../tank-actions.js";
import { saveGameKills, addDeath } from "@/api/score.js";
import { getUserInfo } from "@/utils/user";
import {
  checkLevelWin,
  showLevelComplete,
  checkFlagCapture,
  checkPortalReach,
} from "./level.js";

// ====================== 游戏流程 ======================

// 判断格子是否可通行（坦克能站上去）
function isPassableCell(c, r) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  const t = window.map[r][c];
  return t !== WALL && t !== BORDER && t !== CRACK && t !== GATE;
}

// 从指定格子开始向外搜索，找到最近的可通行格子
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
  return { c, r }; // fallback
}

export function resetGame() {
  window.state = "start";
  window.gtMs = 0;
  window.kills = 0;
  window.bossKills = 0;
  window.spawnTimer = 3;
  window.boss = null;
  window.lastBossKills = 0;
  window.baseEnemyHp = window.levelConfig?.baseEnemyHp || 2;
  window.levelLastBossKills = 0;

  if (window.levelMode && window.levelConfig?.objective.type === "rescueDog") {
    window.dogRescued = false;
    window.dogDoorLocked = true;
    window.bossKeyDropped = false;
  }

  if (window.levelMode && window.levelConfig) {
    window.levelObjective = window.levelConfig.objective.type;
    window.levelKillsRequired = window.levelConfig.objective.target || 10;
    window.levelEnemiesDefeated = 0;
    window.flagCaptured = false;
    window.flagCarrier = null;
    window.flagPosition = null;
    if (window.levelConfig.flag) {
      window.flagPosition = {
        x: window.levelConfig.flag.x,
        y: window.levelConfig.flag.y,
        team: window.levelConfig.flag.team,
      };
    }
  }

  if (window.customMapConfig) {
    const cfg = window.customMapConfig;
    window.map = cfg.map.map((row) => [...row]);
    window.crackHp = cfg.crackHp ? { ...cfg.crackHp } : {};

    // 为未指定 HP 的碎石墙生成默认值
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (window.map[r][c] === CRACK && !window.crackHp[protectedKey(c, r)]) {
          window.crackHp[protectedKey(c, r)] = 2 + randInt(0, 1);
        }
      }

    // 构建传送门
    window.gates = [];
    if (cfg.gates && cfg.gates.length > 0) {
      const gateColors = ["#58a6ff", "#c084fc", "#fb923c"];
      // 先为每条 gate 定义自动展开 partnerCells 为独立传送门
      const expandedGates = [];
      for (const gDef of cfg.gates) {
        const cells = gDef.cells || [];
        const partnerCells = gDef.partnerCells || [];
        if (cells.length > 0) {
          expandedGates.push({
            cells,
            pair: gDef.pair || null,
            color: gDef.color || null,
          });
        }
        // 如果有 partnerCells 但没有对应的另一条 gate 定义，则自动补建
        if (partnerCells.length > 0) {
          const hasPartner = cfg.gates.some(
            (other) =>
              other !== gDef &&
              other.pair === gDef.pair &&
              other.cells.length === partnerCells.length &&
              partnerCells.every((pc) =>
                other.cells.some((oc) => oc.c === pc.c && oc.r === pc.r),
              ),
          );
          if (!hasPartner) {
            expandedGates.push({
              cells: partnerCells,
              pair: gDef.pair || null,
              color: gDef.color || null,
            });
          }
        }
      }

      // 创建所有门对象
      for (const gDef of expandedGates) {
        const g = {
          cells: gDef.cells || [],
          partner: null,
          pairId: null,
          pair: gDef.pair || null,
          color: gDef.color || null,
        };
        for (const cell of g.cells) {
          if (window.map[cell.r]) window.map[cell.r][cell.c] = GATE;
        }
        window.gates.push(g);
      }

      // 优先通过 pair 字段配对（相同 pair 名称的门互相传送）
      const pairMap = {};
      for (let i = 0; i < window.gates.length; i++) {
        const g = window.gates[i];
        if (!g.pair) continue;
        if (pairMap[g.pair]) {
          pairMap[g.pair].partner = g;
          g.partner = pairMap[g.pair];
          pairMap[g.pair].pairId = i;
          g.pairId = i;
          if (!g.color && pairMap[g.pair].color) g.color = pairMap[g.pair].color;
          if (!pairMap[g.pair].color && g.color) pairMap[g.pair].color = g.color;
        } else {
          pairMap[g.pair] = g;
        }
      }

      // 未指定颜色的按顺序分配不同颜色
      let colorIdx = 0;
      const seenPairs = new Set();
      for (const g of window.gates) {
        const key = g.pair || `__${g.pairId ?? Math.random()}`;
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        if (!g.color) {
          g.color = gateColors[colorIdx % gateColors.length];
          if (g.partner && !g.partner.color) g.partner.color = g.color;
        }
        colorIdx++;
      }
    }

    // 预置道具
    if (cfg.items) {
      for (const it of cfg.items) {
        spawnItemAtCell(it.c, it.r, it.type);
      }
    }

    window.mapGenerated = true;
    window.customEnemySpawns = cfg.enemySpawns || null;
  } else if (window.levelMode && window.levelConfig?.map) {
    window.map = window.levelConfig.map.map((row) => [...row]);
    window.gates = [];
    window.crackHp = window.levelConfig.crackHp || {};
    window.mapGenerated = true;

    if (window.levelConfig.special === "maze") {
      initDoorStates();
      if (window.levelConfig.switchLinks) {
        window.switchLinks = window.levelConfig.switchLinks;
      }
      window.fallingStones = [];
      window.debris = [];
      window.reachedPortal = false;
    }
  } else if (!window.mapGenerated) {
    genMap();
    window.mapGenerated = true;
  } else {
    window.crackHp = {};
    for (let r = 1; r < ROWS - 1; r++)
      for (let c = 1; c < COLS - 1; c++) {
        if (window.map[r][c] === CRACK)
          window.crackHp[protectedKey(c, r)] = 2 + randInt(0, 1);
      }
  }

  window.tanks = [];
  window.bullets = [];
  window.items = [];
  window.mines = [];
  window.drones = [];
  window.crates = [];
  window.particles = [];
  window.floats = [];
  window.lastTeleport = {};
  window.fallingStones = [];
  window.debris = [];
  window.reachedPortal = false;

  const spawnPoint = window.customMapConfig?.playerSpawn
    ? window.customMapConfig.playerSpawn
    : window.levelMode && window.levelConfig?.playerSpawn
      ? window.levelConfig.playerSpawn
      : PLAYER_SPAWN;
  const safeSpawn = findNearestPassable(spawnPoint.c, spawnPoint.r);
  const sp = centerOf(safeSpawn.c, safeSpawn.r);
  window.player = makeTank(
    sp.x - (CELL - 4) / 2,
    sp.y - (CELL - 4) / 2,
    "up",
    true,
  );
  if (window.levelMode && window.levelConfig?.playerSpeed) {
    window.player.speed = window.levelConfig.playerSpeed;
  }
  window.player.invincible = 2000;
  window.tanks.push(window.player);

  if (window.levelMode && window.levelConfig?.crates) {
    for (const cratePos of window.levelConfig.crates) {
      const cp = centerOf(cratePos.c, cratePos.r);
      window.crates.push({
        x: cratePos.c * CELL,
        y: cratePos.r * CELL,
      });
    }
  }

  if (!window.tutorialMode) {
    const initCount =
      window.customMapConfig?.initialEnemies ||
      (window.levelMode && window.levelConfig?.initialEnemies) ||
      2;
    for (let i = 0; i < initCount; i++) {
      spawnEnemy(true);
    }
  }
  updateHud();
}

export function update(dt) {
  window.gtMs += dt * 1000;

  AIPlayer.update(dt);

  TankActions.updatePlayer(dt);
  TankActions.updateBullets(dt);
  if (!window.tutorialMode) {
    TankActions.updateEnemies(dt);
  }
  updateMines(dt);
  updateItems(dt);
  updateParticles(dt);
  updateFloats(dt);

  checkFlagCapture();

  if (window.levelMode && window.levelConfig?.objective.type === "rescueDog") {
    rescueDog();
  }

  if (
    window.levelMode &&
    window.levelConfig?.objective.type === "reachPortal"
  ) {
    checkPortalReach();
  }

  if (window.levelMode && window.levelConfig?.special === "maze") {
    updateMazeMechanics(dt);
  }

  updateSpikeDamage();
  updateFallingStones(dt);
  updateDebris(dt);

  if (window.boss && window.boss.alive) {
    TankActions.moveBoss(dt);
    TankActions.bossFire(dt);
  } else {
    checkSpawnBoss();
  }

  if (window.tutorialMode && window.tutorialHooks?.update) {
    window.tutorialHooks.update(dt);
  }

  if (window.tutorialMode && window.tutorialSpawnEnemies) {
    window.tutorialSpawnEnemies = false;
    spawnEnemy(true);
    spawnEnemy(true);
    window.tutorialEnemyReady = true;
  }
}

function updateMazeMechanics(dt) {
  if (!window.player || !window.player.alive) return;

  const playerCell = {
    c: Math.floor((window.player.x + window.player.w / 2) / CELL),
    r: Math.floor((window.player.y + window.player.h / 2) / CELL),
  };

  if (isSpeedCell(playerCell.c, playerCell.r)) {
    window.player.speed = (window.levelConfig?.playerSpeed || 100) * 1.5;
  } else if (!isSpikeCell(playerCell.c, playerCell.r)) {
    window.player.speed = window.levelConfig?.playerSpeed || 100;
  }

  if (isPortalCell(playerCell.c, playerCell.r)) {
    window.reachedPortal = true;
  }
}

function updateSpikeDamage() {
  if (!window.player || !window.player.alive) return;

  const playerCell = {
    c: Math.floor((window.player.x + window.player.w / 2) / CELL),
    r: Math.floor((window.player.y + window.player.h / 2) / CELL),
  };

  if (isSpikeCell(playerCell.c, playerCell.r)) {
    const phase =
      (window.gtMs + playerCell.c * 500 + playerCell.r * 300) % 3000;
    const riseT =
      phase < 1500
        ? Math.min(phase / 400, 1)
        : Math.max(1 - (phase - 1500) / 400, 0);
    if (riseT > 0.5 && window.gtMs % 500 < 20) {
      window.player.hp -= 1;
      window.player.flash = 300;
      window.damageFlash = 350;
      if (window.player.hp <= 0) {
        window.player.alive = false;
        window.deathReason = "踩到尖刺";
        gameOver();
        return;
      }
    }
  }
}

const STONE_INTERVAL = 5;
const STONE_WARNING = 1.5;
const STONE_SPEED = 250;
const STONE_RADIUS = CELL * 1.5;

function updateFallingStones(dt) {
  if (!window.fallingStones) window.fallingStones = [];
  if (!window.debris) window.debris = [];
  if (!window.stoneTimer) window.stoneTimer = 0;

  window.stoneTimer += dt;
  if (window.stoneTimer >= STONE_INTERVAL) {
    window.stoneTimer -= STONE_INTERVAL;
    spawnFallingStone();
  }

  for (let i = window.fallingStones.length - 1; i >= 0; i--) {
    const stone = window.fallingStones[i];

    if (stone.phase === "warning") {
      stone.warnTimer += dt;
      if (stone.warnTimer >= STONE_WARNING) {
        stone.phase = "falling";
      }
      continue;
    }

    stone.y += stone.speed * dt;

    if (stone.y >= stone.groundY) {
      stone.y = stone.groundY;
      spawnExplosion(stone.x, stone.y, 20, "#8B4513");
      sfx("boom");

      for (const t of window.tanks) {
        if (!t.alive) continue;
        const tx = t.x + t.w / 2;
        const ty = t.y + t.h / 2;
        const dist = Math.sqrt((stone.x - tx) ** 2 + (stone.y - ty) ** 2);
        if (dist < STONE_RADIUS) {
          t.hp -= 2;
          if (t.hp <= 0) {
            t.alive = false;
            if (t.isPlayer) {
              window.deathReason = "被落石砸中";
              gameOver();
            } else {
              window.kills += 1;
              spawnExplosion(tx, ty, 30, "#ff8a5a");
            }
          }
        }
      }
      window.debris.push({
        x: stone.x,
        y: stone.groundY,
        life: 2,
        maxLife: 2,
      });
      window.fallingStones.splice(i, 1);
    }
  }
}

function spawnFallingStone() {
  const cfg = window.levelConfig || window.customMapConfig;
  const positions = cfg && cfg.fallingStones;

  if (positions && positions.length > 0) {
    // 使用配置的位置，循环生成
    if (!window.stoneIndex) window.stoneIndex = 0;
    const pos = positions[window.stoneIndex % positions.length];
    window.stoneIndex++;

    // 验证位置是否有效（不是墙壁/边界/碎石墙）
    const c = pos.c,
      r = pos.r;
    if (c < 1 || c >= COLS - 1 || r < 1 || r >= ROWS - 1) return;
    const v = window.map[r] && window.map[r][c];
    if (v === undefined || v === WALL || v === BORDER || v === CRACK) return;

    window.fallingStones.push({
      x: c * CELL + CELL / 2,
      y: r * CELL - CELL * 3,
      groundY: r * CELL + CELL / 2,
      speed: STONE_SPEED,
      phase: "warning",
      warnTimer: 0,
    });
  } else {
    // 未配置位置时，随机生成
    const col = 1 + Math.floor(Math.random() * (COLS - 2));
    const openRows = [];
    for (let r = 1; r < ROWS - 1; r++) {
      const v = window.map[r] && window.map[r][col];
      if (v !== undefined && v !== WALL && v !== BORDER && v !== CRACK) {
        openRows.push(r);
      }
    }
    if (!openRows.length) return;
    const groundR = openRows[Math.floor(Math.random() * openRows.length)];
    window.fallingStones.push({
      x: col * CELL + CELL / 2,
      y: groundR * CELL - CELL * 3,
      groundY: groundR * CELL + CELL / 2,
      speed: STONE_SPEED,
      phase: "warning",
      warnTimer: 0,
    });
  }
}

function updateDebris(dt) {
  if (!window.debris) return;
  for (let i = window.debris.length - 1; i >= 0; i--) {
    window.debris[i].life -= dt;
    if (window.debris[i].life <= 0) {
      window.debris.splice(i, 1);
    }
  }
}

export function gameOver() {
  window.state = "over";
  window.player.alive = false;
  spawnExplosion(
    window.player.x + window.player.w / 2,
    window.player.y + window.player.h / 2,
    40,
    "#ff4a3a",
  );
  sfx("over");
  setDeathSoundTimer(
    setTimeout(() => {
      setDeathSoundTimer(null);
      playBgm();
    }, 3000),
  );
  if (window.kills > window.hiScore) {
    window.hiScore = window.kills;
    localStorage.setItem("tank-hi", String(window.hiScore));
  }
  if (window.bossKills > window.hiBossKills) {
    window.hiBossKills = window.bossKills;
  }

  if (window.levelMode) {
    const reason = window.deathReason || "不明原因";
    const event = new CustomEvent("levelFailed", {
      detail: { reason },
    });
    window.dispatchEvent(event);
    return;
  }

  document.getElementById("ov-over-score").textContent =
    "击杀：" + window.kills + "　Boss击杀：" + window.bossKills;
  document.getElementById("ov-over-reason").textContent =
    "淘汰原因：" + (window.deathReason || "不明原因");

  const logCount = AILogger.getRecordCount();
  const logBtn = document.getElementById("btn-ai-log");
  if (logBtn) {
    logBtn.textContent = `淘汰日志 (${logCount})`;
    logBtn.style.display = "inline-block";
  }

  AIPlayer.notifyDeath(window.deathReason);

  document.getElementById("ov-over").classList.remove("hidden");

  try {
    const userInfo = getUserInfo();
    if (userInfo.employeeId) {
      saveGameKills(userInfo.employeeId, window.kills, window.bossKills).catch(
        (err) => {
          console.warn("[Game] 保存击杀数据失败:", err);
        },
      );
      addDeath(userInfo.employeeId).catch((err) => {
        console.warn("[Game] 保存淘汰数失败:", err);
      });
    }
  } catch (e) {
    console.warn("[Game] 保存游戏数据异常:", e);
  }
}

export function startGame() {
  window.levelCompleted = false;
  resetGame();
  AIPlayer.init();
  window.state = "playing";
  stopBgm();
  if (getDeathSoundTimer()) {
    clearTimeout(getDeathSoundTimer());
    setDeathSoundTimer(null);
  }
  document.getElementById("ov-start").classList.add("hidden");
  document.getElementById("ov-over").classList.add("hidden");
  document.getElementById("ov-pause").classList.add("hidden");
  document.getElementById("ov-level-complete")?.classList.add("hidden");
  document.getElementById("ov-level-failed")?.classList.add("hidden");
}

export function togglePause() {
  if (window.state === "playing") {
    window.state = "paused";
    document.getElementById("ov-pause").classList.remove("hidden");
  } else if (window.state === "paused") {
    window.state = "playing";
    document.getElementById("ov-pause").classList.add("hidden");
    window.lastTime = performance.now();
  }
}
