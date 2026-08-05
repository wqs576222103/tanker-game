"use strict";

// ====================== 通用工具方法 ======================

const GameUtils = {
  // 获取所有存活坦克的位置
  getTankPositions() {
    return tanks
      .filter((t) => t.alive)
      .map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        isPlayer: t.isPlayer,
        inGrass: isInGrass(t),
      }));
  },

  // 获取玩家坦克位置
  getPlayerPosition() {
    if (!player || !player.alive) return null;
    return {
      id: player.id,
      x: player.x,
      y: player.y,
      inGrass: isInGrass(player),
    };
  },

  // 获取所有敌方坦克位置（含朝向与速度，便于预测下一步位置）
  getEnemyPositions() {
    return tanks
      .filter((t) => t.alive && !t.isPlayer)
      .map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
        dir: { x: t.dir.x, y: t.dir.y },
        dirName: t.dirName,
        speed: t.speed,
        inGrass: isInGrass(t),
      }));
  },

  // 预测敌方坦克下一步位置（默认按 1 帧 16ms 线性估算）
  predictEnemyPositions(frames = 1, dt = 0.016) {
    return this.getEnemyPositions().map((e) => ({
      ...e,
      nextX: e.x + e.dir.x * e.speed * dt * frames,
      nextY: e.y + e.dir.y * e.speed * dt * frames,
    }));
  },

  // 获取子弹位置（区分敌我，含方向与下一帧位置）
  getBulletPositions(frames = 1, dt = 0.016) {
    return bullets
      .filter((b) => !b.dead)
      .map((b) => {
        const speed = b.speed || 210;
        const dx = b.dx || 0;
        const dy = b.dy || 0;
        return {
          x: b.x,
          y: b.y,
          dir: { x: dx, y: dy },
          speed,
          nextX: b.x + dx * speed * dt * frames,
          nextY: b.y + dy * speed * dt * frames,
          isPlayerBullet: b.owner === "player",
          damage: b.dmg,
        };
      });
  },

  // 获取玩家子弹位置（含方向与下一帧位置）
  getPlayerBullets(frames = 1, dt = 0.016) {
    return bullets
      .filter((b) => !b.dead && b.owner === "player")
      .map((b) => {
        const speed = b.speed || 210;
        const dx = b.dx || 0;
        const dy = b.dy || 0;
        return {
          x: b.x,
          y: b.y,
          dir: { x: dx, y: dy },
          speed,
          nextX: b.x + dx * speed * dt * frames,
          nextY: b.y + dy * speed * dt * frames,
          damage: b.dmg,
        };
      });
  },

  // 获取敌方子弹位置（含方向与下一帧位置）
  getEnemyBullets(frames = 1, dt = 0.016) {
    return bullets
      .filter((b) => !b.dead && b.owner === "enemy")
      .map((b) => {
        const speed = b.speed || 210;
        const dx = b.dx || 0;
        const dy = b.dy || 0;
        return {
          x: b.x,
          y: b.y,
          dir: { x: dx, y: dy },
          speed,
          nextX: b.x + dx * speed * dt * frames,
          nextY: b.y + dy * speed * dt * frames,
          damage: b.dmg,
        };
      });
  },

  // 获取所有障碍位置（砖墙和碎石墙）
  getObstaclePositions() {
    const obstacles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = map[r][c];
        if (v === WALL || v === CRACK) {
          obstacles.push({
            x: c * CELL,
            y: r * CELL,
            type: v === WALL ? "wall" : "crack",
            column: c,
            row: r,
          });
        }
      }
    }
    return obstacles;
  },

  // 获取可破坏障碍位置（碎石墙）
  getDestructibleObstacles() {
    const obstacles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (map[r][c] === CRACK) {
          obstacles.push({
            x: c * CELL,
            y: r * CELL,
            hp: crackHp[protectedKey(c, r)] || 1,
            column: c,
            row: r,
          });
        }
      }
    }
    return obstacles;
  },

  // 获取不可破坏障碍位置（砖墙）
  getIndestructibleObstacles() {
    const obstacles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (map[r][c] === WALL) {
          obstacles.push({
            x: c * CELL,
            y: r * CELL,
            column: c,
            row: r,
          });
        }
      }
    }
    return obstacles;
  },

  // 获取草丛位置
  getGrassPositions() {
    const grass = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (map[r][c] === GRASS) {
          grass.push({
            x: c * CELL,
            y: r * CELL,
            column: c,
            row: r,
          });
        }
      }
    }
    return grass;
  },

  // 获取草丛中隐藏的坦克（只知道在草丛，不知道具体位置）
  getTanksInGrass() {
    return tanks
      .filter((t) => t.alive && isInGrass(t))
      .map((t) => ({
        id: t.id,
        isPlayer: t.isPlayer,
        grassCells: getGrassCellsForTank(t),
      }));
  },

  // 获取指定范围内的坦克
  getTanksInRange(x, y, range) {
    return tanks
      .filter(
        (t) =>
          t.alive && Math.hypot(t.x + t.w / 2 - x, t.y + t.h / 2 - y) <= range,
      )
      .map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        isPlayer: t.isPlayer,
        inGrass: isInGrass(t),
      }));
  },

  // 获取传送门位置
  getGatePositions() {
    const gatePositions = [];
    for (const g of gates) {
      const cells = g.cells.map((c) => ({
        x: c.c * CELL,
        y: c.r * CELL,
        column: c.c,
        row: c.r,
      }));
      gatePositions.push({
        cells,
        partnerCells: g.partner
          ? g.partner.cells.map((c) => ({
              x: c.c * CELL,
              y: c.r * CELL,
              column: c.c,
              row: c.r,
            }))
          : [],
      });
    }
    return gatePositions;
  },

  // 获取道具位置
  getItemPositions() {
    return items
      .filter((it) => !it.dead)
      .map((it) => ({
        x: it.x,
        y: it.y,
        type: it.def.id,
        name: it.def.name,
      }));
  },

  // 获取地雷位置
  getMinePositions() {
    return mines
      .filter((m) => !m.dead)
      .map((m) => ({
        x: m.x,
        y: m.y,
      }));
  },

  // 获取Boss位置
  getBossPosition() {
    if (!boss || !boss.alive) return null;
    return {
      x: boss.x,
      y: boss.y,
      width: boss.w,
      height: boss.h,
    };
  },

  // 检查指定位置是否被占用
  isPositionOccupied(x, y, excludeTankId) {
    for (const t of tanks) {
      if (!t.alive || t.id === excludeTankId) continue;
      if (x < t.x + t.w && x + CELL > t.x && y < t.y + t.h && y + CELL > t.y) {
        return true;
      }
    }
    return false;
  },

  // 检查指定位置是否为障碍
  isPositionObstacle(x, y) {
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
    const v = map[r][c];
    return v === WALL || v === BORDER || v === CRACK;
  },

  // 获取地图网格类型
  getCellType(column, row) {
    if (row < 0 || row >= ROWS || column < 0 || column >= COLS) return BORDER;
    return map[row][column];
  },
};

// 辅助函数：检查坦克是否在草丛中
function isInGrass(tank) {
  const cx = Math.floor((tank.x + tank.w / 2) / CELL);
  const cy = Math.floor((tank.y + tank.h / 2) / CELL);
  return cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS && map[cy][cx] === GRASS;
}

// 辅助函数：获取坦克占据的草丛格子
function getGrassCellsForTank(tank) {
  const cells = [];
  const c1 = Math.floor(tank.x / CELL);
  const c2 = Math.floor((tank.x + tank.w - 1) / CELL);
  const r1 = Math.floor(tank.y / CELL);
  const r2 = Math.floor((tank.y + tank.h - 1) / CELL);
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && map[r][c] === GRASS) {
        cells.push({ column: c, row: r });
      }
    }
  }
  return cells;
}
