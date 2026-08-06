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
//     onLoad(ctx)       { },          // 可选：脚本被加载/启用时调用
//     onRoundStart(ctx) { },          // 可选：每局开始时调用
//     decide(ctx, dt) {               // 必选：每帧调用，返回本帧要执行的按键
//       return {
//         up: bool, down: bool, left: bool, right: bool,
//         fire: true,                 // 持续按住=连续射击（有内置冷却）
//         mine: false,
//       };
//     },
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
    keys.up =
      keys.down =
      keys.left =
      keys.right =
      keys.fire =
      keys.mine =
        false;
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
          speed: t.speed,
          hp: t.hp,
          maxHp: t.maxHp,
          inGrass: isInGrass(t),
        })),

      bullets: bullets
        .filter((b) => !b.dead)
        .map((b) => ({
          x: b.x,
          y: b.y,
          dir: { x: b.dx || 0, y: b.dy || 0 },
          vx: b.dx || 0,
          vy: b.dy || 0,
          speed: b.speed || 210,
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
              speed: boss.speed,
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
      utils: GameUtils,
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

// ====================== 内置 AI（默认，猎手式自动玩家） ======================
//
// 决策优先级（从高到低）：
//   1. 躲避敌方坦克正面撞击 + 躲避敌方子弹（最高优先级）
//   2. 主动进攻：移动到「最近的可直线射击且不会被正面撞击」的站位，
//      转向敌方并持续射击（子弹无限，一直开火）
//   3. 无敌人时拾取道具（散弹 ✨、无人机 🚁 优先，仍低于回避子弹/碰撞）
//   4. 漫游

const DefaultAI = {
  name: "猎手AI",

  // ---- 参数 ----
  thinkInterval: 90, // 站位/寻路节流（毫秒）
  lastThink: 0,
  ramDanger: 55, // 敌方中心距 <= 此值 => 立即逃跑（无论朝向，防撞击）
  ramThreatRange: 120, // 敌方正在朝我推进 => 预测撞击威胁，提前规避
  shootMinCells: 5, // 与敌方保持的最小格子距离（防止被贴脸撞击）
  shootMaxCells: 11, // 最大有效射击距离（格子数）
  bulletLookahead: 1.2, // 子弹躲避提前量（秒）
  bulletSpeed: 210, // 敌方子弹速度（像素/秒）
  dodgePredict: 0.85, // 躲避时预测自身/子弹未来位置的时长（秒）
  lowHpRatio: 0.5, // 血线比例 <= 此值 => 视为残血，生命道具权重提升（仍低于回避子弹/碰撞）
  lowHpRange: 420, // 残血时拾取生命道具的最远触发范围（像素）
  criticalHpRatio: 0.25, // 血线比例 <= 此值 => 定义为濒死，可全图去捡生命道具

  // ---- 运行时状态 ----
  moveDir: { x: 0, y: 0 },
  posTarget: null, // 当前选定的射击站位 {x,y}
  turnTarget: null, // 当前朝向的目标 {x,y}
  mode: "idle", // escape | dodge | combat | item | roam
  roamDir: { x: 0, y: 0 },
  roamTimer: 0,

  cardinals: [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ],

  decide(ctx, dt) {
    if (!ctx.player) return { fire: true };
    const p = ctx.player;
    const px = p.x + p.w / 2,
      py = p.y + p.h / 2;

    // ---------- 1) 预测并躲避敌方子弹：最高优先级，每帧检测 ----------
    const threat = this.findLiveThreat(ctx, px, py);
    if (threat) {
      this.mode = "dodge";
      this.posTarget = null;
      const dir = this.dodgeDirection(ctx, px, py, threat);
      this.moveDir = dir || { x: 0, y: 0 };
      this.turnToward(px, py, threat.bx + threat.vx, threat.by + threat.vy);
      return this.keys(this.moveDir);
    }

    // ---------- 2) 避免敌方坦克碰撞（立即贴脸 + 预测其向前推进）：最高优先级 ----------
    const ram = this.findRammer(ctx, px, py);
    if (ram) {
      this.mode = "escape";
      this.posTarget = null;
      this.turnTarget = { x: ram.x, y: ram.y };
      const dir = this.escapeDirection(ctx, px, py, ram.x, ram.y);
      this.moveDir = dir;
      this.turnToward(px, py, ram.x, ram.y);
      return this.keys(dir);
    }

    // ---------- 3) 残血且有生命道具：优先拾取（仍低于躲避子弹/避免碰撞） ----------
    if (this.isLowHp(p) && ctx.items.length > 0) {
      const range = this.lowHpPickupRange(p);
      const heal = this.findItem(ctx, px, py, "heal", range);
      if (heal) {
        this.mode = "item";
        const dir = this.moveToward(ctx, px, py, heal.x, heal.y);
        this.moveDir = dir;
        const aim = this.nearestEnemy(px, py, ctx);
        if (aim) this.turnToward(px, py, aim.x, aim.y);
        return this.keys(dir);
      }
    }

    // ---------- 4) 此刻已对齐且直线畅通且安全（无墙/无传送门/无推进坦克）：站桩射击 ----------
    const lane = this.currentLane(ctx, px, py);
    if (lane) {
      this.mode = "combat";
      this.moveDir = { x: 0, y: 0 };
      this.turnTarget = { x: lane.ex, y: lane.ey };
      this.turnToward(px, py, lane.ex, lane.ey);
      return this.keys({ x: 0, y: 0 });
    }

    // 站位选择较为昂贵，做节流
    const now = performance.now();
    const doThink = now - this.lastThink > this.thinkInterval;
    if (doThink) this.lastThink = now;

    // ---------- 4) 主动进攻：子弹已能直线命中则原地射击，否则走位 ----------
    if (ctx.enemies.length > 0 || ctx.boss) {
      // 再次检查当前是否已可直线命中敌方坦克，若可则原地射击，不追击站位
      const curLane = this.currentLane(ctx, px, py);
      if (curLane) {
        this.mode = "combat";
        this.moveDir = { x: 0, y: 0 };
        this.turnTarget = { x: curLane.ex, y: curLane.ey };
        this.turnToward(px, py, curLane.ex, curLane.ey);
        return this.keys({ x: 0, y: 0 });
      }

      this.mode = "combat";

      let spot = this.posTarget;
      if (doThink) {
        spot = this.findShootPosition(ctx, px, py);
        this.posTarget = spot;
      }

      let aim;
      if (spot) {
        aim = { x: spot.ex, y: spot.ey };
      } else {
        aim = this.nearestEnemy(px, py, ctx) ||
          this.turnTarget || { x: px, y: py };
      }

      this.turnTarget = aim;
      this.turnToward(px, py, aim.x, aim.y);

      const target = spot ? { x: spot.x, y: spot.y } : aim;
      const dir = this.moveToward(ctx, px, py, target.x, target.y);
      this.moveDir = dir;
      return this.keys(dir);
    }

    // ---------- 5) 无敌人：拾取道具（散弹/生命优先） ----------
    if (ctx.items.length > 0) {
      this.mode = "item";
      const item = this.pickBestItem(ctx, px, py, p);
      const dir = this.moveToward(ctx, px, py, item.x, item.y);
      this.moveDir = dir;
      const aim = this.nearestEnemy(px, py, ctx);
      if (aim) this.turnToward(px, py, aim.x, aim.y);
      return this.keys(dir);
    }

    // ---------- 6) 漫游 ----------
    this.mode = "roam";
    const dir = this.roam(ctx, px, py);
    this.moveDir = dir;
    return this.keys(dir);
  },

  // 组装按键输出（子弹无限：总能开火）
  keys(dir) {
    return {
      up: dir && dir.y < 0,
      down: dir && dir.y > 0,
      left: dir && dir.x < 0,
      right: dir && dir.x > 0,
      fire: true,
      mine: false,
    };
  },

  // ====================== 威胁检测 ======================

  // 最近敌方中心的坐标
  nearestEnemy(px, py, ctx) {
    let best = null,
      bd = Infinity;
    const push = (x, y) => {
      const d = Math.hypot(x - px, y - py);
      if (d < bd) {
        bd = d;
        best = { x, y };
      }
    };
    for (const e of ctx.enemies) push(e.x + e.w / 2, e.y + e.h / 2);
    if (ctx.boss)
      push(ctx.boss.x + ctx.boss.w / 2, ctx.boss.y + ctx.boss.h / 2);
    return best;
  },

  // 贴脸敌人 + 预测敌方朝我推进（结合速度估算撞击时间）：视为撞击威胁
  findRammer(ctx, px, py) {
    const IMM = this.ramDanger;
    let best = null;
    let bestScore = -Infinity;

    const threat = (x, y, dir, spd) => {
      const dx = px - x,
        dy = py - y;
      const d = Math.hypot(dx, dy);

      // 已贴脸：无论朝向都算，越近越危险
      if (d < IMM) return 1e9 + (IMM - d);

      // 预测向前推进：敌方朝向与「指向玩家」方向的夹角越小越危险，
      // 并结合敌方速度估算「预计撞击剩余时间」，越快越危险
      if (d < this.ramThreatRange && dir && (dir.x || dir.y) && spd > 0) {
        const dl = Math.hypot(dir.x, dir.y);
        if (dl > 0) {
          const dot = (dir.x * dx + dir.y * dy) / (dl * d);
          if (dot > 0.55) {
            const closing = dot * spd; // 向我逼近的接近速度
            const eta = d / closing; // 预计撞击剩余时间（秒）
            return (
              this.ramThreatRange - d + dot * 20 + (42 - Math.min(eta, 42))
            );
          }
        }
      }
      return -1;
    };

    const push = (x, y, dir, spd) => {
      const s = threat(x, y, dir, spd);
      if (s > bestScore) {
        bestScore = s;
        best = { x, y };
      }
    };

    for (const e of ctx.enemies)
      push(e.x + e.w / 2, e.y + e.h / 2, e.dir, e.speed || 0);
    if (ctx.boss)
      push(
        ctx.boss.x + ctx.boss.w / 2,
        ctx.boss.y + ctx.boss.h / 2,
        ctx.boss.dir,
        ctx.boss.speed || 0,
      );

    return bestScore < 0 ? null : best;
  },

  // 预测敌方子弹是否会在提前量内擦到/命中坦克
  findLiveThreat(ctx, px, py) {
    let best = null;
    let bestTime = Infinity;
    const danger = 30; // 弹道与坦克中心的垂直容差（像素）
    const cw = ctx.player.w;

    for (const b of ctx.bullets) {
      if (b.owner === "player") continue;
      const vx = b.vx || 0,
        vy = b.vy || 0;
      const vlen = Math.hypot(vx, vy);
      if (vlen === 0) continue;
      const ux = vx / vlen,
        uy = vy / vlen;
      const bspd = b.speed || this.bulletSpeed; // 使用该子弹实际速度

      const bx = b.x + 3,
        by = b.y + 3;
      const dx = px - bx,
        dy = py - by;
      const dist = Math.hypot(dx, dy);
      if (dist > 420) continue;

      const along = dx * ux + dy * uy; // 沿弹道方向的分量（像素）
      if (along < -8) continue; // 已从坦克身边越过
      const perp = Math.abs(dx * uy - dy * ux); // 到弹道的垂直距离
      if (perp > danger + cw * 0.5) continue; // 会擦肩而过

      const reachT = along / bspd; // 命中剩余时间（秒）
      if (reachT <= this.bulletLookahead && reachT < bestTime) {
        bestTime = reachT;
        best = { bx, by, vx: ux * bspd, vy: uy * bspd, reachT };
      }
    }
    return best;
  },

  // 预测式躲避：模拟「自身沿某方向移动」与「所有敌方子弹飞行」，
  // 选出未来一段时间内与子弹保持最小距离最大的方向（尽量远离敌方子弹）。
  dodgeDirection(ctx, px, py, threat) {
    const TIME = this.dodgePredict;
    const spd = this.playerSpeed(ctx);
    const candidates = this.dodgeCandidates(threat);

    let best = null;
    let bestScore = -Infinity;
    for (const c of candidates) {
      if (c.x === 0 && c.y === 0) continue;
      if (!this.isClearDir(ctx, px, py, c)) continue;
      const score = this.minBulletClearance(ctx, px, py, c, spd, TIME);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best) return best;

    for (const c of this.cardinals) {
      if (this.isClearDir(ctx, px, py, c)) return c;
    }
    return this.getBestFreeDir(ctx, px, py);
  },

  // 候选躲避方向：优先垂直弹道横移，其次背向弹道后退
  dodgeCandidates(threat) {
    const angle = Math.atan2(threat.vy, threat.vx);
    const dirs = [
      { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) },
      { x: Math.cos(angle - Math.PI / 2), y: Math.sin(angle - Math.PI / 2) },
      { x: Math.cos(angle + Math.PI), y: Math.sin(angle + Math.PI) },
    ];
    return dirs.map((d) => this.nearestAxis(d));
  },

  // 沿 dir 方向匀速移动 time 秒时，与所有敌方子弹保持的最小距离（越小越危险）
  minBulletClearance(ctx, px, py, dir, spd, time) {
    let min = Infinity;
    const N = 6;
    for (const b of ctx.bullets) {
      if (b.owner === "player") continue;
      const vx = b.vx || 0,
        vy = b.vy || 0;
      const vlen = Math.hypot(vx, vy);
      if (vlen === 0) continue;
      const ux = vx / vlen,
        uy = vy / vlen;
      const bspd = b.speed || this.bulletSpeed; // 使用该子弹实际速度
      const bx = b.x + 3,
        by = b.y + 3;
      let localMin = Infinity;
      for (let k = 0; k <= N; k++) {
        const tt = (time / N) * k;
        const bxx = bx + ux * bspd * tt;
        const byy = by + uy * bspd * tt;
        const pxx = px + dir.x * spd * tt;
        const pyy = py + dir.y * spd * tt;
        const d = Math.hypot(bxx - pxx, byy - pyy);
        if (d < localMin) localMin = d;
      }
      if (localMin < min) min = localMin;
    }
    return min === Infinity ? 1e6 : min;
  },

  // 玩家当前实际移动速度（含移速道具加成）
  playerSpeed(ctx) {
    const spd = 150;
    if (ctx.player && ctx.player.speedT > ctx.gtMs) return spd * 1.4;
    return spd;
  },

  // 朝远离敌方的方向逃跑（选最开阔方向）
  escapeDirection(ctx, px, py, ex, ey) {
    const awayAngle = Math.atan2(py - ey, px - ex);
    const angles = [
      awayAngle,
      awayAngle + Math.PI / 4,
      awayAngle - Math.PI / 4,
      awayAngle + Math.PI / 2,
      awayAngle - Math.PI / 2,
    ];
    for (const a of angles) {
      const axis = this.nearestAxis({ x: Math.cos(a), y: Math.sin(a) });
      if (this.isClearDir(ctx, px, py, axis)) return axis;
    }
    for (const c of this.cardinals) {
      if (this.isClearDir(ctx, px, py, c)) return c;
    }
    return this.getBestFreeDir(ctx, px, py);
  },

  nearestAxis(d) {
    let best = { x: 0, y: 0 },
      bestS = 0;
    for (const c of this.cardinals) {
      const s = Math.abs(d.x * c.x + d.y * c.y);
      if (s > bestS) {
        bestS = s;
        best = c;
      }
    }
    return best;
  },

  // ====================== 射击站位 ======================

  // 当前是否已对齐某目标且直线畅通（中间无墙/无传送门）
  currentLane(ctx, px, py) {
    const mn = this.shootMinCells * ctx.CELL,
      mx = this.shootMaxCells * ctx.CELL;
    const push = (ex, ey) => {
      const dist = Math.hypot(ex - px, ey - py);
      if (dist < mn || dist > mx) return null;
      if (!this.isAligned(px, py, ex, ey)) return null;
      if (!this.isLaneClear(ctx, px, py, ex, ey)) return null;
      return { ex, ey };
    };
    for (const e of ctx.enemies) {
      const r = push(e.x + e.w / 2, e.y + e.h / 2);
      if (r) return r;
    }
    if (ctx.boss) {
      const r = push(ctx.boss.x + ctx.boss.w / 2, ctx.boss.y + ctx.boss.h / 2);
      if (r) return r;
    }
    return null;
  },

  // 找到最近的、可直线射击且不与敌方重叠的站位
  findShootPosition(ctx, px, py) {
    const CELL = ctx.CELL;
    const targets = [];
    for (const e of ctx.enemies) {
      const x = e.x + e.w / 2,
        y = e.y + e.h / 2;
      targets.push({ x, y, c: this.cell(x, y) });
    }
    if (ctx.boss) {
      const x = ctx.boss.x + ctx.boss.w / 2,
        y = ctx.boss.y + ctx.boss.h / 2;
      targets.push({ x, y, c: this.cell(x, y) });
    }

    const occ = new Set([this.cellKey(this.cell(px, py))]);
    for (const e of ctx.enemies)
      occ.add(this.cellKey(this.cell(e.x + e.w / 2, e.y + e.h / 2)));
    if (ctx.boss)
      occ.add(
        this.cellKey(
          this.cell(ctx.boss.x + ctx.boss.w / 2, ctx.boss.y + ctx.boss.h / 2),
        ),
      );

    let best = null;
    let bestScore = Infinity;

    for (const t of targets) {
      for (const d of this.cardinals) {
        for (let k = this.shootMinCells; k <= this.shootMaxCells; k++) {
          const c = t.c.c + d.x * k,
            r = t.c.r + d.y * k;
          if (c < 1 || c >= ctx.COLS - 1 || r < 1 || r >= ctx.ROWS - 1)
            continue;
          const v = ctx.mapAt(c, r);
          if (v !== ctx.TILE.EMPTY && v !== ctx.TILE.GRASS) continue;
          if (occ.has(c + "," + r)) continue;
          if (!this.isLaneClearCells(ctx, c, r, t.c.c, t.c.r)) continue;

          const cx = c * CELL + CELL / 2,
            cy = r * CELL + CELL / 2;
          // "最近"：优先离玩家近；k 较大略加分（更安全）
          const travel =
            Math.hypot(cx - px, cy - py) - (k - this.shootMinCells) * 12;
          if (travel < bestScore) {
            bestScore = travel;
            best = { x: cx, y: cy, ex: t.x, ey: t.y };
          }
        }
      }
    }
    return best;
  },

  // 是否有障碍/传送门遮挡直线
  isLaneClear(ctx, x1, y1, x2, y2) {
    const s = this.cell(x1, y1),
      e = this.cell(x2, y2);
    return this.isLaneClearCells(ctx, s.c, s.r, e.c, e.r);
  },

  isLaneClearCells(ctx, c1, r1, c2, r2) {
    const E = ctx.TILE.EMPTY,
      G = ctx.TILE.GRASS;
    if (r1 === r2) {
      const lo = Math.min(c1, c2),
        hi = Math.max(c1, c2);
      for (let c = lo + 1; c < hi; c++) {
        const v = ctx.mapAt(c, r1);
        if (v !== E && v !== G) return false;
      }
      return true;
    }
    if (c1 === c2) {
      const lo = Math.min(r1, r2),
        hi = Math.max(r1, r2);
      for (let r = lo + 1; r < hi; r++) {
        const v = ctx.mapAt(c1, r);
        if (v !== E && v !== G) return false;
      }
      return true;
    }
    return false;
  },

  isAligned(px, py, ex, ey) {
    const tol = 21; // 半个格子多一点的对齐容差
    return Math.abs(py - ey) < tol || Math.abs(px - ex) < tol;
  },

  // ====================== 道具选择 ======================

  // 是否残血（血线比例 <= lowHpRatio），残血时生命道具权重提升
  isLowHp(p) {
    return p.hp / p.maxHp <= this.lowHpRatio;
  },

  // 残血时拾取生命的最大触发范围：越残血范围越大，濒死（<= criticalHpRatio）可全图去捡
  lowHpPickupRange(p) {
    const ratio = p.hp / p.maxHp;
    if (ratio <= this.criticalHpRatio) return Infinity;
    return this.lowHpRange;
  },

  // 查找指定类型、距离最近（且在最远范围内）的道具
  findItem(ctx, px, py, type, maxRange) {
    let best = null,
      bestD = maxRange === undefined ? Infinity : maxRange;
    for (const it of ctx.items) {
      if (it.type !== type) continue;
      const ix = it.x + 15,
        iy = it.y + 15;
      const d = Math.hypot(ix - px, iy - py);
      if (d < bestD) {
        bestD = d;
        best = { x: ix, y: iy };
      }
    }
    return best;
  },

  pickBestItem(ctx, px, py, p) {
    let best = null,
      bestS = -1;
    const low = this.isLowHp(p);
    for (const it of ctx.items) {
      const ix = it.x + 15,
        iy = it.y + 15;
      const dist = Math.hypot(ix - px, iy - py);
      let type = 1.0; // 基础
      if (it.type === "spread")
        type = 5.0; // 散弹高优先（仍低于躲避子弹/避免碰撞）
      else if (it.type === "heal") {
        // 生命：残血时权重显著提升（超过散弹），且越残血越高
        if (low) type = p.hp / p.maxHp <= this.criticalHpRatio ? 5.5 : 4.5;
        else type = 2.0;
      } else if (it.type === "drone")
        type = 4.0; // 无人机高优先（仍低于躲避子弹/避免碰撞）
      else if (it.type === "shield") type = 1.5;
      const score = (300 - dist) * 0.1 + type * 25;
      if (score > bestS) {
        bestS = score;
        best = { x: ix, y: iy };
      }
    }
    return best || { x: px, y: py };
  },

  // ====================== 移动系统 ======================

  // 朝目标移动：优先 BFS 寻路，失败则贪心
  moveToward(ctx, px, py, tx, ty) {
    const s = this.cell(px, py),
      t = this.cell(tx, ty);
    const step = this.pathStep(ctx, s.c, s.r, t.c, t.r);
    if (step && (step.dc !== 0 || step.dr !== 0)) {
      return { x: step.dc, y: step.dr };
    }
    return this.greedyToward(ctx, px, py, tx, ty);
  },

  // 网格 BFS：返回从起点出发的第一步（避免撞墙、撞坦克、踩传送门）
  pathStep(ctx, sc, sr, tc, tr) {
    if (sc === tc && sr === tr) return null;
    const R = ctx.ROWS,
      C = ctx.COLS;

    const occ = new Set();
    for (const e of ctx.enemies)
      occ.add(this.cellKey(this.cell(e.x + e.w / 2, e.y + e.h / 2)));
    if (ctx.boss)
      occ.add(
        this.cellKey(
          this.cell(ctx.boss.x + ctx.boss.w / 2, ctx.boss.y + ctx.boss.h / 2),
        ),
      );

    const E = ctx.TILE.EMPTY,
      G = ctx.TILE.GRASS;
    const walk = (c, r) =>
      c >= 1 &&
      c < C - 1 &&
      r >= 1 &&
      r < R - 1 &&
      (ctx.mapAt(c, r) === E || ctx.mapAt(c, r) === G);

    const dirs = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    const q = [{ c: sc, r: sr }];
    const seen = new Set([sc + "," + sr]);
    const prev = new Map();
    let head = 0;

    while (head < q.length && seen.size < 3000) {
      const n = q[head++];
      if (n.c === tc && n.r === tr) {
        let cur = n,
          steps = [];
        while (prev.has(cur.c + "," + cur.r)) {
          steps.push(cur);
          cur = prev.get(cur.c + "," + cur.r);
        }
        const first = steps[steps.length - 1];
        return { dc: first.c - sc, dr: first.r - sr };
      }
      for (const [dc, dr] of dirs) {
        const nc = n.c + dc,
          nr = n.r + dr;
        const k = nc + "," + nr;
        if (seen.has(k) || occ.has(k)) continue;
        if (!walk(nc, nr)) continue;
        seen.add(k);
        prev.set(k, { c: n.c, r: n.r });
        q.push({ c: nc, r: nr });
      }
    }
    return null;
  },

  greedyToward(ctx, px, py, tx, ty) {
    const dx = tx - px,
      dy = ty - py;
    let primary, alts;
    if (Math.abs(dx) >= Math.abs(dy)) {
      primary = dx >= 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      alts =
        dy >= 0
          ? [
              { x: 0, y: 1 },
              { x: 0, y: -1 },
            ]
          : [
              { x: 0, y: -1 },
              { x: 0, y: 1 },
            ];
    } else {
      primary = dy >= 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      alts =
        dx >= 0
          ? [
              { x: 1, y: 0 },
              { x: -1, y: 0 },
            ]
          : [
              { x: -1, y: 0 },
              { x: 1, y: 0 },
            ];
    }
    if (this.isClearDir(ctx, px, py, primary)) return primary;
    for (const alt of alts) {
      if (this.isClearDir(ctx, px, py, alt)) return alt;
    }
    return this.getBestFreeDir(ctx, px, py);
  },

  // 该轴方向前方一格是否可通行（不撞墙/不撞坦克）
  isClearDir(ctx, px, py, d) {
    const pc = this.cell(px, py).c + d.x,
      pr = this.cell(px, py).r + d.y;
    const v = ctx.mapAt(pc, pr);
    if (v !== ctx.TILE.EMPTY && v !== ctx.TILE.GRASS) return false;
    for (const e of ctx.enemies) {
      const ec = this.cell(e.x + e.w / 2, e.y + e.h / 2);
      if (ec.c === pc && ec.r === pr) return false;
    }
    if (ctx.boss) {
      const bc = this.cell(
        ctx.boss.x + ctx.boss.w / 2,
        ctx.boss.y + ctx.boss.h / 2,
      );
      if (bc.c === pc && bc.r === pr) return false;
    }
    return true;
  },

  // 四个方向里自由距离最大的方向
  getBestFreeDir(ctx, px, py) {
    let best = null,
      bestN = -1;
    for (const c of this.cardinals) {
      if (!this.isClearDir(ctx, px, py, c)) continue;
      const n = this.freeDistCells(ctx, px, py, c);
      if (n > bestN) {
        bestN = n;
        best = c;
      }
    }
    return best || { x: 0, y: 0 };
  },

  // 该方向可直行的格子数
  freeDistCells(ctx, px, py, d) {
    const s = this.cell(px, py);
    let c = s.c + d.x,
      r = s.r + d.y,
      n = 0;
    const E = ctx.TILE.EMPTY,
      G = ctx.TILE.GRASS;
    while (ctx.mapAt(c, r) === E || ctx.mapAt(c, r) === G) {
      n++;
      c += d.x;
      r += d.y;
    }
    return n;
  },

  // 转向目标（设置玩家朝向，用于开火方向）
  turnToward(px, py, tx, ty) {
    if (!player) return;
    const dx = tx - px,
      dy = ty - py;
    if (Math.abs(dx) >= Math.abs(dy)) {
      player.dir = dx >= 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      player.dirName = dx >= 0 ? "right" : "left";
    } else {
      player.dir = dy >= 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      player.dirName = dy >= 0 ? "down" : "up";
    }
  },

  // 漫游：周期性换向，选开阔方向
  roam(ctx, px, py) {
    this.roamTimer -= 16;
    if (this.roamTimer <= 0) {
      const card =
        this.cardinals[Math.floor(Math.random() * this.cardinals.length)];
      this.roamDir = this.isClearDir(ctx, px, py, card)
        ? card
        : this.getBestFreeDir(ctx, px, py);
      this.roamTimer = 400 + Math.random() * 600;
    }
    if (this.isClearDir(ctx, px, py, this.roamDir)) return this.roamDir;
    return this.getBestFreeDir(ctx, px, py);
  },

  // ====================== 工具函数 ======================

  cell(x, y) {
    return { c: Math.floor(x / CELL), r: Math.floor(y / CELL) };
  },

  cellKey(cell) {
    return cell.c + "," + cell.r;
  },

  // ---------- ctx 工具接口（供 buildContext 给外部脚本使用） ----------

  isPathClear(x1, y1, x2, y2) {
    const s = this.cell(x1, y1),
      e = this.cell(x2, y2);
    const E = EMPTY,
      G = GRASS;
    if (s.r === e.r) {
      for (let c = Math.min(s.c, e.c) + 1; c < Math.max(s.c, e.c); c++) {
        const v = map[s.r][c];
        if (v !== E && v !== G) return false;
      }
      return true;
    }
    if (s.c === e.c) {
      for (let r = Math.min(s.r, e.r) + 1; r < Math.max(s.r, e.r); r++) {
        const v = map[r][s.c];
        if (v !== E && v !== G) return false;
      }
      return true;
    }
    return false;
  },

  isBlocked(dir) {
    if (!player) return true;
    const c = this.cell(player.x + player.w / 2, player.y + player.h / 2);
    const nc = c.c + (dir.x || 0),
      nr = c.r + (dir.y || 0);
    const v = map[nr] ? map[nr][nc] : BORDER;
    return v !== EMPTY && v !== GRASS;
  },

  getFreeDistance(dir) {
    if (!player) return 0;
    const s = this.cell(player.x + player.w / 2, player.y + player.h / 2);
    let c = s.c + (dir.x || 0),
      r = s.r + (dir.y || 0),
      dist = 0;
    while (map[r] && (map[r][c] === EMPTY || map[r][c] === GRASS)) {
      dist += CELL;
      c += dir.x || 0;
      r += dir.y || 0;
    }
    return dist;
  },
};

// ====================== 默认启用内置 AI ======================
AIPlayer.setDefault(DefaultAI);
