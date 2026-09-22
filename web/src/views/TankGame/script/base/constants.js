import playerSvg from "@/assets/player.svg";
import enemySvg from "@/assets/enemy.svg";
import bossSvg from "@/assets/enemy-boss.svg";
import dogSvg from "@/assets/cat.svg";

// ====================== 基础 ======================
export const CELL = 20,
  COLS = 45,
  ROWS = 30;
export const W = COLS * CELL,
  H = ROWS * CELL;
window.canvas = null;
window.ctx = null;
export function initCanvas() {
  window.canvas = document.getElementById("game");
  window.canvas.width = W;
  window.canvas.height = H;
  window.ctx = window.canvas.getContext("2d");
}

export const playerImg = new Image();
playerImg.src = playerSvg;
export const enemyImg = new Image();
enemyImg.src = enemySvg;

export const bossImg = new Image();
bossImg.src = bossSvg;

export const dogImg = new Image();
dogImg.src = dogSvg;

export const EMPTY = 0,
  WALL = 1,
  GATE = 2,
  BORDER = 3,
  CRACK = 4,
  GRASS = 5,
  SPEED = 6,
  SPIKE = 7,
  DOOR = 9,
  SWITCH = 10,
  PORTAL = 11,
  CRATE = 12;
export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export const DIR_NAMES = ["up", "left", "down", "right"];

export const PLAYER_SPAWN = { c: 22, r: 20 };
export const ENEMY_SPAWNS = [
  { c: 1, r: 1 },
  { c: COLS - 2, r: 1 },
];

export const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
  mine: false,
};
