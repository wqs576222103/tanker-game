import {
  EMPTY,
  WALL,
  BORDER,
  CRACK,
  GRASS,
  GATE,
  COLS,
  ROWS,
  protectedKey,
} from "./base.js";

// Level 1: 夺旗精英 - 丰富布局
const level1Map = (() => {
  const R = 30,
    C = 45;
  const m = [];
  for (let r = 0; r < R; r++) {
    const row = [];
    for (let c = 0; c < C; c++) {
      if (r === 0 || r === R - 1 || c === 0 || c === C - 1) row.push(3);
      else row.push(0);
    }
    m.push(row);
  }
  const set = (c, r, v) => {
    if (m[r]) m[r][c] = v;
  };
  const wall = (c1, r1, c2, r2) => {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) set(c, r, 1);
  };
  // 左上区域掩体
  wall(5, 5, 7, 5);
  wall(5, 6, 5, 8);
  // 右上区域掩体
  wall(36, 5, 38, 5);
  wall(38, 6, 38, 8);
  // 中左掩体
  wall(10, 12, 12, 12);
  wall(10, 13, 10, 15);
  // 中右掩体
  wall(32, 12, 34, 12);
  wall(34, 13, 34, 15);
  // 中央掩体
  wall(20, 14, 24, 14);
  wall(20, 16, 24, 16);
  wall(20, 14, 20, 16);
  wall(24, 14, 24, 16);
  // 左下掩体
  wall(8, 22, 10, 22);
  wall(8, 23, 8, 25);
  // 右下掩体
  wall(34, 22, 36, 22);
  wall(36, 23, 36, 25);
  // 旗帜四周障碍墙（击杀5个后消失）
  set(22, 2, 1);
  set(21, 3, 1);
  set(23, 3, 1);
  set(22, 4, 1);
  return m;
})();

// Level 2: 解救小狗 - 困住小狗的牢笼布局
const level2Map = (() => {
  const R = 30,
    C = 45;
  const m = [];
  for (let r = 0; r < R; r++) {
    const row = [];
    for (let c = 0; c < C; c++) {
      if (r === 0 || r === R - 1 || c === 0 || c === C - 1) row.push(3);
      else row.push(0);
    }
    m.push(row);
  }
  const set = (c, r, v) => {
    if (m[r]) m[r][c] = v;
  };
  const wall = (c1, r1, c2, r2) => {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) set(c, r, 1);
  };

  // 小狗牢笼（三面墙紧贴小狗，下方门紧贴）
  // 上墙
  wall(21, 7, 23, 7);
  // 左墙
  wall(21, 7, 21, 9);
  // 右墙
  wall(23, 7, 23, 9);
  // 下方门紧贴小狗

  // 左上区域掩体
  wall(5, 4, 7, 4);
  wall(5, 5, 5, 7);
  // 右上区域掩体
  wall(36, 4, 38, 4);
  wall(38, 5, 38, 7);
  // 中左掩体
  wall(8, 12, 10, 12);
  wall(8, 13, 8, 15);
  // 中右掩体
  wall(34, 12, 36, 12);
  wall(36, 13, 36, 15);
  // 左下掩体
  wall(6, 20, 8, 20);
  wall(6, 21, 6, 23);
  // 右下掩体
  wall(36, 20, 38, 20);
  wall(38, 21, 38, 23);
  // 中央下方掩体
  wall(18, 18, 26, 18);
  wall(18, 20, 26, 20);
  wall(18, 18, 18, 20);
  wall(26, 18, 26, 20);

  return m;
})();

// 初始化碎石墙耐久
function initCrackHp(map) {
  const crackHp = {};
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r] && map[r][c] === CRACK) {
        crackHp[protectedKey(c, r)] = 2 + Math.floor(Math.random() * 2);
      }
    }
  }
  return crackHp;
}

export const LEVELS = [
  {
    id: 1,
    name: "夺旗精英",
    description: "消灭敌军，夺取敌方旗帜！",
    map: level1Map,
    crackHp: {},
    playerSpawn: { c: 22, r: 26 },
    enemySpawns: [
      { c: 5, r: 3 },
      { c: 39, r: 3 },
    ],
    initialEnemies: 4,
    flag: {
      x: 22 * 20,
      y: 3 * 20,
      team: "enemy",
    },
    flagWallCells: [
      { c: 22, r: 2 },
      { c: 21, r: 3 },
      { c: 23, r: 3 },
      { c: 22, r: 4 },
    ],
    objective: {
      type: "captureFlag",
      target: 5,
      description: "击杀5名敌人后夺取旗帜",
    },
    maxEnemies: 6,
    baseEnemyHp: 2,
    playerSpeed: 80,
    enemySpeed: 55,
  },
  // Level 2: 解救小狗 - 击杀boss获取钥匙，打开门解救小狗
  {
    id: 2,
    name: "解救小狗",
    description: "击杀10个敌人后Boss出现，击败Boss获取钥匙，解救被困的小狗！",
    map: level2Map,
    crackHp: initCrackHp(level2Map),
    playerSpawn: { c: 22, r: 26 },
    enemySpawns: [
      { c: 5, r: 3 },
      { c: 39, r: 3 },
      { c: 5, r: 15 },
      { c: 39, r: 15 },
    ],
    initialEnemies: 4,
    objective: {
      type: "rescueDog",
      target: 10,
      description: "击杀10个敌人后Boss出现，击败Boss获取钥匙解救小狗",
    },
    // 小狗位置和牢笼配置
    dogCage: {
      // 小狗位置（占一个格子）
      dogPosition: { c: 22, r: 8 },
      // 牢笼墙壁（紧贴小狗）
      cageWalls: [
        { c: 21, r: 7 },
        { c: 22, r: 7 },
        { c: 23, r: 7 }, // 上墙
        { c: 21, r: 8 }, // 左墙
        { c: 21, r: 9 }, // 左墙下
        { c: 23, r: 8 }, // 右墙
        { c: 23, r: 9 }, // 右墙下
      ],
      // 牢笼门（紧贴小狗下方）
      cageDoor: { c: 22, r: 9 },
    },
    // Boss配置
    bossThreshold: 10, // 击杀10个敌人后Boss出现
    maxEnemies: 6,
    baseEnemyHp: 2,
    playerSpeed: 80,
    enemySpeed: 55,
  },
];

// 根据关卡ID获取配置
export function getLevelConfig(levelId) {
  return LEVELS.find((l) => l.id === levelId);
}

// 检查关卡是否已解锁
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

// 获取已解锁的最高关卡
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

// 解锁下一关
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
