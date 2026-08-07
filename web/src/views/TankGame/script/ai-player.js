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

import { GameUtils, isInGrass } from "./utils.js";
import { AILogger } from "./ai-logger.js";
import DefaultAI from "./ai-tanker/default-tank.js";
import {
  keys,
  CELL,
  COLS,
  ROWS,
  W,
  H,
  DIRS,
  EMPTY,
  WALL,
  GATE,
  BORDER,
  CRACK,
  GRASS,
  cellOf,
  centerOf,
} from "./base.js";

// ---------------- 本地实现的路径/判定工具（不依赖 DefaultAI） ----------------
const ctxCellOf = (x, y) => ({
  c: Math.floor(x / CELL),
  r: Math.floor(y / CELL),
});
const ctxBlocked = (v) => v !== EMPTY && v !== GRASS;

function ctxIsPathClear(x1, y1, x2, y2) {
  const s = ctxCellOf(x1, y1);
  const e = ctxCellOf(x2, y2);
  if (s.r === e.r) {
    for (let c = Math.min(s.c, e.c) + 1; c < Math.max(s.c, e.c); c++) {
      if (ctxBlocked(map[s.r][c])) return false;
    }
    return true;
  }
  if (s.c === e.c) {
    for (let r = Math.min(s.r, e.r) + 1; r < Math.max(s.r, e.r); r++) {
      if (ctxBlocked(map[r][s.c])) return false;
    }
    return true;
  }
  return false;
}

function ctxIsBlocked(dir) {
  if (!player) return true;
  const c = ctxCellOf(player.x + player.w / 2, player.y + player.h / 2);
  const nc = c.c + (dir.x || 0);
  const nr = c.r + (dir.y || 0);
  const v = map[nr] ? map[nr][nc] : BORDER;
  return ctxBlocked(v);
}

function ctxGetFreeDistance(dir) {
  if (!player) return 0;
  const s = ctxCellOf(player.x + player.w / 2, player.y + player.h / 2);
  let c = s.c + (dir.x || 0);
  let r = s.r + (dir.y || 0);
  let dist = 0;
  while (map[r] && (map[r][c] === EMPTY || map[r][c] === GRASS)) {
    dist += CELL;
    c += dir.x || 0;
    r += dir.y || 0;
  }
  return dist;
}

export const AIPlayer = {
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
      isPathClear: (x1, y1, x2, y2) => ctxIsPathClear(x1, y1, x2, y2),
      isBlocked: (dir) => ctxIsBlocked(dir),
      getFreeDistance: (dir) => ctxGetFreeDistance(dir),
    };
    return ctx;
  },
};
