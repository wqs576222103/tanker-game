import { CELL, COLS, ROWS, W, H, EMPTY, WALL, CRACK, SPEED, SPIKE, FALLING, DOOR, SWITCH, PORTAL, PLAYER_SPAWN } from "./constants.js";
import { genMap, centerOf, protectedKey, randInt, initDoorStates, toggleSwitch, isSpeedCell, isSpikeCell, isPortalCell, damageFallingStone } from "./map.js";
import { sfx, stopBgm, playBgm, getDeathSoundTimer, setDeathSoundTimer } from "./audio.js";
import { spawnExplosion, addFloat, makeTank } from "./effects.js";
import { spawnEnemy, spawnBoss, checkSpawnBoss, maxEnemies } from "./enemies.js";
import { spawnItemAtTank, spawnRandomItem, updateItems, updateMines, rescueDog, ITEMS } from "./items.js";
import { updateParticles, updateFloats } from "./effects.js";
import { updateHud, loadHighScore } from "./hud.js";
import { AIPlayer } from "../ai-player.js";
import { AILogger } from "../ai-logger.js";
import { TankActions } from "../tank-actions.js";
import { saveGameKills, addDeath } from "@/api/score.js";
import { getUserInfo } from "@/utils/user";
import { checkLevelWin, showLevelComplete, checkFlagCapture, checkPortalReach } from "./level.js";

// ====================== 游戏流程 ======================
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

  if (window.levelMode && window.levelConfig?.map) {
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

  const spawnPoint =
    window.levelMode && window.levelConfig?.playerSpawn
      ? window.levelConfig.playerSpawn
      : PLAYER_SPAWN;
  const sp = centerOf(spawnPoint.c, spawnPoint.r);
  window.player = makeTank(sp.x - (CELL - 4) / 2, sp.y - (CELL - 4) / 2, "up", true);
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
    if (window.levelMode && window.levelConfig?.initialEnemies) {
      for (let i = 0; i < window.levelConfig.initialEnemies; i++) {
        spawnEnemy(true);
      }
    } else {
      spawnEnemy(true);
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

  if (window.levelMode && window.levelConfig?.objective.type === "reachPortal") {
    checkPortalReach();
  }

  if (window.levelMode && window.levelConfig?.special === "maze") {
    updateMazeMechanics(dt);
  }

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
    r: Math.floor((window.player.y + window.player.h / 2) / CELL)
  };
  
  if (isSpeedCell(playerCell.c, playerCell.r)) {
    window.player.speed = (window.levelConfig?.playerSpeed || 100) * 1.5;
  } else if (isSpikeCell(playerCell.c, playerCell.r)) {
    if (window.gtMs % 500 < 20) {
      window.player.hp -= 1;
      if (window.player.hp <= 0) {
        window.player.alive = false;
        window.deathReason = "踩到尖刺";
        gameOver();
        return;
      }
    }
  } else {
    window.player.speed = window.levelConfig?.playerSpeed || 100;
  }
  
  if (isPortalCell(playerCell.c, playerCell.r)) {
    window.reachedPortal = true;
  }
  
  updateFallingStones(dt);
  updateDebris(dt);
}

const STONE_INTERVAL = 5;
const STONE_WARNING = 1.5;
const STONE_SPEED = 250;
const STONE_RADIUS = CELL * 1.5;

function updateFallingStones(dt) {
  if (!window.fallingStones) window.fallingStones = [];
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
  const col = 3 + Math.floor(Math.random() * (COLS - 6));
  let groundR = ROWS - 2;
  for (let r = 1; r < ROWS - 1; r++) {
    if (window.map[r] && (window.map[r][col] === 1 || window.map[r][col] === 3)) {
      groundR = r - 1;
      break;
    }
  }
  window.fallingStones.push({
    x: col * CELL + CELL / 2,
    y: groundR * CELL - CELL * 3,
    groundY: groundR * CELL + CELL / 2,
    speed: STONE_SPEED,
    phase: "warning",
    warnTimer: 0,
  });
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
    "死因：" + (window.deathReason || "不明原因");

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
      saveGameKills(userInfo.employeeId, window.kills, window.bossKills).catch((err) => {
        console.warn("[Game] 保存击杀数据失败:", err);
      });
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
