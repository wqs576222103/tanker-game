import { CELL, COLS, ROWS, EMPTY, WALL, GATE, BORDER, CRACK, GRASS, PLAYER_SPAWN, ENEMY_SPAWNS } from "./constants.js";
import { spawnExplosion } from "./effects.js";
import { sfx } from "./audio.js";

// ====================== 地图 ======================
export function cellOf(x, y) {
  return { c: Math.floor(x / CELL), r: Math.floor(y / CELL) };
}
export function centerOf(c, r) {
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}
export function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function genMap() {
  for (let attempt = 0; attempt < 40; attempt++) {
    window.map = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push(
          c === 0 || c === COLS - 1 || r === 0 || r === ROWS - 1
            ? BORDER
            : EMPTY,
        );
      }
      window.map.push(row);
    }
    placeRandomWalls();
    placeGrass();
    if (connectivityOk()) break;
  }
  placeGates();
  window.gates = window.gates;
  window.crackHp = window.crackHp;
}

export function protectedKey(c, r) {
  return c + "," + r;
}

export function isProtectedCell(c, r) {
  if (r >= 1 && r <= 2 && c >= 1 && c <= COLS - 2) return true;
  if (c >= 4 && c <= 6 && r >= 14 && r <= 16) return true;
  if (
    c >= PLAYER_SPAWN.c &&
    c <= PLAYER_SPAWN.c &&
    r >= PLAYER_SPAWN.r &&
    r <= PLAYER_SPAWN.r
  )
    return true;
  if (c >= 20 && c <= 24 && r >= 26 && r <= 28) return true;
  if (c >= 1 && c <= 3 && r >= 3 && r <= 4) return true;
  if (c >= COLS - 3 && c <= COLS - 2 && r >= 3 && r <= 4) return true;
  if (c >= 1 && c <= 3 && r >= 13 && r <= 16) return true;
  if (c >= COLS - 4 && c <= COLS - 2 && r >= 13 && r <= 16) return true;
  return false;
}

export function placeGrass() {
  for (let i = 0; i < 16; i++) {
    let c = randInt(2, COLS - 3),
      r = randInt(3, ROWS - 3);
    const len = 2 + randInt(0, 3);
    for (let j = 0; j < len; j++) {
      if (window.map[r] && window.map[r][c] === EMPTY && !isProtectedCell(c, r))
        window.map[r][c] = GRASS;
      const next = Math.random();
      if (next < 0.4) c++;
      else if (next < 0.7) c--;
      else if (next < 0.85) r++;
      else r--;
      if (c < 1 || c > COLS - 2 || r < 1 || r > ROWS - 2) break;
    }
  }
}

export function placeRandomWalls() {
  const protectedCells = new Set();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (isProtectedCell(c, r)) protectedCells.add(protectedKey(c, r));

  const verticalSplit = Math.random() < 0.5;
  const divider = randInt(18, 22);
  const typeOf = (c, r) => {
    const inBrickZone = verticalSplit ? c <= divider : r <= divider;
    if (inBrickZone && Math.random() < 0.6) return CRACK;
    return inBrickZone ? WALL : CRACK;
  };

  const setWall = (c, r) => {
    if (!window.map[r] || window.map[r][c] === undefined) return;
    if (window.map[r][c] !== EMPTY) return;
    if (protectedCells.has(protectedKey(c, r))) return;
    window.map[r][c] = typeOf(c, r);
  };

  for (let i = 0; i < 14; i++) {
    let c = randInt(2, COLS - 3),
      r = randInt(3, ROWS - 3);
    if (protectedCells.has(protectedKey(c, r))) continue;
    const len = 2 + randInt(0, 3);
    for (let j = 0; j < len; j++) {
      setWall(c, r);
      const next = Math.random();
      if (next < 0.4) c++;
      else if (next < 0.7) c--;
      else if (next < 0.85) r++;
      else r--;
      if (c < 1 || c > COLS - 2 || r < 1 || r > ROWS - 2) break;
    }
  }
  for (let i = 0; i < 16; i++)
    setWall(randInt(2, COLS - 3), randInt(3, ROWS - 3));
  for (let i = 0; i < 2; i++) {
    const horizontal = Math.random() < 0.5;
    const c0 = randInt(2, COLS - 5),
      r0 = randInt(3, ROWS - 3);
    const len = 3 + randInt(0, 3);
    for (let j = 0; j < len; j++) {
      const c = horizontal ? c0 + j : c0;
      const r = horizontal ? r0 : r0 + j;
      setWall(c, r);
      if (!horizontal && r > ROWS - 3) break;
      if (horizontal && c > COLS - 3) break;
    }
  }
  window.crackHp = {};
  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++) {
      if (window.map[r][c] === CRACK) window.crackHp[protectedKey(c, r)] = 2 + randInt(0, 1);
    }
}

export function connectivityOk() {
  const pass = (c, r) =>
    window.map[r] &&
    window.map[r][c] !== undefined &&
    (window.map[r][c] === EMPTY || window.map[r][c] === GATE || window.map[r][c] === GRASS);
  const start = { c: PLAYER_SPAWN.c, r: PLAYER_SPAWN.r };
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const n = queue.pop();
    const k = protectedKey(n.c, n.r);
    if (seen.has(k)) continue;
    seen.add(k);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nn = { c: n.c + dc, r: n.r + dr };
      if (pass(nn.c, nn.r) && !seen.has(protectedKey(nn.c, nn.r)))
        queue.push(nn);
    }
  }
  return ENEMY_SPAWNS.every((t) => seen.has(protectedKey(t.c, t.r)));
}

export function placeGates() {
  if (window.tutorialGateBlock) { window.gates = []; return; }
  window.gates = [];
  const mkGate = (c1, r1, c2, r2, pair) => {
    const g = { cells: [], partner: null, pair };
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++) {
        window.map[r][c] = GATE;
        g.cells.push({ c, r });
      }
    window.gates.push(g);
    return g;
  };
  const gA = mkGate(1, 14, 1, 14, "h"),
    gB = mkGate(COLS - 2, 14, COLS - 2, 14, "h");
  const gC = mkGate(Math.floor(COLS / 2), 1, Math.floor(COLS / 2), 1, "v"),
    gD = mkGate(Math.floor(COLS / 2), 28, Math.floor(COLS / 2), 28, "v");
  gA.partner = gB;
  gB.partner = gA;
  gC.partner = gD;
  gD.partner = gC;
}

export function gateAt(c, r) {
  for (const g of window.gates)
    for (const cell of g.cells) if (cell.c === c && cell.r === r) return g;
  return null;
}

export function damageCrack(c, r, dmg) {
  if (!window.map[r] || window.map[r][c] !== CRACK) return;
  const k = protectedKey(c, r);
  window.crackHp[k] = (window.crackHp[k] || 1) - dmg;
  const cx = c * CELL + CELL / 2,
    cy = r * CELL + CELL / 2;
  spawnExplosion(cx, cy, 10, "#c9a35a");
  if (window.crackHp[k] <= 0) {
    window.map[r][c] = EMPTY;
    delete window.crackHp[k];
    spawnExplosion(cx, cy, 24, "#9aa0b0");
    sfx("boom");
  } else {
    sfx("hit");
  }
}
