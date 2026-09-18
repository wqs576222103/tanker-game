// ====================== 全局状态 ======================

window.state = "start";
window.kills = 0;
window.bossKills = 0;
window.hiScore = +(localStorage.getItem("tank-hi") || 0);
window.hiBossKills = 0;
window.gtMs = 0;
window.spawnTimer = 2;
window.mapGenerated = false;
window.gameSpeed = 1;

// 关卡模式全局状态
window.levelMode = false;
window.levelConfig = null;
window.levelObjective = null;
window.levelKillsRequired = 0;
window.levelEnemiesDefeated = 0;
window.levelLastBossKills = 0;
window.flagCaptured = false;
window.flagCarrier = null;
window.flagPosition = null;
window.levelCompleted = false;

// 解救橘猫关卡状态
window.dogRescued = false;
window.dogDoorLocked = true;
window.bossKeyDropped = false;

window.map = [];
window.gates = [];
window.crackHp = {};
window.player = null;
window.tanks = [];
window.bullets = [];
window.items = [];
window.mines = [];
window.drones = [];
window.particles = [];
window.floats = [];
window.lastTeleport = {};
window.boss = null;
window.baseEnemyHp = 2;
window.lastBossKills = 0;

window.shootQueued = false;

window.damageFlash = 0;
window.itemSpawnTimer = 3;
window.deathReason = "";
window.tutorialMode = false;
window.tutorialHooks = { update: null, render: null };
window.tutorialGateBlock = false;
window.tutorialSpawnEnemies = false;

// 导出 getter/setter，让其他模块可以读写 window 上的状态
export const getState = () => window;

export const setSpawnTimer = (v) => (window.spawnTimer = v);
export const setDamageFlash = (v) => (window.damageFlash = v);
export const setDeathReason = (v) => (window.deathReason = v);
