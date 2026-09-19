export const LEVELS = [
  {
    id: 1,
    name: "夺旗精英",
    description: "消灭敌军，夺取敌方旗帜！",
    objective: {
      type: "captureFlag",
      target: 5,
      description: "击杀5名敌人后夺取旗帜",
    },
  },
  {
    id: 2,
    name: "解救橘猫",
    description: "击杀10个敌人后Boss出现，击败Boss获取钥匙，解救被困的橘猫！",
    objective: {
      type: "rescueDog",
      target: 10,
      description: "击杀10个敌人后Boss出现，击败Boss获取钥匙解救橘猫",
    },
  },
  {
    id: 3,
    name: "迷宫机关城",
    description: "穿越迷宫，躲避机关，到达传送门！",
    objective: {
      type: "reachPortal",
      target: 1,
      description: "到达传送门",
    },
    map: generateMazeMap(),
    playerSpawn: { c: 1, r: 28 },
    enemySpawns: [
      { c: 10, r: 26 },
      { c: 10, r: 12 },
      { c: 30, r: 12 },
      { c: 30, r: 26 },
      { c: 40, r: 8 },
    ],
    initialEnemies: 5,
    maxEnemies: 5,
    baseEnemyHp: 3,
    enemySpeed: 60,
    special: "maze",
    noRespawn: true,
    switchLinks: {
      "36,8": ["22,14"],
    },
    crates: [
      { c: 36, r: 6 },
    ],
  },
];

function generateMazeMap() {
  const E = 0, W = 1, G = 2, B = 3;
  const SP = 6, SK = 7, FL = 8, DR = 9, SW = 10;
  const COLS = 45, ROWS = 30;

  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push((r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) ? B : E);
    }
    map.push(row);
  }

  const sc = (c, r, v) => { if (r >= 0 && r < ROWS && c >= 0 && c < COLS) map[r][c] = v; };
  const hw = (c1, c2, r) => { for (let c = c1; c <= c2; c++) sc(c, r, W); };
  const vw = (c, r1, r2) => { for (let r = r1; r <= r2; r++) sc(c, r, W); };

  hw(2, 42, 3); vw(20, 3, 10); vw(24, 3, 10);
  vw(42, 3, 10);

  vw(8, 4, 10); hw(8, 14, 10);
  vw(14, 4, 8);
  vw(30, 4, 10); hw(30, 38, 10);
  vw(38, 4, 8);

  hw(2, 22, 14); hw(23, 42, 14);
  vw(10, 10, 14); vw(16, 10, 14);
  vw(30, 10, 14); vw(36, 10, 14);

  vw(8, 16, 22); hw(8, 16, 22);
  vw(16, 16, 20);
  vw(24, 16, 22); hw(24, 32, 22);
  vw(32, 16, 22);
  hw(36, 42, 16); vw(36, 16, 22);

  vw(8, 24, 28); hw(8, 16, 24);
  vw(24, 24, 28); hw(24, 32, 24);

  sc(10, 8, SK); sc(11, 8, SK); sc(12, 8, SK);
  sc(32, 8, SK); sc(33, 8, SK); sc(34, 8, SK);
  sc(10, 18, SK); sc(11, 18, SK); sc(12, 18, SK);
  sc(32, 18, SK); sc(33, 18, SK); sc(34, 18, SK);

  sc(4, 26, SP); sc(5, 26, SP); sc(6, 26, SP);
  sc(38, 26, SP); sc(39, 26, SP); sc(40, 26, SP);

  sc(22, 14, DR);

  sc(36, 8, SW);

  sc(42, 1, G);

  sc(1, 28, E); sc(2, 28, E);

  return map;
}

export function getLevelConfig(levelId) {
  return LEVELS.find((l) => l.id === levelId);
}

export function isLevelUnlocked(levelId) {
  try {
    const progress = JSON.parse(
      localStorage.getItem("tank-level-progress") || "{}",
    );
    return levelId <= (progress.unlockedLevel || 1);
  } catch {
    return levelId === 1;
  }
}

export function getUnlockedLevel() {
  try {
    const progress = JSON.parse(
      localStorage.getItem("tank-level-progress") || "{}",
    );
    return progress.unlockedLevel || 1;
  } catch {
    return 1;
  }
}

export function unlockNextLevel(currentLevelId) {
  try {
    const progress = JSON.parse(
      localStorage.getItem("tank-level-progress") || "{}",
    );
    const nextLevel = currentLevelId + 1;
    if (nextLevel > (progress.unlockedLevel || 1)) {
      progress.unlockedLevel = nextLevel;
      localStorage.setItem("tank-level-progress", JSON.stringify(progress));
    }
    return nextLevel;
  } catch {
    return currentLevelId + 1;
  }
}
