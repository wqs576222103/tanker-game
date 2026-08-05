"use strict";

// ====================== AI 运行时（即插即用） ======================
//
// 玩家可以在页面中导入自定义 AI 脚本文件（.js / .mjs / .txt），
// 脚本只需要实现以下「接口」即可被直接运行。
//
// ---------------------------------------------------------------
// 接口约定（AI 脚本只需要实现这些方法）：
//
//   export default {
//     name: "我的AI",                 // 可选：显示名称
//
//     onLoad(ctx)       { },          // 可选：脚本被加载/启用时调用
//     onRoundStart(ctx) { },          // 可选：每局开始时调用
//
//     decide(ctx, dt) {               // 必选：每帧调用，返回本帧要执行的按键
//       return {
//         up: rightDown,  down: ...,  left: ...,  right: ...,
//         fire: true,                 // 持续按住=连续射击（有内置冷却）
//         mine: false,
//       };
//     },
//
//     onDeath(ctx, reason) { },       // 可选：玩家死亡时调用
//     onDisabled(ctx) { },            // 可选：被关闭时调用
//   };
//
// 也可以不使用 ES 模块，直接定义全局对象 window.__AI__ = { decide(ctx, dt){...} }。
//
// ctx（沙箱）是游戏状态的只读快照，结构见 buildContext()。
// ---------------------------------------------------------------

const AIPlayer = {
  enabled: false,
  ai: null,
  aiName: "内置AI",
  lastThink: 0,

  // ---------------- 初始化 ----------------

  init() {
    this.enabled = false;
    this.clearKeys();
    if (this.ai && this.ai.onRoundStart) {
      try {
        this.ai.onRoundStart(this.buildContext());
      } catch (e) {
        console.error("[AI] onRoundStart 出错:", e);
      }
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      if (!this.ai) this.ai = DefaultAI;
      this.lastThink = 0;
      AILogger.startSession();
      if (this.ai && this.ai.onLoad) {
        try {
          this.ai.onLoad(this.buildContext());
        } catch (e) {
          console.error("[AI] onLoad 出错:", e);
        }
      }
    } else {
      this.clearKeys();
      if (this.ai && this.ai.onDisabled) {
        try {
          this.ai.onDisabled(this.buildContext());
        } catch (e) {
          console.error("[AI] onDisabled 出错:", e);
        }
      }
    }
    this.updateUI();
    return this.enabled;
  },

  // ---------------- 加载 ----------------

  loadAI(moduleObj) {
    if (!moduleObj || typeof moduleObj.decide !== "function") {
      throw new Error("AI 脚本必须包含 decide(ctx, dt) 方法");
    }
    if (this.ai && this.ai !== moduleObj && this.ai.onUnload) {
      try {
        this.ai.onUnload();
      } catch (e) {}
    }
    this.ai = moduleObj;
    this.aiName = moduleObj.name || "自定义AI";
    this.updateUI();
    if (moduleObj.onLoad) {
      try {
        moduleObj.onLoad(this.buildContext());
      } catch (e) {
        console.error("[AI] onLoad 出错:", e);
      }
    }
  },

  // 从本地文件加载 AI 脚本
  async loadFromFile(file) {
    const text = await file.text();

    // 方式1：ES 模块（export default）
    try {
      const blob = new Blob([text], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      let mod = null;
      try {
        mod = await import(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      const obj = (mod && mod.default) || (mod && mod.__AI__);
      if (obj && typeof obj.decide === "function") {
        this.loadAI(obj);
        return this.aiName;
      }
    } catch (e) {
      // 模块方式失败，回退到普通脚本方式
    }

    // 方式2：普通脚本，要求定义 window.__AI__
    delete window.__AI__;
    try {
      (0, eval)(text);
    } catch (e) {
      throw new Error("脚本解析失败：" + e.message);
    }
    const obj = window.__AI__;
    if (!obj || typeof obj.decide !== "function") {
      throw new Error(
        "未找到有效 AI 对象：请使用 `export default {...}` 或定义 `window.__AI__ = {...}`",
      );
    }
    this.loadAI(obj);
    return this.aiName;
  },

  setDefault(ai) {
    this.ai = ai || DefaultAI;
    this.aiName = this.ai.name || "内置AI";
    this.updateUI();
  },

  // ---------------- 主循环 ----------------

  update(dt) {
    if (!this.enabled || state !== "playing" || !this.ai) return;

    const ctx = this.buildContext();
    if (!ctx.player) {
      this.clearKeys();
      return;
    }

    let action = {};
    try {
      action = this.ai.decide(ctx, dt) || {};
    } catch (e) {
      console.error("[AI] decide() 抛出异常，已自动停用:", e);
      this.enabled = false;
      this.clearKeys();
      this.updateUI();
      return;
    }
    this.applyAction(action);
  },

  // 将 AI 返回的动作写入按键
  applyAction(action) {
    keys.up = !!action.up;
    keys.down = !!action.down;
    keys.left = !!action.left;
    keys.right = !!action.right;
    keys.fire = !!action.fire;
    keys.mine = !!action.mine;
  },

  clearKeys() {
    keys.up = keys.down = keys.left = keys.right = keys.fire = keys.mine = false;
  },

  notifyDeath(reason) {
    if (!this.enabled || !this.ai || !this.ai.onDeath) return;
    try {
      this.ai.onDeath(this.buildContext(), reason);
    } catch (e) {
      console.error("[AI] onDeath 出错:", e);
    }
  },

  updateUI() {
    const b = document.getElementById("btn-ai");
    if (b) {
      b.textContent = this.enabled
        ? "🤖 " + this.aiName + ": 开"
        : "🤖 " + this.aiName + ": 关";
    }
    const st = document.getElementById("ai-status");
    if (st) st.textContent = "当前AI：" + this.aiName;
  },

  // ---------------- 游戏状态沙箱（给外部 AI 的只读上下文） ----------------

  buildContext() {
    const ctx = {
      // 地图常量
      CELL,
      COLS,
      ROWS,
      W,
      H,
      DIRS: {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      },
      TILE: { EMPTY, WALL, GATE, BORDER, CRACK, GRASS },

      // 游戏即时信息
      state,
      score,
      gtMs,

      player:
        player && player.alive
          ? {
              x: player.x,
              y: player.y,
              w: player.w,
              h: player.h,
              dirName: player.dirName,
              dir: { x: player.dir.x, y: player.dir.y },
              hp: player.hp,
              maxHp: player.maxHp,
              shieldT: player.shieldT,
              fireT: player.fireT,
              speedT: player.speedT,
              spreadT: player.spreadT,
              drones: player.drones,
              mines: player.mines,
              inGrass: isInGrass(player),
            }
          : null,

      enemies: tanks
        .filter((t) => t.alive && !t.isPlayer)
        .map((t) => ({
          id: t.id,
          x: t.x,
          y: t.y,
          w: t.w,
          h: t.h,
          dirName: t.dirName,
          dir: { x: t.dir.x, y: t.dir.y },
          hp: t.hp,
          maxHp: t.maxHp,
          inGrass: isInGrass(t),
        })),

      bullets: bullets
        .filter((b) => !b.dead)
        .map((b) => ({
          x: b.x,
          y: b.y,
          vx: b.dx || 0,
          vy: b.dy || 0,
          owner: b.owner,
          dmg: b.dmg,
          bounced: b.bounced,
        })),

      items: items
        .filter((it) => !it.dead)
        .map((it) => ({
          x: it.x,
          y: it.y,
          type: it.def.id,
          name: it.def.name,
          age: it.age,
          life: it.life,
        })),

      mines: mines.filter((m) => !m.dead).map((m) => ({ x: m.x, y: m.y })),

      drones: drones.map((d) => ({ x: d.x, y: d.y, hp: d.hp })),

      boss:
        boss && boss.alive
          ? {
              x: boss.x,
              y: boss.y,
              w: boss.w,
              h: boss.h,
              dirName: boss.dirName,
              dir: { x: boss.dir.x, y: boss.dir.y },
              hp: boss.hp,
              maxHp: boss.maxHp,
            }
          : null,

      gates: gates.map((g) => ({
        cells: g.cells.map((c) => ({ column: c.c, row: c.r })),
        partnerCells: g.partner
          ? g.partner.cells.map((c) => ({ column: c.c, row: c.r }))
          : [],
      })),

      enemiesInGrass: tanks
        .filter((t) => t.alive && !t.isPlayer && isInGrass(t))
        .map((t) => t.id),

      // 工具方法
      cellOf: (x, y) => cellOf(x, y),
      centerOf: (c, r) => centerOf(c, r),
      distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
      mapAt: (column, row) => {
        if (row < 0 || row >= ROWS || column < 0 || column >= COLS)
          return BORDER;
        return map[row][column];
      },
      crackHpAt: (column, row) => {
        if (row < 0 || row >= ROWS || column < 0 || column >= COLS) return 0;
        return crackHp[column + "," + row] || 0;
      },
      isObstacle: (column, row) => {
        if (row < 0 || row >= ROWS || column < 0 || column >= COLS) return true;
        const v = map[row][column];
        return v === WALL || v === BORDER || v === CRACK;
      },
      isPathClear: (x1, y1, x2, y2) => DefaultAI.isPathClear(x1, y1, x2, y2),
      isBlocked: (dir) => DefaultAI.isBlocked(dir),
      getFreeDistance: (dir) => DefaultAI.getFreeDistance(dir),
    };
    return ctx;
  },
};

// ====================== 内置 AI（默认，权重决策系统） ======================
// 它是接口的一个完整参考实现。

const DefaultAI = {
  name: "内置AI",

  thinkInterval: 100,
  lastThink: 0,

  moveDir: null,

  dodging: false,
  dodgeDir: null,
  dodgeTimer: 0,

  lastBlockedDir: null,
  blockedTimer: 0,

  weights: {
    kill: 0.9,
    item: 0.3,
    survival: 0.7,
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

  // ====================== 接口入口 ======================

  decide(ctx, dt) {
    if (!ctx.player) {
      this.clearKeys();
      return {};
    }

    if (this.blockedTimer > 0) {
      this.blockedTimer -= dt;
      if (this.blockedTimer <= 0) {
        this.lastBlockedDir = null;
      }
    }

    if (this.dodging) {
      this.handleDodge(dt);
      return this.readKeys();
    }

    const now = performance.now();
    if (now - this.lastThink < this.thinkInterval) {
      this.executeMove();
      return this.readKeys();
    }
    this.lastThink = now;

    const playerPos = GameUtils.getPlayerPosition();
    const enemiesList = GameUtils.getEnemyPositions();
    const bulletsList = GameUtils.getBulletPositions();
    const itemsList = GameUtils.getItemPositions();

    if (!playerPos || !player.alive) {
      this.clearKeys();
      return {};
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
        this.executeMove();
        return this.readKeys();
      }
    }

    let target;
    let selectedAction;

    if (survivalWeight > 80) {
      target = this.findSafePosition(px, py, enemiesList, bulletsList);
      selectedAction = "survival";
    } else if (enemiesList.length > 0) {
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

    return this.readKeys();
  },

  readKeys() {
    return {
      up: keys.up,
      down: keys.down,
      left: keys.left,
      right: keys.right,
      fire: keys.fire,
      mine: keys.mine,
    };
  },

  clearKeys() {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    keys.fire = false;
    keys.mine = false;
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
      this.moveDir = primaryDir;
      this.lastBlockedDir = null;
      return;
    }

    for (const alt of secondaryDirs) {
      if (this.lastBlockedDir === alt && this.blockedTimer > 0) continue;
      if (!this.isBlocked(alt)) {
        this.moveDir = alt;
        return;
      }
    }

    this.moveDir = this.getBestEscapeDir();
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
      score += Math.random() * 5;

      if (score > maxScore) {
        maxScore = score;
        best = dir;
      }
    }

    if (best) return best;

    if (this.tryShootDestructibleWall()) {
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

    for (const e of enemies) {
      const ex = e.x + 15;
      const ey = e.y + 15;

      const sameRow = Math.abs(py - ey) < CELL;
      const sameCol = Math.abs(px - ex) < CELL;

      if (sameRow || sameCol) {
        if (this.isPathClear(px, py, ex, ey)) {
          if (!this.isFacingTarget(px, py, ex, ey, player.dir)) {
            this.turnToTarget(px, py, ex, ey);
          }
          keys.fire = true;
          return;
        }
      }
    }
    keys.fire = false;
  },

  turnToTarget(px, py, tx, ty) {
    const dx = tx - px;
    const dy = ty - py;

    if (Math.abs(dx) > Math.abs(dy)) {
      player.dir = dx > 0 ? DIRS.right : DIRS.left;
    } else {
      player.dir = dy > 0 ? DIRS.down : DIRS.up;
    }
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

// ====================== 默认启用内置 AI ======================
AIPlayer.setDefault(DefaultAI);