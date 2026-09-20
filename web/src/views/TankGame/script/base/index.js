// ====================== base/index.js ======================
// 重新导出所有拆分模块的内容，供外部统一引用

export {
  CELL, COLS, ROWS, W, H,
  initCanvas,
  playerImg, enemyImg, bossImg, dogImg,
  EMPTY, WALL, GATE, BORDER, CRACK, GRASS,
  SPEED, SPIKE, FALLING, DOOR, SWITCH, PORTAL, CRATE,
  DIRS, DIR_NAMES,
  PLAYER_SPAWN, ENEMY_SPAWNS,
  keys,
} from "./constants.js";

export {
  LEVEL_MODE_KEYS,
  setLevelMode, clearLevelMode, isLevelMode, getLevelConfig,
  getPlayerSpawnForLevel, getEnemySpawnsForLevel, getMaxEnemiesForLevel,
  checkLevelWin, checkFlagCapture, showLevelComplete, showLevelFailed, checkPortalReach,
} from "./level.js";

export {
  setSpawnTimer, setDamageFlash, setDeathReason,
} from "./state.js";

export {
  toggleSfx, playMp3, playBgm, stopBgm, sfx,
  getDeathSoundTimer, setDeathSoundTimer,
} from "./audio.js";

export {
  cellOf, centerOf, randInt, genMap,
  protectedKey, isProtectedCell,
  placeGrass, placeRandomWalls, connectivityOk,
  placeGates, gateAt, damageCrack,
  initDoorStates, toggleSwitch, isSpeedCell, isSpikeCell, isPortalCell, damageFallingStone,
} from "./map.js";

export {
  spawnExplosion, addFloat, makeTank,
  updateParticles, updateFloats,
} from "./effects.js";

export {
  spawnEnemy, spawnBoss, maxEnemies,
  killEnemy, checkSpawnBoss, killBoss,
} from "./enemies.js";

export {
  ITEMS, itemTimer, pickItemDef,
  spawnItemAtTank, spawnItemAtCell, spawnRandomItem,
  spawnItemAtPosition, spawnKeyItem,
  unlockDogDoor, rescueDog,
  updateItems, pickupItem,
  explodeMine, updateMines,
} from "./items.js";
export {
  drawMap, drawGrassCell, drawGrassOverlay,
  drawTank, drawBoss, drawDogCage, drawPlayer,
  drawBullets, drawItems, drawMines, drawDrones,
  drawParticles, drawFloats, drawFallingStones, drawDebris, drawCrates,
} from "./render.js";

export {
  loadHighScore, updateHud,
} from "./hud.js";

export {
  stopGameLoop, loop, startRaf,
} from "./loop.js";

export {
  resetGame, update, gameOver,
  startGame, togglePause,
} from "./game-flow.js";

export { initGame } from "./init.js";
