"use strict";

// ====================== AI 死亡日志系统 ======================

const AILogger = {
  maxRecords: 50,
  currentSession: null,
  deathRecords: [],

  startSession() {
    this.currentSession = {
      startTime: performance.now(),
      decisions: [],
      lastWeights: { survival: 0, kill: 0, item: 0 },
      lastAction: null,
      lastMoveDir: null,
      wasDodging: false,
    };
  },

  logDecision(data) {
    if (!this.currentSession) return;

    this.currentSession.decisions.push({
      time: (performance.now() - this.currentSession.startTime) / 1000,
      ...data,
    });

    if (this.currentSession.decisions.length > 100) {
      this.currentSession.decisions.shift();
    }
  },

  logDeath(reason, context) {
    if (!this.currentSession || !player) return;

    const px = player.x + 15;
    const py = player.y + 15;

    const enemyTanks = tanks.filter((t) => t.alive && !t.isPlayer);
    const nearbyEnemies = enemyTanks
      .filter((e) => Math.hypot(e.x + 15 - px, e.y + 15 - py) < 150)
      .map((e) => ({
        x: e.x,
        y: e.y,
        hp: e.hp,
        dist: Math.hypot(e.x + 15 - px, e.y + 15 - py),
      }));

    const liveBullets = bullets.filter((b) => !b.dead);
    const threatBullets = liveBullets
      .filter((b) => !b.isPlayerBullet)
      .filter((b) => Math.hypot(b.x + 3 - px, b.y + 3 - py) < 150)
      .map((b) => ({
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        dist: Math.hypot(b.x + 3 - px, b.y + 3 - py),
      }));

    const record = {
      timestamp: Date.now(),
      deathReason: reason,
      playerState: {
        hp: player.hp,
        maxHp: player.maxHp || 5,
        x: player.x,
        y: player.y,
        dir: { ...player.dir },
        hasShield: player.shieldT > performance.now(),
      },
      aiState: {
        survivalWeight: this.currentSession.lastWeights.survival,
        killWeight: this.currentSession.lastWeights.kill,
        itemWeight: this.currentSession.lastWeights.item,
        selectedAction: this.currentSession.lastAction,
        moveDir: this.currentSession.lastMoveDir,
        wasDodging: this.currentSession.wasDodging,
      },
      surroundings: {
        enemyCount: enemyTanks.length,
        nearbyEnemies,
        bulletCount: liveBullets.length,
        threatBullets,
      },
      decisionLog: this.currentSession.decisions.slice(-20),
      context: context || {},
    };

    this.deathRecords.unshift(record);
    if (this.deathRecords.length > this.maxRecords) {
      this.deathRecords.pop();
    }

    this.startSession();
    return record;
  },

  updateWeights(survival, kill, item) {
    if (!this.currentSession) return;
    this.currentSession.lastWeights = { survival, kill, item };
  },

  updateAction(action) {
    if (!this.currentSession) return;
    this.currentSession.lastAction = action;
  },

  updateMoveDir(dir) {
    if (!this.currentSession) return;
    this.currentSession.lastMoveDir = dir;
  },

  updateDodging(dodging, dodgeDir) {
    if (!this.currentSession) return;
    this.currentSession.wasDodging = dodging;
    if (dodgeDir) {
      this.currentSession.lastMoveDir = dodgeDir;
    }
  },

  getRecords() {
    return this.deathRecords;
  },

  getRecordCount() {
    return this.deathRecords.length;
  },

  exportJSON() {
    return JSON.stringify(this.deathRecords, null, 2);
  },

  clear() {
    this.deathRecords = [];
    this.currentSession = null;
  },
};

// ====================== AI 玩家控制器（权重决策系统） ======================

const AIPlayer = {
  enabled: false,

  thinkInterval: 100,
  lastThink: 0,

  moveDir: null,

  dodging: false,
  dodgeDir: null,
  dodgeTimer: 0,

  lastBlockedDir: null,
  blockedTimer: 0,

  weights: {
    kill: 0.6,
    item: 0.4,
    survival: 0.8,
  },

  itemPriority: {
    shield: 1.0,
    spread: 0.95,
    life: 0.95,
    fireRate: 0.75,
    speed: 0.7,
    drone: 0.6,
    mine: 0.5,
  },

  init() {
    this.enabled = false;
    this.moveDir = null;
    this.dodging = false;
    this.lastBlockedDir = null;
    this.blockedTimer = 0;
    AILogger.startSession();
  },

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      AILogger.startSession();
    } else {
      this.clearKeys();
    }
    return this.enabled;
  },

  clearKeys() {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    keys.fire = false;
    keys.mine = false;
  },

  // ====================== 主循环 ======================

  update(dt) {
    if (!this.enabled || state !== "playing") {
      return;
    }

    const now = performance.now();

    if (this.blockedTimer > 0) {
      this.blockedTimer -= dt;
      if (this.blockedTimer <= 0) {
        this.lastBlockedDir = null;
      }
    }

    if (this.dodging) {
      AILogger.updateDodging(true, this.dodgeDir);
      this.handleDodge(dt);
      return;
    }

    AILogger.updateDodging(false, null);

    if (now - this.lastThink < this.thinkInterval) {
      this.executeMove();
      return;
    }
    this.lastThink = now;

    const playerPos = GameUtils.getPlayerPosition();
    const enemiesList = GameUtils.getEnemyPositions();
    const bulletsList = GameUtils.getBulletPositions();
    const itemsList = GameUtils.getItemPositions();

    if (!playerPos || !player.alive) {
      this.clearKeys();
      return;
    }

    const px = playerPos.x + 15;
    const py = playerPos.y + 15;

    const survivalWeight = this.calcSurvivalWeight(
      px,
      py,
      bulletsList,
      enemiesList,
    );
    const killWeight = this.calcKillWeight(px, py, enemiesList);
    const itemWeight = this.calcItemWeight(px, py, itemsList);

    AILogger.updateWeights(survivalWeight, killWeight, itemWeight);

    if (survivalWeight > 60) {
      const threat = this.findThreateningBullets(playerPos, bulletsList);
      if (threat) {
        AILogger.logDecision({
          action: "dodge",
          weights: {
            survival: survivalWeight,
            kill: killWeight,
            item: itemWeight,
          },
          threat: { x: threat.x, y: threat.y, dist: threat.dist },
        });
        AILogger.updateAction("dodge");
        this.startDodge(threat, playerPos);
        return;
      }
    }

    let target;
    let selectedAction;

    if (survivalWeight > killWeight && survivalWeight > itemWeight) {
      target = this.findSafePosition(px, py, enemiesList, bulletsList);
      selectedAction = "survival";
    } else if (killWeight > itemWeight) {
      target = this.findBestEnemy(px, py, enemiesList);
      selectedAction = "kill";
    } else {
      target = this.findBestItem(px, py, itemsList);
      selectedAction = "item";
    }

    AILogger.logDecision({
      action: selectedAction,
      weights: { survival: survivalWeight, kill: killWeight, item: itemWeight },
      target,
    });
    AILogger.updateAction(selectedAction);

    this.computeMoveDir(playerPos, target);
    AILogger.updateMoveDir(this.moveDir);
    this.executeMove();
    this.executeShoot(playerPos, enemiesList);
  },

  // ====================== 权重计算 ======================

  calcSurvivalWeight(px, py, bullets, enemies) {
    let weight = 0;

    const threatBullets = this.findThreateningBulletsList(px, py, bullets);
    weight += threatBullets.length * 35;

    for (const b of threatBullets) {
      const dist = Math.hypot(b.x - px, b.y - py);
      if (dist < 30) weight += 60;
      else if (dist < 50) weight += 45;
      else if (dist < 70) weight += 30;
      else if (dist < 100) weight += 15;
    }

    if (player) {
      const hpRatio = player.hp / (player.maxHp || 5);
      if (hpRatio < 0.3) weight += 50;
      else if (hpRatio < 0.5) weight += 30;
      else if (hpRatio < 0.7) weight += 15;
    }

    for (const e of enemies) {
      const dist = Math.hypot(e.x + 15 - px, e.y + 15 - py);
      if (dist < 40) weight += 60;
      else if (dist < 60) weight += 40;
      else if (dist < 90) weight += 25;
      else if (dist < 120) weight += 15;
    }

    return Math.min(weight, 100);
  },

  calcKillWeight(px, py, enemies) {
    if (enemies.length === 0) return 0;

    let totalScore = 0;

    const enemyTanks = tanks.filter((t) => t.alive && !t.isPlayer);

    for (const e of enemies) {
      const ex = e.x + 15;
      const ey = e.y + 15;
      const dist = Math.hypot(ex - px, ey - py);

      let distScore = 0;
      if (dist < 100) distScore = 40;
      else if (dist < 200) distScore = 30;
      else if (dist < 300) distScore = 20;
      else distScore = 10;

      const sameRow = Math.abs(py - ey) < CELL;
      const sameCol = Math.abs(px - ex) < CELL;
      const alignScore = sameRow || sameCol ? 20 : 0;

      const clearScore = this.isPathClear(px, py, ex, ey) ? 15 : 0;
      const facingScore = this.isPlayerFacingEnemy(px, py, ex, ey) ? 15 : 0;

      let hpBonus = 0;
      const tank = enemyTanks.find((t) => t.x === e.x && t.y === e.y);
      if (tank) {
        if (tank.hp <= 1) hpBonus = 15;
        else if (tank.hp <= 2) hpBonus = 5;
      }

      totalScore += distScore + alignScore + clearScore + facingScore + hpBonus;
    }

    const avgScore = totalScore / enemies.length;
    const countFactor = Math.min(enemies.length * 0.15, 0.5);
    return Math.min(avgScore * (1 + countFactor), 100);
  },

  calcItemWeight(px, py, items) {
    if (items.length === 0) return 0;

    let totalScore = 0;

    for (const item of items) {
      const ix = item.x + 12;
      const iy = item.y + 12;
      const dist = Math.hypot(ix - px, iy - py);

      let distScore = 0;
      if (dist < 80) distScore = 35;
      else if (dist < 150) distScore = 25;
      else if (dist < 250) distScore = 15;
      else distScore = 5;

      const typeScore = (this.itemPriority[item.type] || 0.5) * 30;

      let specialBonus = 0;
      if (player) {
        if (item.type === "life" && player.hp < 3) specialBonus = 20;
        if (item.type === "shield" && !player.shieldT) specialBonus = 15;
      }

      totalScore += distScore + typeScore + specialBonus;
    }

    return Math.min(totalScore / items.length, 100);
  },

  // ====================== 目标选择 ======================

  findBestEnemy(px, py, enemies) {
    let best = null;
    let bestScore = -1;

    for (const e of enemies) {
      const ex = e.x + 15;
      const ey = e.y + 15;
      const dist = Math.hypot(ex - px, ey - py);

      let score = (400 - dist) * 0.1;
      if (this.isPathClear(px, py, ex, ey)) score += 30;
      if (this.isPlayerFacingEnemy(px, py, ex, ey)) score += 20;

      if (score > bestScore) {
        bestScore = score;
        best = { x: ex, y: ey };
      }
    }

    return best || { x: W / 2, y: H / 2 };
  },

  findBestItem(px, py, items) {
    let best = null;
    let bestScore = -1;

    for (const item of items) {
      const ix = item.x + 12;
      const iy = item.y + 12;
      const dist = Math.hypot(ix - px, iy - py);

      let score =
        (300 - dist) * 0.1 + (this.itemPriority[item.type] || 0.5) * 25;
      if (player && item.type === "life" && player.hp < 3) score += 30;

      if (score > bestScore) {
        bestScore = score;
        best = { x: ix, y: iy };
      }
    }

    return best || { x: W / 2, y: H / 2 };
  },

  findSafePosition(px, py, enemies, bullets) {
    let safestX = px;
    let safestY = py;
    let minThreat = Infinity;

    const candidates = [
      { x: px - 90, y: py },
      { x: px + 90, y: py },
      { x: px, y: py - 90 },
      { x: px, y: py + 90 },
      { x: px - 60, y: py - 60 },
      { x: px + 60, y: py - 60 },
      { x: px - 60, y: py + 60 },
      { x: px + 60, y: py + 60 },
    ];

    for (const c of candidates) {
      let threat = 0;
      for (const e of enemies) {
        const dist = Math.hypot(c.x - e.x - 15, c.y - e.y - 15);
        threat += Math.max(0, 200 - dist);
        if (dist < 40) threat += 100;
      }
      for (const b of bullets) {
        if (b.isPlayerBullet) continue;
        const dist = Math.hypot(c.x - b.x - 3, c.y - b.y - 3);
        if (dist < 100) threat += 150 - dist;
        const ttx = b.x + 3 + (b.vx || 0) * 0.3;
        const tty = b.y + 3 + (b.vy || 0) * 0.3;
        const predDist = Math.hypot(c.x - ttx, c.y - tty);
        if (predDist < 80) threat += 120 - predDist;
      }

      const cell = this.getCell(c.x, c.y);
      if (cell.c >= 0 && cell.c < COLS && cell.r >= 0 && cell.r < ROWS) {
        if (map[cell.c][cell.r] === EMPTY && threat < minThreat) {
          minThreat = threat;
          safestX = c.x;
          safestY = c.y;
        }
      }
    }

    return { x: safestX, y: safestY };
  },

  // ====================== 威胁检测 ======================

  findThreateningBulletsList(px, py, bullets) {
    const threats = [];
    const dangerRange = 250;

    for (const b of bullets) {
      if (b.isPlayerBullet) continue;

      const bx = b.x + 3;
      const by = b.y + 3;
      const dist = Math.hypot(bx - px, by - py);

      if (dist > dangerRange) continue;

      const angle = Math.atan2(py - by, px - bx);
      const bulletAngle = Math.atan2(b.vy || 0, b.vx || 0);
      let angleDiff = Math.abs(angle - bulletAngle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

      const maxAngle = dist < 40 ? 1.2 : dist < 80 ? 0.9 : 0.6;
      if (angleDiff < maxAngle) {
        const ttx = bx + (b.vx || 0) * 0.4;
        const tty = by + (b.vy || 0) * 0.4;
        const predictDist = Math.hypot(ttx - px, tty - py);
        threats.push({ x: bx, y: by, dist, vx: b.vx, vy: b.vy, predictDist });
      }
    }

    threats.sort(
      (a, b) => (a.predictDist || a.dist) - (b.predictDist || b.dist),
    );
    return threats;
  },

  findThreateningBullets(playerPos, bullets) {
    const px = playerPos.x + 15;
    const py = playerPos.y + 15;
    const threats = this.findThreateningBulletsList(px, py, bullets);
    return threats.length > 0 ? threats[0] : null;
  },

  isEnemyFacingPlayer(px, py, enemy) {
    const dist = Math.hypot(px - (enemy.x + 15), py - (enemy.y + 15));
    return dist <= 150;
  },

  // ====================== 躲避系统 ======================

  startDodge(threat, playerPos) {
    const px = playerPos.x + 15;
    const py = playerPos.y + 15;

    const angle = Math.atan2(py - threat.y, px - threat.x);
    const angles = [
      angle + Math.PI / 2,
      angle - Math.PI / 2,
      angle + Math.PI / 3,
      angle - Math.PI / 3,
      angle + Math.PI / 4,
      angle - Math.PI / 4,
      angle + (Math.PI * 2) / 3,
      angle - (Math.PI * 2) / 3,
      angle + (Math.PI * 3) / 4,
      angle - (Math.PI * 3) / 4,
    ];

    let bestDir = null;
    let bestScore = -1;

    for (const a of angles) {
      const dir = { x: Math.cos(a), y: Math.sin(a) };
      if (this.isBlocked(dir)) continue;
      const free = this.getFreeDistance(dir);
      if (free <= 0) continue;

      let score = free;
      const angleDiff = Math.abs(a - angle);
      if (Math.abs(angleDiff - Math.PI / 2) < 0.3) {
        score += 30;
      } else if (
        Math.abs(angleDiff - Math.PI / 3) < 0.3 ||
        Math.abs(angleDiff - (Math.PI * 2) / 3) < 0.3
      ) {
        score += 20;
      } else if (
        Math.abs(angleDiff - Math.PI / 4) < 0.3 ||
        Math.abs(angleDiff - (Math.PI * 3) / 4) < 0.3
      ) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }

    if (!bestDir) {
      const dir1 = {
        x: Math.cos(angle + Math.PI / 2),
        y: Math.sin(angle + Math.PI / 2),
      };
      const dir2 = { x: -dir1.x, y: -dir1.y };
      const free1 = this.getFreeDistance(dir1);
      const free2 = this.getFreeDistance(dir2);
      bestDir = free1 >= free2 ? dir1 : dir2;
    }

    this.dodgeDir = bestDir;
    this.dodging = true;
    this.dodgeTimer = 0.35;
    this.moveDir = this.dodgeDir;
  },

  handleDodge(dt) {
    this.dodgeTimer -= dt;
    if (this.dodgeTimer <= 0) {
      this.dodging = false;
      this.dodgeDir = null;
    }
    this.executeMove();
  },

  // ====================== 碰撞检测（考虑坦克尺寸） ======================

  isBlocked(dir) {
    const playerPos = GameUtils.getPlayerPosition();
    if (!playerPos) return true;

    const centerX = playerPos.x + 15;
    const centerY = playerPos.y + 15;
    const tankHalf = 12;
    const testPoints = [];

    if (dir === DIRS.up || dir === DIRS.down) {
      const dy = dir === DIRS.up ? -18 : 18;
      testPoints.push({ x: centerX - tankHalf, y: centerY + dy });
      testPoints.push({ x: centerX, y: centerY + dy });
      testPoints.push({ x: centerX + tankHalf, y: centerY + dy });
      testPoints.push({
        x: centerX - tankHalf,
        y: centerY + (dir === DIRS.up ? -tankHalf : tankHalf),
      });
      testPoints.push({
        x: centerX + tankHalf,
        y: centerY + (dir === DIRS.up ? -tankHalf : tankHalf),
      });
    } else {
      const dx = dir === DIRS.left ? -18 : 18;
      testPoints.push({ x: centerX + dx, y: centerY - tankHalf });
      testPoints.push({ x: centerX + dx, y: centerY });
      testPoints.push({ x: centerX + dx, y: centerY + tankHalf });
      testPoints.push({
        x: centerX + (dir === DIRS.left ? -tankHalf : tankHalf),
        y: centerY - tankHalf,
      });
      testPoints.push({
        x: centerX + (dir === DIRS.left ? -tankHalf : tankHalf),
        y: centerY + tankHalf,
      });
    }

    for (const p of testPoints) {
      const cell = this.getCell(p.x, p.y);
      if (cell.c < 0 || cell.c >= COLS || cell.r < 0 || cell.r >= ROWS)
        return true;
      const cellType = map[cell.c][cell.r];
      if (cellType !== EMPTY) return true;
    }
    return false;
  },

  // ====================== 移动系统 ======================

  computeMoveDir(playerPos, target) {
    const px = playerPos.x + 15;
    const py = playerPos.y + 15;
    const tx = target.x;
    const ty = target.y;

    const dx = tx - px;
    const dy = ty - py;

    let primaryDir, secondaryDirs;

    if (Math.abs(dx) > Math.abs(dy)) {
      primaryDir = dx > 0 ? DIRS.right : DIRS.left;
      secondaryDirs = dy >= 0 ? [DIRS.down, DIRS.up] : [DIRS.up, DIRS.down];
    } else {
      primaryDir = dy > 0 ? DIRS.down : DIRS.up;
      secondaryDirs =
        dx >= 0 ? [DIRS.right, DIRS.left] : [DIRS.left, DIRS.right];
    }

    const isBlockedPrimary =
      this.lastBlockedDir === primaryDir && this.blockedTimer > 0;

    if (!isBlockedPrimary && !this.isBlocked(primaryDir)) {
      if (!this.isTankNearDir(primaryDir, px, py)) {
        this.moveDir = primaryDir;
        this.lastBlockedDir = null;
        return;
      }
    }

    for (const alt of secondaryDirs) {
      if (this.lastBlockedDir === alt && this.blockedTimer > 0) continue;
      if (!this.isBlocked(alt) && !this.isTankNearDir(alt, px, py)) {
        this.moveDir = alt;
        return;
      }
    }

    this.moveDir = this.getBestEscapeDir();
  },

  isTankNearDir(dir, px, py) {
    const tanks = GameUtils.getEnemyPositions();
    for (const t of tanks) {
      const ex = t.x + 15;
      const ey = t.y + 15;
      const dist = Math.hypot(ex - px, ey - py);
      if (dist > 50) continue;
      const toTx = ex - px;
      const toTy = ey - py;
      const dot = dir.x * toTx + dir.y * toTy;
      if (dot > 0) return true;
    }
    return false;
  },

  getBestEscapeDir() {
    const dirs = [DIRS.up, DIRS.down, DIRS.left, DIRS.right];
    const playerPos = GameUtils.getPlayerPosition();
    const px = playerPos.x + 15;
    const py = playerPos.y + 15;
    let best = null;
    let maxScore = -1;

    for (const dir of dirs) {
      if (this.isBlocked(dir)) continue;
      if (this.lastBlockedDir === dir && this.blockedTimer > 0) continue;

      let score = this.getFreeDistance(dir);
      if (this.isTankNearDir(dir, px, py)) score -= 30;
      score += Math.random() * 5;

      if (score > maxScore) {
        maxScore = score;
        best = dir;
      }
    }

    if (best) return best;

    if (this.tryShootDestructibleWall()) {
      this.keys = this.keys || {};
      keys.fire = true;
      return this.moveDir || dirs[0];
    }

    return dirs[Math.floor(Math.random() * dirs.length)];
  },

  tryShootDestructibleWall() {
    const playerPos = GameUtils.getPlayerPosition();
    if (!playerPos) return false;

    const px = playerPos.x + 15;
    const py = playerPos.y + 15;
    const dir = player.dir;

    const testDistances = [CELL, CELL * 2];
    for (const dist of testDistances) {
      const testX = px + dir.x * dist;
      const testY = py + dir.y * dist;
      const cell = this.getCell(testX, testY);

      if (cell.c >= 0 && cell.c < COLS && cell.r >= 0 && cell.r < ROWS) {
        if (map[cell.c][cell.r] === CRACK) {
          return true;
        }
      }
    }
    return false;
  },

  getAlternativeDirs(preferred) {
    if (preferred === DIRS.up || preferred === DIRS.down) {
      return [DIRS.left, DIRS.right];
    }
    return [DIRS.up, DIRS.down];
  },

  getFreestDirection() {
    const dirs = [DIRS.up, DIRS.down, DIRS.left, DIRS.right];
    const playerPos = GameUtils.getPlayerPosition();
    const px = playerPos.x + 15;
    const py = playerPos.y + 15;
    let best = DIRS.up;
    let maxFree = -1;

    for (const dir of dirs) {
      if (this.isBlocked(dir)) continue;
      let free = this.getFreeDistance(dir);
      if (this.isTankNearDir(dir, px, py)) free -= 30;
      if (free > maxFree) {
        maxFree = free;
        best = dir;
      }
    }
    return best;
  },

  getFreeDistance(dir) {
    const playerPos = GameUtils.getPlayerPosition();
    if (!playerPos) return 0;

    const cell = this.getCell(playerPos.x + 15, playerPos.y + 15);
    let dist = 0;
    let cx = cell.c;
    let cy = cell.r;

    for (let i = 0; i < 5; i++) {
      cx += Math.round(dir.x);
      cy += Math.round(dir.y);
      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) break;
      if (map[cx][cy] !== EMPTY) break;
      dist += CELL;
    }
    return dist;
  },

  executeMove() {
    if (!this.moveDir) {
      this.clearKeys();
      return;
    }

    if (this.isBlocked(this.moveDir)) {
      this.lastBlockedDir = this.moveDir;
      this.blockedTimer = 1.5;
      this.moveDir = this.getBestEscapeDir();
      return;
    }

    keys.up = this.moveDir === DIRS.up;
    keys.down = this.moveDir === DIRS.down;
    keys.left = this.moveDir === DIRS.left;
    keys.right = this.moveDir === DIRS.right;
  },

  // ====================== 射击系统 ======================

  executeShoot(playerPos, enemies) {
    const px = playerPos.x + 15;
    const py = playerPos.y + 15;
    const playerDir = player.dir;

    for (const e of enemies) {
      const ex = e.x + 15;
      const ey = e.y + 15;

      const sameRow = Math.abs(py - ey) < CELL;
      const sameCol = Math.abs(px - ex) < CELL;

      if (sameRow || sameCol) {
        if (this.isFacingTarget(px, py, ex, ey, playerDir)) {
          if (this.isPathClear(px, py, ex, ey)) {
            keys.fire = true;
            return;
          }
        }
      }
    }
    keys.fire = false;
  },

  isFacingTarget(px, py, tx, ty, dir) {
    const dx = tx - px;
    const dy = ty - py;

    if (dir.x === 1 && dx > 0) return true;
    if (dir.x === -1 && dx < 0) return true;
    if (dir.y === 1 && dy > 0) return true;
    if (dir.y === -1 && dy < 0) return true;

    return false;
  },

  isPlayerFacingEnemy(px, py, ex, ey) {
    if (!player) return false;
    return this.isFacingTarget(px, py, ex, ey, player.dir);
  },

  isPathClear(px, py, tx, ty) {
    const start = this.getCell(px, py);
    const end = this.getCell(tx, ty);

    if (start.r === end.r) {
      const minC = Math.min(start.c, end.c);
      const maxC = Math.max(start.c, end.c);
      for (let c = minC + 1; c < maxC; c++) {
        const cellType = map[c][start.r];
        if (cellType === WALL || cellType === CRACK || cellType === BORDER)
          return false;
      }
      return true;
    }

    if (start.c === end.c) {
      const minR = Math.min(start.r, end.r);
      const maxR = Math.max(start.r, end.r);
      for (let r = minR + 1; r < maxR; r++) {
        const cellType = map[start.c][r];
        if (cellType === WALL || cellType === CRACK || cellType === BORDER)
          return false;
      }
      return true;
    }

    return false;
  },

  // ====================== 工具函数 ======================

  getCell(x, y) {
    return {
      c: Math.floor(x / CELL),
      r: Math.floor(y / CELL),
    };
  },
};
