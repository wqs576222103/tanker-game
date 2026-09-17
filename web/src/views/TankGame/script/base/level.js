import { PLAYER_SPAWN, ENEMY_SPAWNS, COLS, ROWS } from "./constants.js";

// ====================== 关卡模式支持 ======================
export const LEVEL_MODE_KEYS = {
  mode: "tank-level-mode",
  config: "tank-level-config",
  progress: "tank-level-progress",
};

export function setLevelMode(levelConfig) {
  window.levelMode = true;
  window.levelConfig = levelConfig;
  window.levelObjective = levelConfig.objective.type;
  window.levelKillsRequired = levelConfig.objective.target || 10;
  window.levelEnemiesDefeated = 0;
  window.flagCaptured = false;
  window.flagCarrier = null;
  if (levelConfig.flag) {
    window.flagPosition = {
      x: levelConfig.flag.x,
      y: levelConfig.flag.y,
      team: levelConfig.flag.team,
    };
  }
  if (levelConfig.objective.type === "rescueDog") {
    window.dogRescued = false;
    window.dogDoorLocked = true;
    window.bossKeyDropped = false;
  }
  try {
    localStorage.setItem(LEVEL_MODE_KEYS.config, JSON.stringify(levelConfig));
  } catch (e) {
    console.warn("保存关卡配置失败:", e);
  }
}

export function clearLevelMode() {
  window.levelMode = false;
  window.levelConfig = null;
  window.levelObjective = null;
  window.levelKillsRequired = 0;
  window.levelEnemiesDefeated = 0;
  window.flagCaptured = false;
  window.flagCarrier = null;
  window.flagPosition = null;
  window.dogRescued = false;
  window.dogDoorLocked = true;
  window.bossKeyDropped = false;
  window.mapGenerated = false;
}

export function isLevelMode() {
  return window.levelMode === true;
}

export function getLevelConfig() {
  return window.levelConfig;
}

export function getPlayerSpawnForLevel() {
  if (window.levelConfig?.playerSpawn) {
    return window.levelConfig.playerSpawn;
  }
  return PLAYER_SPAWN;
}

export function getEnemySpawnsForLevel() {
  if (window.levelConfig?.enemySpawns) {
    return window.levelConfig.enemySpawns;
  }
  return ENEMY_SPAWNS;
}

export function getMaxEnemiesForLevel() {
  if (window.levelConfig?.maxEnemies) {
    return window.levelConfig.maxEnemies;
  }
  return 8;
}

export function checkLevelWin() {
  if (!window.levelMode || !window.levelConfig) return false;

  const { objective } = window.levelConfig;

  switch (objective.type) {
    case "killCount":
      return window.kills >= objective.target;
    case "captureFlag":
      return window.flagCaptured;
    case "surviveTime":
      return window.gtMs >= (objective.duration || 60) * 1000;
    case "killBoss":
      return window.bossKills > (window.levelLastBossKills || 0);
    case "rescueDog":
      return window.dogRescued;
    default:
      return false;
  }
}

export function checkFlagCapture() {
  if (!window.levelMode || !window.levelConfig || window.flagCaptured) return;
  if (window.levelConfig.objective.type !== "captureFlag") return;
  if (!window.flagPosition || !window.player || !window.player.alive) return;
  if (window.kills < (window.levelConfig.objective.target || 5)) return;

  const flagCell = cellOf(window.flagPosition.x, window.flagPosition.y);
  const playerCell = cellOf(
    window.player.x + window.player.w / 2,
    window.player.y + window.player.h / 2,
  );

  if (flagCell.c === playerCell.c && flagCell.r === playerCell.r) {
    window.flagCaptured = true;
    showLevelComplete();
  }
}

export function showLevelComplete() {
  window.levelCompleted = true;
  const event = new CustomEvent("levelComplete", {
    detail: {
      levelId: window.levelConfig?.id,
      time: window.gtMs,
      kills: window.kills,
      bossKills: window.bossKills,
    },
  });
  window.dispatchEvent(event);
}

export function showLevelFailed(reason) {
  const event = new CustomEvent("levelFailed", {
    detail: { reason },
  });
  window.dispatchEvent(event);
}

// 辅助：cellOf（level.js 内部使用）
function cellOf(x, y) {
  const CELL = 20;
  return { c: Math.floor(x / CELL), r: Math.floor(y / CELL) };
}
