import {
  genMap,
  makeTank,
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
  spawnExplosion,
  addFloat,
  sfx,
  drawMap,
  drawItems,
  drawBullets,
  drawGrassOverlay,
  drawParticles,
  drawFloats,
  cellOf,
  centerOf,
  gateAt,
  spawnRandomItem,
} from "../../TankGame/script/base.js";
import { reactive } from "vue";
import { aiTanks, gameState } from "./gameState.js";
import { setBattleCtx, drawBattle } from "./draw.js";
import { clearAllAITanks, importAIFiles } from "./aiManager.js";

function makeSpawnPoints(count) {
  const rows = [1, Math.floor(ROWS / 3), Math.floor((2 * ROWS) / 3), ROWS - 2];
  const cols = [1, Math.floor(COLS / 3), Math.floor((2 * COLS) / 3), COLS - 2];
  const rows8 = [1, 4, 8, 12, ROWS - 12, ROWS - 8, ROWS - 4, ROWS - 2];
  const cols8 = [1, 4, 8, 12, COLS - 12, COLS - 8, COLS - 4, COLS - 2];
  if (count <= 4) {
    return rows.flatMap((r) => cols.map((c) => ({ c, r })));
  }
  return rows8.flatMap((r) => cols8.map((c) => ({ c, r })));
}

const SPAWN_POINTS = makeSpawnPoints(8);

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getSpawnPoints(count) {
  const shuffled = shuffleArray(SPAWN_POINTS);
  const result = [];
  const usedRows = new Set();
  const usedCols = new Set();
  for (const p of shuffled) {
    if (result.length >= count) break;
    if (usedRows.has(p.r) || usedCols.has(p.c)) continue;
    result.push(p);
    usedRows.add(p.r);
    usedCols.add(p.c);
  }
  return result;
}

export function initBattleGame(canvasEl) {
  const canvas = canvasEl;
  canvas.width = W;
  canvas.height = H;
  window.canvas = canvas;
  window.ctx = canvas.getContext("2d");
  setBattleCtx(window.ctx);
  window.battleOvPause = document.getElementById("ov-pause");

  genMap();

  const spawnPoints = getSpawnPoints(aiTanks.value.length);

  aiTanks.value.forEach((ai, i) => {
    const sp = spawnPoints[i];
    const x = sp.c * CELL + 3;
    const y = sp.r * CELL + 3;
    const tank = makeTank(x, y, "down", false);
    tank.color = ai.color;
    tank.aiName = ai.name;
    tank.isAI = true;
    tank.aiModule = ai.aiModule;
    tank.teamId = i;
    tank.hp = 3;
    tank.maxHp = 3;
    tank.speed = 70 + Math.random() * 30;
    tank._aiRef = ai;
    ai.tank = reactive(tank);
    ai.kills = 0;
    ai.deaths = 0;
    window.tanks.push(tank);
  });

  window.bullets = [];
  window.items = [];
  window.mines = [];
  window.drones = [];
  window.particles = [];
  window.floats = [];
  window.itemSpawnTimer = 3;
  window.state = "start";
  gameState.value = "start";
  updateBattleHud();

  setupControls();

  window.addEventListener("resize", fitCanvas);
  fitCanvas();
  document.addEventListener("fullscreenchange", fitCanvas);
  document.addEventListener("webkitfullscreenchange", fitCanvas);

  document.addEventListener("keydown", (e) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
        e.code,
      )
    )
      e.preventDefault();
  });

  window.battleLastTime = performance.now();
  window.gameLoopId = requestAnimationFrame(battleLoop);

  if (aiTanks.value.length === 0) {
    const ovStart = document.getElementById("ov-start");
    if (ovStart) ovStart.classList.remove("hidden");
    drawBattle();
  }
}

function setupControls() {
  const btnRestart = document.getElementById("btn-restart");
  const btnRestart2 = document.getElementById("btn-restart2");
  const btnPause = document.getElementById("btn-pause");
  const btnResume = document.getElementById("btn-resume");
  const btnImport = document.getElementById("btn-import-ai");
  const btnClear = document.getElementById("btn-clear-all");
  const fileInputMulti = document.getElementById("ai-file-multi");
  const btnSpeed = document.getElementById("btn-speed");
  const btnFullscreen = document.getElementById("btn-fullscreen");

  if (btnRestart) btnRestart.addEventListener("click", startBattle);
  if (btnRestart2) btnRestart2.addEventListener("click", startBattle);
  if (btnPause) btnPause.addEventListener("click", toggleBattlePause);
  if (btnResume) btnResume.addEventListener("click", toggleBattlePause);
  if (btnImport)
    btnImport.addEventListener("click", () => fileInputMulti.click());
  if (btnClear) btnClear.addEventListener("click", clearAllAITanks);

  if (fileInputMulti) {
    fileInputMulti.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        importAIFiles(e.target.files);
      }
      e.target.value = "";
    });
  }

  const SPEEDS = [1, 2, 4, 8];
  let speedIdx = 0;
  if (btnSpeed) {
    btnSpeed.textContent = `⏩ ${SPEEDS[speedIdx]}x`;
    btnSpeed.addEventListener("click", () => {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      window.gameSpeed = SPEEDS[speedIdx];
      btnSpeed.textContent = `⏩ ${SPEEDS[speedIdx]}x`;
    });
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", () => {
      const reqFs = document.documentElement.requestFullscreen;
      const webkitReqFs = document.documentElement.webkitRequestFullscreen;
      const exitFs = document.exitFullscreen;
      const webkitExitFs = document.webkitExitFullscreen;
      if (!document.fullscreenElement) {
        (reqFs || webkitReqFs).call(document.documentElement);
      } else {
        (exitFs || webkitExitFs)();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      if (window.state === "start") {
        startBattle();
        e.preventDefault();
      }
    } else if (e.key.toLowerCase() === "p") {
      if (window.state === "playing" || window.state === "paused") {
        toggleBattlePause();
      }
    } else if (e.key.toLowerCase() === "r") {
      startBattle();
    } else if (e.key.toLowerCase() === "f") {
      if (btnFullscreen) btnFullscreen.click();
    } else if (e.key >= "1" && e.key <= "8") {
      const si = ["1", "2", "4", "8"].indexOf(e.key);
      if (si >= 0) {
        window.gameSpeed = [1, 2, 4, 8][si];
        if (btnSpeed) btnSpeed.textContent = `⏩ ${window.gameSpeed}x`;
      }
    }
  });
}

function fitCanvas() {
  const pad = 10;
  let availW = window.innerWidth - 320 - pad;
  let availH = window.innerHeight - pad;
  const scale = Math.min(availW / W, availH / H);
  const canvas = document.getElementById("game");
  if (canvas) {
    canvas.style.width = Math.round(W * scale) + "px";
    canvas.style.height = Math.round(H * scale) + "px";
  }
}

export function startBattle() {
  if (aiTanks.value.length < 2) {
    alert("请至少导入 2 个 AI 才能开始对决");
    return;
  }
  const importBtn = document.getElementById("btn-import-ai");
  if (importBtn) importBtn.disabled = true;
  const clearBtn = document.getElementById("btn-clear-all");
  if (clearBtn) clearBtn.disabled = true;

  window.tanks.splice(0, window.tanks.length);
  window.bullets.splice(0, window.bullets.length);
  window.items.splice(0, window.items.length);
  window.mines.splice(0, window.mines.length);
  window.drones.splice(0, window.drones.length);
  window.particles.splice(0, window.particles.length);
  window.floats.splice(0, window.floats.length);
  genMap();

  const spawnPoints = getSpawnPoints(aiTanks.value.length);

  aiTanks.value.forEach((ai, i) => {
    const sp = spawnPoints[i];
    const x = sp.c * CELL + 3;
    const y = sp.r * CELL + 3;
    const tank = makeTank(x, y, "down", false);
    tank.color = ai.color;
    tank.aiName = ai.name;
    tank.isAI = true;
    tank.aiModule = ai.aiModule;
    tank.teamId = i;
    tank.hp = 3;
    tank.maxHp = 3;
    tank.speed = 70 + Math.random() * 30;
    tank._aiRef = ai;
    ai.tank = reactive(tank);
    ai.kills = 0;
    ai.deaths = 0;
    window.tanks.push(tank);
  });

  window.boss = null;
  window.lastBossKills = 0;
  window.lastTeleport = {};
  window.state = "playing";

  const ovStart = document.getElementById("ov-start");
  if (ovStart) ovStart.classList.add("hidden");
  const ovOver = document.getElementById("ov-over");
  if (ovOver) ovOver.classList.add("hidden");
  if (window.battleOvPause) window.battleOvPause.classList.add("hidden");

  window.battleLastTime = performance.now();
}

export function toggleBattlePause() {
  if (window.state === "playing") {
    window.state = "paused";
    gameState.value = "paused";
    if (window.battleOvPause) window.battleOvPause.classList.remove("hidden");
  } else if (window.state === "paused") {
    window.state = "playing";
    gameState.value = "playing";
    if (window.battleOvPause) window.battleOvPause.classList.add("hidden");
    window.battleLastTime = performance.now();
  }
}

export function battleLoop(ts) {
  const dt = Math.min(0.033, (ts - window.battleLastTime) / 1000 || 0.016);
  window.battleLastTime = ts;

  if (window.state === "playing" && aiTanks.value.length > 0) {
    updateBattle(dt * (window.gameSpeed || 1));
  }

  drawBattle();
  window.gameLoopId = requestAnimationFrame(battleLoop);
}

export function updateBattle(dt) {
  window.gtMs += dt * 1000;

  if (!window.itemSpawnTimer) window.itemSpawnTimer = 3;
  window.itemSpawnTimer -= dt;
  if (window.itemSpawnTimer <= 0 && window.items.length < 4) {
    spawnRandomItem();
    window.itemSpawnTimer = 3.5 + Math.random() * 3;
  }

  for (const ai of aiTanks.value) {
    if (!ai.tank || !ai.tank.alive) continue;
    const ctx = buildBattleContext(ai);
    ctx.selfTeamId = ai.tank.teamId;
    const action = ai.aiModule.decide(ctx, dt);
    applyBattleAction(ai.tank, action);
  }

  for (const t of window.tanks) {
    if (!t.alive) continue;
    moveBattleTank(t, dt);
    battleFire(t, dt);
  }

  updateBattleBullets(dt);
  checkBulletCollisions();
  checkTankCollisions();
  checkItemPickup();

  for (const p of window.particles) {
    p.life += dt * 1000;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
  }
  window.particles = window.particles.filter((p) => p.life < p.max);
  for (const f of window.floats) {
    f.life += dt * 1000;
    f.y -= 0.6;
  }
  window.floats = window.floats.filter((f) => f.life < f.max);

  checkBattleEnd();
  updateBattleHud();
}

export function moveBattleTank(t, dt) {
  let dx = 0,
    dy = 0;
  if (t.moveUp) dy -= 1;
  if (t.moveDown) dy += 1;
  if (t.moveLeft) dx -= 1;
  if (t.moveRight) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const sp = t.speed * dt;
    const nx = t.x + dx * sp;
    const ny = t.y + dy * sp;
    if (!isBlocked(nx, t.y, t.w, t.h, t)) t.x = nx;
    if (!isBlocked(t.x, ny, t.w, t.h, t)) t.y = ny;
  }

  t.dir = { x: dx, y: dy };
  t.dirName = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
  if (t.invincible > 0) t.invincible -= dt * 1000;
  if (t.fireCd > 0) t.fireCd -= dt;

  if (dx !== 0 || dy !== 0) {
    const cx = t.x + t.w / 2,
      cy = t.y + t.h / 2;
    const g = gateAt(cellOf(cx, cy).c, cellOf(cx, cy).r);
    const partner = g && g.partner;
    if (partner && (window.lastTeleport[t.id] || 0) + 1000 < window.gtMs) {
      const cen = centerOf(partner.cells[0].c, partner.cells[0].r);
      t.x = cen.x - t.w / 2;
      t.y = cen.y - t.h / 2;
      window.lastTeleport[t.id] = window.gtMs;
      spawnExplosion(cen.x, cen.y, 20, "#58a6ff");
      addFloat(cen.x, cen.y - 18, "传送", "#58a6ff");
      sfx("tp");
    }
  }
}

function isBlocked(x, y, w, h, self) {
  const c1 = Math.max(0, Math.floor(x / CELL));
  const c2 = Math.min(COLS - 1, Math.floor((x + w - 1) / CELL));
  const r1 = Math.max(0, Math.floor(y / CELL));
  const r2 = Math.min(ROWS - 1, Math.floor((y + h - 1) / CELL));
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const v = window.map[r][c];
      if (v === WALL || v === BORDER || v === CRACK) return true;
    }
  }
  for (const o of window.tanks) {
    if (!o.alive || o === self) continue;
    if (o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y)
      return true;
  }
  return false;
}

function battleFire(t, dt) {
  if (!t.fire || t.fireCd > 0) return;
  const base = t.fireT > window.gtMs ? 0.16 : 0.34;
  t.fireCd = base;
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const ang = Math.atan2(t.dir.y, t.dir.x);
  const fx = cx + t.dir.x * (t.w / 2);
  const fy = cy + t.dir.y * (t.h / 2);

  if (t.spreadT > window.gtMs) {
    for (let i = -1; i <= 1; i++) {
      window.bullets.push({
        x: fx,
        y: fy,
        dx: Math.cos(ang + i * 0.18) * 210,
        dy: Math.sin(ang + i * 0.18) * 210,
        speed: 210,
        owner: t,
        dmg: 1,
        dead: false,
        bounced: false,
        teleported: false,
      });
    }
  } else {
    window.bullets.push({
      x: fx,
      y: fy,
      dx: Math.cos(ang) * 210,
      dy: Math.sin(ang) * 210,
      speed: 210,
      owner: t,
      dmg: 1,
      dead: false,
      bounced: false,
      teleported: false,
    });
  }
  sfx("shoot");
}

function updateBattleBullets(dt) {
  for (const b of window.bullets) {
    if (b.dead) continue;
    const prevC = Math.floor(b.x / CELL);
    const prevR = Math.floor(b.y / CELL);
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    const cc = { c: Math.floor(b.x / CELL), r: Math.floor(b.y / CELL) };
    if (cc.r < 0 || cc.r >= ROWS || cc.c < 0 || cc.c >= COLS) {
      if (!b.bounced) {
        b.bounced = true;
        if (cc.r < 0) {
          b.dy = -b.dy;
          b.y = prevR * CELL + CELL;
        } else if (cc.r >= ROWS) {
          b.dy = -b.dy;
          b.y = prevR * CELL;
        }
        if (cc.c < 0) {
          b.dx = -b.dx;
          b.x = prevC * CELL + CELL;
        } else if (cc.c >= COLS) {
          b.dx = -b.dx;
          b.x = prevC * CELL;
        }
        sfx("bounce");
      } else {
        b.dead = true;
      }
      continue;
    }
    const tile = window.map[cc.r][cc.c];
    if (tile === GATE) {
      if (!b.teleported) {
        const g = gateAt(cc.c, cc.r);
        const partner = g && g.partner;
        if (partner) {
          const pc = partner.cells[0];
          const dir = { x: b.dx / b.speed, y: b.dy / b.speed };
          let tx, ty;
          if (dir.y !== 0) {
            tx = pc.c * CELL + CELL / 2;
            ty = pc.r * CELL + (dir.y < 0 ? -4 : CELL + 1);
          } else {
            tx = pc.c * CELL + (dir.x < 0 ? -4 : CELL + 1);
            ty = pc.r * CELL + CELL / 2;
          }
          b.x = tx;
          b.y = ty;
          b.teleported = true;
          sfx("tp");
        }
      } else {
        b.dead = true;
      }
    } else if (tile === BORDER || tile === WALL) {
      if (!b.bounced) {
        b.bounced = true;
        const prevTile = window.map[prevR] && window.map[prevR][prevC];
        const wasInside = prevTile !== BORDER && prevTile !== WALL;
        if (wasInside) {
          if (prevC !== cc.c) {
            b.dx = -b.dx;
            b.x = prevC * CELL + (cc.c > prevC ? CELL - 1 : 1);
          } else {
            b.dy = -b.dy;
            b.y = prevR * CELL + (cc.r > prevR ? CELL - 1 : 1);
          }
        } else {
          b.dx = -b.dx;
          b.dy = -b.dy;
        }
        sfx("bounce");
      } else {
        b.dead = true;
      }
    } else if (tile === CRACK) {
      b.dead = true;
      if (window.crackHp[`${cc.c},${cc.r}`]) {
        window.crackHp[`${cc.c},${cc.r}`] -= b.dmg || 1;
        if (window.crackHp[`${cc.c},${cc.r}`] <= 0) {
          delete window.crackHp[`${cc.c},${cc.r}`];
          window.map[cc.r][cc.c] = EMPTY;
          spawnExplosion(
            cc.c * CELL + CELL / 2,
            cc.r * CELL + CELL / 2,
            24,
            "#9aa0b0",
          );
          sfx("boom");
        }
      }
    }
  }
  window.bullets = window.bullets.filter((b) => !b.dead);
}

export function buildBattleContext(ai) {
  const ownTank = ai.tank;
  if (!ownTank || !ownTank.alive) {
    return {
      CELL,
      COLS,
      ROWS,
      W,
      H,
      DIRS,
      TILE: { EMPTY, WALL, GATE, BORDER, CRACK, GRASS },
      state: window.state,
      kills: window.kills,
      gtMs: window.gtMs,
      player: null,
      enemies: window.tanks
        .filter((t) => t.alive && t.teamId !== ownTank.teamId)
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
          color: t.color,
          isAI: t.isAI,
        })),
      bullets: window.bullets
        .filter((b) => !b.dead)
        .map((b) => ({
          x: b.x,
          y: b.y,
          dir: { x: b.dx || 0, y: b.dy || 0 },
          speed: b.speed || 210,
          owner: b.owner && b.owner.teamId,
          dmg: b.dmg,
          teleported: b.teleported,
          bounced: b.bounced,
        })),
      items: window.items
        .filter((it) => !it.dead)
        .map((it) => ({
          x: it.x,
          y: it.y,
          type: it.def.id,
          name: it.def.name,
        })),
      mines: window.mines
        .filter((m) => !m.dead)
        .map((m) => ({ x: m.x, y: m.y })),
      map: window.map,
      cellOf: (x, y) => ({ c: Math.floor(x / CELL), r: Math.floor(y / CELL) }),
      distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
      mapAt: (c, r) =>
        r < 0 || r >= ROWS || c < 0 || c >= COLS ? BORDER : window.map[r][c],
      isObstacle: (c, r) => {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
        const v = window.map[r][c];
        return v === WALL || v === BORDER || v === CRACK;
      },
      isEnemyBullet: (bullet) => bullet.owner !== ownTank.teamId,
      isPathClear(x1, y1, x2, y2) {
        if (y1 === y2) {
          const lo = Math.min(Math.floor(x1 / CELL), Math.floor(x2 / CELL));
          const hi = Math.max(Math.floor(x1 / CELL), Math.floor(x2 / CELL));
          for (let c = lo; c <= hi; c++) {
            const v = window.map[Math.floor(y1 / CELL)][c];
            if (v === WALL || v === BORDER || v === CRACK) return false;
          }
          return true;
        }
        if (x1 === x2) {
          const lo = Math.min(Math.floor(y1 / CELL), Math.floor(y2 / CELL));
          const hi = Math.max(Math.floor(y1 / CELL), Math.floor(y2 / CELL));
          for (let r = lo; r <= hi; r++) {
            const v = window.map[r][Math.floor(x1 / CELL)];
            if (v === WALL || v === BORDER || v === CRACK) return false;
          }
          return true;
        }
        return false;
      },
      isBlocked(dir) {
        if (!ownTank) return true;
        const px = ownTank.x + ownTank.w / 2;
        const py = ownTank.y + ownTank.h / 2;
        const nx = px + (dir.x || 0) * CELL;
        const ny = py + (dir.y || 0) * CELL;
        const w = ownTank.w || 20,
          h = ownTank.h || 20;
        const c1 = Math.max(0, Math.floor(nx / CELL));
        const c2 = Math.min(COLS - 1, Math.floor((nx + w - 1) / CELL));
        const r1 = Math.max(0, Math.floor(ny / CELL));
        const r2 = Math.min(ROWS - 1, Math.floor((ny + h - 1) / CELL));
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            const v = window.map[r] ? window.map[r][c] : BORDER;
            if (v === WALL || v === BORDER || v === CRACK) return true;
          }
        }
        for (const t of window.tanks) {
          if (!t.alive || t.id === ownTank.id) continue;
          if (nx < t.x + t.w && nx + w > t.x && ny < t.y + t.h && ny + h > t.y)
            return true;
        }
        return false;
      },
      getFreeDistance(dir) {
        if (!ownTank) return 0;
        const w = ownTank.w || 20,
          h = ownTank.h || 20;
        let px = ownTank.x + w / 2,
          py = ownTank.y + h / 2;
        let dist = 0;
        const step = Math.max(4, Math.floor(CELL / 4));
        while (dist < 300) {
          dist += step;
          const nx = px + (dir.x || 0) * dist;
          const ny = py + (dir.y || 0) * dist;
          const c1 = Math.max(0, Math.floor(nx / CELL));
          const c2 = Math.min(COLS - 1, Math.floor((nx + w - 1) / CELL));
          const r1 = Math.max(0, Math.floor(ny / CELL));
          const r2 = Math.min(ROWS - 1, Math.floor((ny + h - 1) / CELL));
          let blocked = false;
          for (let r = r1; r <= r2 && !blocked; r++)
            for (let c = c1; c <= c2 && !blocked; c++) {
              const v = window.map[r] ? window.map[r][c] : BORDER;
              if (v === WALL || v === BORDER || v === CRACK) blocked = true;
            }
          if (blocked) break;
        }
        return dist;
      },
      utils: {
        getEnemyBullets(frames = 1, dt = 0.016) {
          const teamId = ownTank.teamId;
          return window.bullets
            .filter((b) => !b.dead && (b.owner && b.owner.teamId) !== teamId)
            .map((b) => {
              const speed = b.speed || 140;
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
        isPositionOccupied(x, y, excludeTankId) {
          for (const t of window.tanks) {
            if (!t.alive || t.id === excludeTankId || t.id === ownTank.id)
              continue;
            if (
              x < t.x + t.w &&
              x + CELL > t.x &&
              y < t.y + t.h &&
              y + CELL > t.y
            ) {
              return true;
            }
          }
          return false;
        },
      },
    };
  }

  return {
    CELL,
    COLS,
    ROWS,
    W,
    H,
    DIRS,
    TILE: { EMPTY, WALL, GATE, BORDER, CRACK, GRASS },
    state: window.state,
    kills: window.kills,
    gtMs: window.gtMs,
    player: {
      x: ownTank.x,
      y: ownTank.y,
      w: ownTank.w,
      h: ownTank.h,
      dirName: ownTank.dirName,
      dir: { x: ownTank.dir.x, y: ownTank.dir.y },
      hp: ownTank.hp,
      maxHp: ownTank.maxHp,
      shieldT: ownTank.shieldT,
      fireT: ownTank.fireT,
      speedT: ownTank.speedT,
      spreadT: ownTank.spreadT,
      drones: ownTank.drones,
      mines: ownTank.mines,
    },
    enemies: window.tanks
      .filter((t) => t.alive && t.teamId !== ownTank.teamId)
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
        color: t.color,
        isAI: t.isAI,
      })),
    bullets: window.bullets
      .filter((b) => !b.dead)
      .map((b) => ({
        x: b.x,
        y: b.y,
        dir: { x: b.dx || 0, y: b.dy || 0 },
        speed: b.speed || 210,
        owner: b.owner && b.owner.teamId,
        dmg: b.dmg,
        bounced: b.bounced,
        teleported: b.teleported,
      })),
    items: window.items
      .filter((it) => !it.dead)
      .map((it) => ({
        x: it.x,
        y: it.y,
        type: it.def.id,
        name: it.def.name,
        age: it.age,
        life: it.life,
      })),
    mines: window.mines.filter((m) => !m.dead).map((m) => ({ x: m.x, y: m.y })),
    drones: window.drones.map((d) => ({ x: d.x, y: d.y, hp: d.hp })),
    boss:
      window.boss && window.boss.alive
        ? {
            x: window.boss.x,
            y: window.boss.y,
            w: window.boss.w,
            h: window.boss.h,
            dirName: window.boss.dirName,
            dir: { x: window.boss.dir.x, y: window.boss.dir.y },
            speed: window.boss.speed,
            hp: window.boss.hp,
            maxHp: window.boss.maxHp,
          }
        : null,
    gates: window.gates.map((g) => ({
      cells: g.cells.map((c) => ({ column: c.c, row: c.r })),
      partnerCells: g.partner
        ? g.partner.cells.map((c) => ({ column: c.c, row: c.r }))
        : [],
    })),
    map: window.map,
    cellOf: (x, y) => ({ c: Math.floor(x / CELL), r: Math.floor(y / CELL) }),
    centerOf: (c, r) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }),
    distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    mapAt: (c, r) =>
      r < 0 || r >= ROWS || c < 0 || c >= COLS ? BORDER : window.map[r][c],
    crackHpAt: (c, r) => window.crackHp[`${c},${r}`] || 0,
    isObstacle: (c, r) => {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
      const v = window.map[r][c];
      return v === WALL || v === BORDER || v === CRACK;
    },
    isEnemyBullet: (bullet) => bullet.owner !== ownTank.teamId,
    isPathClear(x1, y1, x2, y2) {
      if (y1 === y2) {
        const lo = Math.min(Math.floor(x1 / CELL), Math.floor(x2 / CELL));
        const hi = Math.max(Math.floor(x1 / CELL), Math.floor(x2 / CELL));
        for (let c = lo; c <= hi; c++) {
          const v = window.map[Math.floor(y1 / CELL)][c];
          if (v === WALL || v === BORDER || v === CRACK) return false;
        }
        return true;
      }
      if (x1 === x2) {
        const lo = Math.min(Math.floor(y1 / CELL), Math.floor(y2 / CELL));
        const hi = Math.max(Math.floor(y1 / CELL), Math.floor(y2 / CELL));
        for (let r = lo; r <= hi; r++) {
          const v = window.map[r][Math.floor(x1 / CELL)];
          if (v === WALL || v === BORDER || v === CRACK) return false;
        }
        return true;
      }
      return false;
    },
    isBlocked(dir) {
      if (!ownTank) return true;
      const px = ownTank.x + ownTank.w / 2;
      const py = ownTank.y + ownTank.h / 2;
      const nx = px + (dir.x || 0) * CELL;
      const ny = py + (dir.y || 0) * CELL;
      const w = ownTank.w || 20,
        h = ownTank.h || 20;
      const c1 = Math.max(0, Math.floor(nx / CELL));
      const c2 = Math.min(COLS - 1, Math.floor((nx + w - 1) / CELL));
      const r1 = Math.max(0, Math.floor(ny / CELL));
      const r2 = Math.min(ROWS - 1, Math.floor((ny + h - 1) / CELL));
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const v = window.map[r] ? window.map[r][c] : BORDER;
          if (v === WALL || v === BORDER || v === CRACK) return true;
        }
      }
      for (const t of window.tanks) {
        if (!t.alive || t.id === ownTank.id) continue;
        if (nx < t.x + t.w && nx + w > t.x && ny < t.y + t.h && ny + h > t.y)
          return true;
      }
      return false;
    },
    getFreeDistance(dir) {
      if (!ownTank) return 0;
      const w = ownTank.w || 20,
        h = ownTank.h || 20;
      let px = ownTank.x + w / 2,
        py = ownTank.y + h / 2;
      let dist = 0;
      const step = Math.max(4, Math.floor(CELL / 4));
      while (dist < 300) {
        dist += step;
        const nx = px + (dir.x || 0) * dist;
        const ny = py + (dir.y || 0) * dist;
        const c1 = Math.max(0, Math.floor(nx / CELL));
        const c2 = Math.min(COLS - 1, Math.floor((nx + w - 1) / CELL));
        const r1 = Math.max(0, Math.floor(ny / CELL));
        const r2 = Math.min(ROWS - 1, Math.floor((ny + h - 1) / CELL));
        let blocked = false;
        for (let r = r1; r <= r2 && !blocked; r++)
          for (let c = c1; c <= c2 && !blocked; c++) {
            const v = window.map[r] ? window.map[r][c] : BORDER;
            if (v === WALL || v === BORDER || v === CRACK) blocked = true;
          }
        if (blocked) break;
      }
      return dist;
    },
    utils: {
      getEnemyBullets(frames = 1, dt = 0.016) {
        const teamId = ownTank.teamId;
        return window.bullets
          .filter((b) => !b.dead && (b.owner && b.owner.teamId) !== teamId)
          .map((b) => {
            const speed = b.speed || 140;
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
      isPositionOccupied(x, y, excludeTankId) {
        for (const t of window.tanks) {
          if (!t.alive || t.id === excludeTankId || t.id === ownTank.id)
            continue;
          if (
            x < t.x + t.w &&
            x + CELL > t.x &&
            y < t.y + t.h &&
            y + CELL > t.y
          ) {
            return true;
          }
        }
        return false;
      },
    },
  };
}

export function applyBattleAction(tank, action) {
  if (!action) return;
  tank.moveUp = !!action.up;
  tank.moveDown = !!action.down;
  tank.moveLeft = !!action.left;
  tank.moveRight = !!action.right;
  tank.fire = !!action.fire;
  tank.mine = !!action.mine;
}

function checkItemPickup() {
  for (const t of window.tanks) {
    if (!t.alive) continue;
    for (const it of window.items) {
      if (it.dead) continue;
      if (
        t.x < it.x + (it.w || it.size || 22) &&
        t.x + t.w > it.x &&
        t.y < it.y + (it.h || it.size || 22) &&
        t.y + t.h > it.y
      ) {
        applyItemToTank(it, t);
        it.dead = true;
      }
    }
  }
  window.items = window.items.filter((it) => !it.dead);
}

function applyItemToTank(it, tank) {
  const now = window.gtMs;
  sfx("pickup");
  addFloat(it.x + CELL / 2, it.y - 8, it.def.name + " UP", it.def.color);
  spawnExplosion(it.x + CELL / 2, it.y + CELL / 2, 20, it.def.color);
  switch (it.def.id) {
    case "drone":
      if (tank.drones < (it.def.max || 5)) {
        tank.drones++;
        window.drones.push({
          x: tank.x,
          y: tank.y - 20,
          w: 20,
          h: 20,
          hp: 3,
          fireCd: 0.5,
          age: 0,
        });
      }
      break;
    case "spread":
      tank.spreadT = now + itemTimer("spread");
      break;
    case "fire":
      tank.fireT = now + itemTimer("fire");
      break;
    case "speed":
      tank.speedT = now + itemTimer("speed");
      break;
    case "shield":
      tank.shieldT = now + itemTimer("shield");
      break;
    case "mine":
      tank.mines += 3;
      break;
    case "heal":
      if (tank.hp < tank.maxHp) {
        tank.hp++;
        sfx("pickup");
      }
      break;
  }
}

function itemTimer(itemId) {
  if (itemId === "drone") return 0;
  if (itemId === "mine") return 0;
  if (itemId === "spread") return 18000;
  return 9000;
}

function checkBulletCollisions() {
  for (const b of window.bullets) {
    if (b.dead) continue;
    for (const t of window.tanks) {
      if (!t.alive) continue;
      if (b.owner && b.owner.teamId === t.teamId) continue;
      if (b.x > t.x && b.x < t.x + t.w && b.y > t.y && b.y < t.y + t.h) {
        t.hp -= b.dmg || 1;
        b.dead = true;
        spawnExplosion(b.x, b.y, 12, "#ff9f43");
        sfx("hit");

        if (t.hp <= 0 && t.alive) {
          t.alive = false;
          const dyingAI = t._aiRef;
          const killerAI = b.owner && b.owner._aiRef ? b.owner._aiRef : null;
          if (killerAI) killerAI.kills++;
          if (dyingAI) dyingAI.deaths++;
          spawnExplosion(
            t.x + t.w / 2,
            t.y + t.h / 2,
            34,
            t.color || "#ff8a5a",
          );
          sfx("boom");
          addFloat(t.x + t.w / 2, t.y, `+1 击杀`, "#ffd76e");
        }
      }
    }
  }
}

function checkTankCollisions() {
  for (let i = 0; i < window.tanks.length; i++) {
    for (let j = i + 1; j < window.tanks.length; j++) {
      const a = window.tanks[i],
        b = window.tanks[j];
      if (!a.alive || !b.alive) continue;
      if (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      ) {
        const dx = a.x + a.w / 2 - (b.x + b.w / 2);
        const dy = a.y + a.h / 2 - (b.y + b.h / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const push = 2;
        if (a.moveRight && !b.moveLeft) {
          a.x += push;
          b.x -= push;
        }
        if (a.moveLeft && !b.moveRight) {
          a.x -= push;
          b.x += push;
        }
        if (a.moveDown && !b.moveUp) {
          a.y += push;
          b.y -= push;
        }
        if (a.moveUp && !b.moveDown) {
          a.y -= push;
          b.y += push;
        }
      }
    }
  }
}

export function checkBattleEnd() {
  const aliveTanks = window.tanks.filter((t) => t.alive);
  if (aliveTanks.length <= 1) {
    window.state = "over";
    gameState.value = "over";
    const winner = aliveTanks[0];
    const winnerAI = winner?._aiRef || null;

    const winnerText = winnerAI ? `🏆 胜利者：${winnerAI.name}！` : "平局！";
    const winnerEl = document.getElementById("ov-over-winner");
    if (winnerEl) winnerEl.textContent = winnerText;

    const stats = aiTanks.value
      .map((ai) => `${ai.name}: ${ai.kills}杀`)
      .join("　");
    const statsEl = document.getElementById("ov-over-stats");
    if (statsEl) statsEl.textContent = stats;
    const ovOver = document.getElementById("ov-over");
    if (ovOver) ovOver.classList.remove("hidden");

    const importBtn = document.getElementById("btn-import-ai");
    if (importBtn) importBtn.disabled = false;
    const clearBtn = document.getElementById("btn-clear-all");
    if (clearBtn) clearBtn.disabled = false;
  }
}

export function updateBattleHud() {
  const alive = window.tanks.filter((t) => t.alive).length;
  const el = document.getElementById("hud-alive");
  if (el) el.textContent = alive;
  const sc = document.getElementById("hud-score");
  if (sc) sc.textContent = aiTanks.value.reduce((sum, ai) => sum + ai.kills, 0);

  const mins = Math.floor(window.gtMs / 60000);
  const secs = Math.floor((window.gtMs % 60000) / 1000);
  const te = document.getElementById("hud-time");
  if (te) te.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
}
