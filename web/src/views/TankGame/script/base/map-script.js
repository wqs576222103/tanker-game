import { COLS, ROWS } from "./constants.js";

const VALID_TILE_MIN = 0;
const VALID_TILE_MAX = 12;
const VALID_ITEMS = ["drone", "spread", "fire", "speed", "shield", "mine", "heal", "bounce"];

/**
 * 解析地图脚本源码，返回配置对象
 * 支持 ES Module export default 和 window.__MAP__ 两种格式
 */
export async function parseMapScript(source) {
  // 策略1: ES Module
  try {
    const blob = new Blob([source], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    let mod;
    try {
      mod = await import(/* @vite-ignore */ url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const obj = (mod && mod.default) || (mod && mod.__MAP__);
    if (obj && obj.map) return obj;
  } catch (_) {
    // 非 ES Module，继续尝试全局变量
  }

  // 策略2: 全局变量
  try {
    delete window.__MAP__;
    (0, eval)(source);
    const obj = window.__MAP__;
    delete window.__MAP__;
    if (obj && obj.map) return obj;
  } catch (_) {
    // 忽略
  }

  throw new Error("未找到有效的地图配置对象，请确保脚本导出 default 或设置 window.__MAP__");
}

/**
 * 校验地图配置合法性
 * 返回 { valid: true } 或 { valid: false, message: string }
 */
export function validateMapConfig(config) {
  if (!config || typeof config !== "object") {
    return { valid: false, message: "配置必须是一个对象" };
  }

  if (!Array.isArray(config.map)) {
    return { valid: false, message: "map 必须是一个二维数组" };
  }

  if (config.map.length !== ROWS) {
    return { valid: false, message: `map 必须有 ${ROWS} 行，当前为 ${config.map.length} 行` };
  }

  for (let r = 0; r < ROWS; r++) {
    if (!Array.isArray(config.map[r])) {
      return { valid: false, message: `第 ${r} 行不是数组` };
    }
    if (config.map[r].length !== COLS) {
      return { valid: false, message: `第 ${r} 行必须有 ${COLS} 列，当前为 ${config.map[r].length} 列` };
    }
    for (let c = 0; c < COLS; c++) {
      const v = config.map[r][c];
      if (typeof v !== "number" || !Number.isInteger(v)) {
        return { valid: false, message: `map[${r}][${c}] 必须是整数，当前值: ${v}` };
      }
      if (v < VALID_TILE_MIN || v > VALID_TILE_MAX) {
        return { valid: false, message: `map[${r}][${c}] 值 ${v} 超出范围 (${VALID_TILE_MIN}-${VALID_TILE_MAX})` };
      }
    }
  }

  // 校验 playerSpawn
  if (config.playerSpawn) {
    const ps = config.playerSpawn;
    if (typeof ps.c !== "number" || typeof ps.r !== "number") {
      return { valid: false, message: "playerSpawn 必须包含 c 和 r 属性" };
    }
    if (ps.c < 0 || ps.c >= COLS || ps.r < 0 || ps.r >= ROWS) {
      return { valid: false, message: `playerSpawn 坐标越界 (${ps.c},${ps.r})` };
    }
  }

  // 校验 enemySpawns
  if (config.enemySpawns) {
    if (!Array.isArray(config.enemySpawns)) {
      return { valid: false, message: "enemySpawns 必须是数组" };
    }
    for (let i = 0; i < config.enemySpawns.length; i++) {
      const es = config.enemySpawns[i];
      if (typeof es.c !== "number" || typeof es.r !== "number") {
        return { valid: false, message: `enemySpawns[${i}] 必须包含 c 和 r 属性` };
      }
      if (es.c < 0 || es.c >= COLS || es.r < 0 || es.r >= ROWS) {
        return { valid: false, message: `enemySpawns[${i}] 坐标越界 (${es.c},${es.r})` };
      }
    }
  }

  // 校验 gates
  if (config.gates) {
    if (!Array.isArray(config.gates)) {
      return { valid: false, message: "gates 必须是数组" };
    }
    for (let i = 0; i < config.gates.length; i++) {
      const g = config.gates[i];
      if (!g.cells || !Array.isArray(g.cells) || !g.partnerCells || !Array.isArray(g.partnerCells)) {
        return { valid: false, message: `gates[${i}] 必须包含 cells 和 partnerCells 数组` };
      }
    }
  }

  // 校验 items
  if (config.items) {
    if (!Array.isArray(config.items)) {
      return { valid: false, message: "items 必须是数组" };
    }
    for (let i = 0; i < config.items.length; i++) {
      const it = config.items[i];
      if (typeof it.c !== "number" || typeof it.r !== "number") {
        return { valid: false, message: `items[${i}] 必须包含 c 和 r 属性` };
      }
      if (!VALID_ITEMS.includes(it.type)) {
        return { valid: false, message: `items[${i}] 类型 "${it.type}" 无效，可用类型: ${VALID_ITEMS.join(", ")}` };
      }
      if (it.c < 0 || it.c >= COLS || it.r < 0 || it.r >= ROWS) {
        return { valid: false, message: `items[${i}] 坐标越界 (${it.c},${it.r})` };
      }
    }
  }

  // 校验 crackHp
  if (config.crackHp) {
    if (typeof config.crackHp !== "object" || Array.isArray(config.crackHp)) {
      return { valid: false, message: "crackHp 必须是一个对象" };
    }
  }

  // 校验 initialEnemies
  if (config.initialEnemies !== undefined) {
    if (typeof config.initialEnemies !== "number" || config.initialEnemies < 1 || config.initialEnemies > 20) {
      return { valid: false, message: "initialEnemies 必须是 1-20 之间的数字" };
    }
  }

  return { valid: true };
}
