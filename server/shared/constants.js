const CELL = 20;
const COLS = 45;
const ROWS = 30;
const W = COLS * CELL;
const H = ROWS * CELL;

const EMPTY = 0;
const WALL = 1;
const GATE = 2;
const BORDER = 3;
const CRACK = 4;
const GRASS = 5;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const TANK_W = 20;
const TANK_H = 20;
const TANK_HP = 3;
const TANK_SPEED_MIN = 70;
const TANK_SPEED_MAX = 100;
const BULLET_SPEED = 210;
const FIRE_CD = 0.34;
const FIRE_CD_FAST = 0.16;
const ITEM_SPAWN_INTERVAL_MIN = 3.5;
const ITEM_SPAWN_INTERVAL_MAX = 6.5;
const MAX_ITEMS = 4;
const MAX_PLAYERS = 8;

const ITEM_DEFS = [
  { id: "drone", name: "无人机", color: "#4ecdc4", max: 5 },
  { id: "spread", name: "散弹", color: "#ff6b6b" },
  { id: "fire", name: "急速射击", color: "#ffa502" },
  { id: "speed", name: "加速", color: "#2ed573" },
  { id: "shield", name: "护盾", color: "#58a6ff" },
  { id: "mine", name: "地雷", color: "#a29bfe" },
  { id: "heal", name: "治疗", color: "#ff4757" },
];

module.exports = {
  CELL, COLS, ROWS, W, H,
  EMPTY, WALL, GATE, BORDER, CRACK, GRASS,
  DIRS, TANK_W, TANK_H, TANK_HP,
  TANK_SPEED_MIN, TANK_SPEED_MAX,
  BULLET_SPEED, FIRE_CD, FIRE_CD_FAST,
  ITEM_SPAWN_INTERVAL_MIN, ITEM_SPAWN_INTERVAL_MAX,
  MAX_ITEMS, MAX_PLAYERS, ITEM_DEFS,
};
