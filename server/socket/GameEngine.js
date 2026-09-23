const {
  CELL, COLS, ROWS, W, H,
  EMPTY, WALL, GATE, BORDER, CRACK, GRASS,
  DIRS, TANK_W, TANK_H, TANK_HP,
  TANK_SPEED_MIN, TANK_SPEED_MAX,
  BULLET_SPEED, FIRE_CD, FIRE_CD_FAST,
  ITEM_SPAWN_INTERVAL_MIN, ITEM_SPAWN_INTERVAL_MAX,
  MAX_ITEMS, ITEM_DEFS,
} = require("../shared/constants");

class GameEngine {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.tanks = [];
    this.bullets = [];
    this.items = [];
    this.mines = [];
    this.map = [];
    this.gates = [];
    this.crackHp = {};
    this.gtMs = 0;
    this.state = "countdown";
    this.itemSpawnTimer = 3;
    this.lastTick = Date.now();
    this._tickInterval = null;
    this._broadcastFn = null;
    this._endFn = null;

    this._genMap();
    this._initPlayers(players);
  }

  _initPlayers(players) {
    const spawnPoints = this._getSpawnPoints(players.length);
    players.forEach((p, i) => {
      const sp = spawnPoints[i];
      const valid = this._findValidSpawnCell(sp.c, sp.r);
      const x = valid.c * CELL;
      const y = valid.r * CELL;
      const speed = TANK_SPEED_MIN + Math.random() * (TANK_SPEED_MAX - TANK_SPEED_MIN);

      this.tanks.push({
        id: p.socketId,
        x, y,
        w: TANK_W, h: TANK_H,
        dir: { x: 0, y: 1 },
        dirName: "down",
        color: this._getTeamColor(i),
        teamId: i,
        hp: TANK_HP,
        maxHp: TANK_HP,
        speed,
        alive: true,
        fire: false,
        fireCd: 0,
        mine: false,
        moveUp: false, moveDown: false, moveLeft: false, moveRight: false,
        score: 0, kills: 0, deaths: 0,
        lastDeathReason: "",
        employeeId: p.employeeId || "",
        username: p.username || "匿名",
        tankName: p.tankName || "坦克",
        invincible: 2000,
        shieldT: 0, fireT: 0, speedT: 0, spreadT: 0,
        drones: 0, mines: 0,
      });
    });
  }

  _getTeamColor(idx) {
    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9", "#a29bfe", "#fd79a8"];
    return colors[idx % colors.length];
  }

  _genMap() {
    this.map = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          this.map[r][c] = BORDER;
        }
      }
    }

    for (let i = 0; i < 80; i++) {
      const r = 2 + Math.floor(Math.random() * (ROWS - 4));
      const c = 2 + Math.floor(Math.random() * (COLS - 4));
      if (this.map[r][c] === EMPTY) {
        this.map[r][c] = WALL;
        if (Math.random() < 0.3 && c + 1 < COLS - 1 && this.map[r][c + 1] === EMPTY) {
          this.map[r][c + 1] = WALL;
        }
      }
    }

    for (let i = 0; i < 15; i++) {
      const r = 2 + Math.floor(Math.random() * (ROWS - 4));
      const c = 2 + Math.floor(Math.random() * (COLS - 4));
      if (this.map[r][c] === EMPTY) {
        this.map[r][c] = CRACK;
        this.crackHp[`${c},${r}`] = 3;
      }
    }

    for (let i = 0; i < 12; i++) {
      const r = 2 + Math.floor(Math.random() * (ROWS - 4));
      const c = 2 + Math.floor(Math.random() * (COLS - 4));
      if (this.map[r][c] === EMPTY) {
        this.map[r][c] = GRASS;
      }
    }

    this._genGates();
  }

  _genGates() {
    const gatePairs = 3;
    const usedCells = new Set();
    for (let i = 0; i < gatePairs; i++) {
      let c1, r1, c2, r2;
      let attempts = 0;
      do {
        c1 = 3 + Math.floor(Math.random() * (COLS - 6));
        r1 = 3 + Math.floor(Math.random() * (ROWS - 6));
        attempts++;
      } while ((this.map[r1][c1] !== EMPTY || usedCells.has(`${c1},${r1}`)) && attempts < 100);
      if (attempts >= 100) continue;

      do {
        c2 = 3 + Math.floor(Math.random() * (COLS - 6));
        r2 = 3 + Math.floor(Math.random() * (ROWS - 6));
        attempts++;
      } while ((this.map[r2][c2] !== EMPTY || usedCells.has(`${c2},${r2}`) || Math.abs(c1 - c2) + Math.abs(r1 - r2) < 10) && attempts < 200);
      if (attempts >= 200) continue;

      this.map[r1][c1] = GATE;
      this.map[r2][c2] = GATE;
      usedCells.add(`${c1},${r1}`);
      usedCells.add(`${c2},${r2}`);

      const gate1 = { cells: [{ c: c1, r: r1 }], partner: null };
      const gate2 = { cells: [{ c: c2, r: r2 }], partner: null };
      gate1.partner = gate2;
      gate2.partner = gate1;
      this.gates.push(gate1, gate2);
    }
  }

  _getSpawnPoints(count) {
    const rows = [1, Math.floor(ROWS / 3), Math.floor((2 * ROWS) / 3), ROWS - 2];
    const cols = [1, Math.floor(COLS / 3), Math.floor((2 * COLS) / 3), COLS - 2];
    const points = [];
    for (const r of rows) {
      for (const c of cols) {
        points.push({ c, r });
      }
    }
    const shuffled = points.sort(() => Math.random() - 0.5);
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
    while (result.length < count) {
      result.push({ c: 1 + Math.floor(Math.random() * (COLS - 2)), r: 1 + Math.floor(Math.random() * (ROWS - 2)) });
    }
    return result;
  }

  _findValidSpawnCell(c, r) {
    if (this._canSpawnAt(c, r)) return { c, r };
    const visited = new Set();
    const queue = [{ c, r }];
    visited.add(`${c},${r}`);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (queue.length) {
      const cur = queue.shift();
      for (const [dc, dr] of dirs) {
        const nc = cur.c + dc;
        const nr = cur.r + dr;
        const key = `${nc},${nr}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        if (this._canSpawnAt(nc, nr)) return { c: nc, r: nr };
        queue.push({ c: nc, r: nr });
      }
    }
    return { c: 1, r: 1 };
  }

  _canSpawnAt(c, r) {
    if (!this._isPassableCell(c, r)) return false;
    for (const t of this.tanks) {
      if (!t.alive) continue;
      if (t.x < (c + 1) * CELL && t.x + t.w > c * CELL &&
          t.y < (r + 1) * CELL && t.y + t.h > r * CELL) return false;
    }
    return true;
  }

  _isPassableCell(c, r) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    const v = this.map[r][c];
    return v === EMPTY || v === GRASS;
  }

  start(broadcastFn, endFn) {
    this._broadcastFn = broadcastFn;
    this._endFn = endFn;
    this.state = "countdown";
    this.lastTick = Date.now();

    this._broadcastFn("countdown", { seconds: 3 });

    let countdown = 3;
    const countdownTimer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        this._broadcastFn("countdown", { seconds: countdown });
      } else {
        clearInterval(countdownTimer);
        this.state = "playing";
        this._broadcastFn("game-start", this._getFullState());
        this._tickInterval = setInterval(() => this._tick(), 1000 / 30);
      }
    }, 1000);
  }

  stop() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
  }

  handleInput(socketId, input) {
    const tank = this.tanks.find((t) => t.id === socketId);
    if (!tank || !tank.alive) return;
    tank.moveUp = !!input.up;
    tank.moveDown = !!input.down;
    tank.moveLeft = !!input.left;
    tank.moveRight = !!input.right;
    tank.fire = !!input.fire;
    if (input.mine && !tank.mine) {
      tank._mineEdge = true;
    }
    tank.mine = !!input.mine;
  }

  _tick() {
    if (this.state !== "playing") return;

    const now = Date.now();
    const dt = Math.min(0.033, (now - this.lastTick) / 1000 || 0.016);
    this.lastTick = now;
    this.gtMs += dt * 1000;

    this._spawnItems(dt);

    for (const t of this.tanks) {
      if (!t.alive) continue;
      this._moveTank(t, dt);
      this._fireBullet(t, dt);
      if (t._mineEdge && t.mines > 0) {
        this._placeMine(t);
      }
      t._mineEdge = false;
      if (t.invincible > 0) t.invincible -= dt * 1000;
      if (t.fireCd > 0) t.fireCd -= dt;
    }

    this._updateBullets(dt);
    this._checkBulletCollisions();
    this._checkItemPickup();
    this._updateMines(dt);

    this._checkEnd();

    this._broadcastFn("game-state", this._getStateSnapshot());
  }

  _spawnItems(dt) {
    this.itemSpawnTimer -= dt;
    if (this.itemSpawnTimer <= 0 && this.items.length < MAX_ITEMS) {
      const def = ITEM_DEFS[Math.floor(Math.random() * ITEM_DEFS.length)];
      let c, r, attempts = 0;
      do {
        c = 2 + Math.floor(Math.random() * (COLS - 4));
        r = 2 + Math.floor(Math.random() * (ROWS - 4));
        attempts++;
      } while (this.map[r][c] !== EMPTY && attempts < 50);

      if (attempts < 50) {
        this.items.push({
          x: c * CELL + 1,
          y: r * CELL + 1,
          w: 18, h: 18,
          def,
          dead: false,
          age: 0,
        });
      }
      this.itemSpawnTimer = ITEM_SPAWN_INTERVAL_MIN + Math.random() * (ITEM_SPAWN_INTERVAL_MAX - ITEM_SPAWN_INTERVAL_MIN);
    }

    for (const it of this.items) {
      if (it.dead) continue;
      it.age += dt;
      if (it.age > 20) it.dead = true;
    }
    this.items = this.items.filter((it) => !it.dead);
  }

  _moveTank(t, dt) {
    let dx = 0, dy = 0;
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
      if (!this._isBlocked(nx, t.y, t.w, t.h, t)) t.x = nx;
      if (!this._isBlocked(t.x, ny, t.w, t.h, t)) t.y = ny;

      t.dir = { x: dx, y: dy };
      t.dirName = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
    }

    const speedMult = t.speedT > this.gtMs ? 1.5 : 1;
    t.speed = (TANK_SPEED_MIN + Math.random() * (TANK_SPEED_MAX - TANK_SPEED_MIN)) * speedMult;
  }

  _isBlocked(x, y, w, h, self) {
    const c1 = Math.max(0, Math.floor(x / CELL));
    const c2 = Math.min(COLS - 1, Math.floor((x + w - 1) / CELL));
    const r1 = Math.max(0, Math.floor(y / CELL));
    const r2 = Math.min(ROWS - 1, Math.floor((y + h - 1) / CELL));
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const v = this.map[r][c];
        if (v === WALL || v === BORDER || v === CRACK) return true;
      }
    }
    for (const o of this.tanks) {
      if (!o.alive || o === self) continue;
      if (o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y) return true;
    }
    return false;
  }

  _fireBullet(t, dt) {
    if (!t.fire || t.fireCd > 0) return;
    const base = t.fireT > this.gtMs ? FIRE_CD_FAST : FIRE_CD;
    t.fireCd = base;
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const fx = cx + t.dir.x * (t.w / 2);
    const fy = cy + t.dir.y * (t.h / 2);
    const ang = Math.atan2(t.dir.y, t.dir.x);

    if (t.spreadT > this.gtMs) {
      for (let i = -1; i <= 1; i++) {
        this.bullets.push({
          x: fx, y: fy,
          dx: Math.cos(ang + i * 0.18) * BULLET_SPEED,
          dy: Math.sin(ang + i * 0.18) * BULLET_SPEED,
          speed: BULLET_SPEED,
          ownerId: t.id,
          teamId: t.teamId,
          dmg: 1,
          dead: false,
          bounced: false,
          teleported: false,
        });
      }
    } else {
      this.bullets.push({
        x: fx, y: fy,
        dx: Math.cos(ang) * BULLET_SPEED,
        dy: Math.sin(ang) * BULLET_SPEED,
        speed: BULLET_SPEED,
        ownerId: t.id,
        teamId: t.teamId,
        dmg: 1,
        dead: false,
        bounced: false,
        teleported: false,
      });
    }
  }

  _updateBullets(dt) {
    for (const b of this.bullets) {
      if (b.dead) continue;
      const prevC = Math.floor(b.x / CELL);
      const prevR = Math.floor(b.y / CELL);
      b.x += b.dx * dt;
      b.y += b.dy * dt;

      const cc = { c: Math.floor(b.x / CELL), r: Math.floor(b.y / CELL) };
      if (cc.r < 0 || cc.r >= ROWS || cc.c < 0 || cc.c >= COLS) {
        if (!b.bounced) {
          b.bounced = true;
          if (cc.r < 0) { b.dy = -b.dy; b.y = prevR * CELL + CELL; }
          else if (cc.r >= ROWS) { b.dy = -b.dy; b.y = prevR * CELL; }
          if (cc.c < 0) { b.dx = -b.dx; b.x = prevC * CELL + CELL; }
          else if (cc.c >= COLS) { b.dx = -b.dx; b.x = prevC * CELL; }
        } else {
          b.dead = true;
        }
        continue;
      }

      const tile = this.map[cc.r][cc.c];
      if (tile === GATE) {
        if (!b.teleported) {
          const g = this._gateAt(cc.c, cc.r);
          const partner = g && g.partner;
          if (partner) {
            const pc = partner.cells[0];
            const dir = { x: b.dx / b.speed, y: b.dy / b.speed };
            if (dir.y !== 0) {
              b.x = pc.c * CELL + CELL / 2;
              b.y = pc.r * CELL + (dir.y < 0 ? -4 : CELL + 1);
            } else {
              b.x = pc.c * CELL + (dir.x < 0 ? -4 : CELL + 1);
              b.y = pc.r * CELL + CELL / 2;
            }
            b.teleported = true;
          }
        } else {
          b.dead = true;
        }
      } else if (tile === BORDER || tile === WALL) {
        if (!b.bounced) {
          b.bounced = true;
          const prevTile = this.map[prevR] && this.map[prevR][prevC];
          const wasInside = prevTile !== BORDER && prevTile !== WALL;
          if (wasInside) {
            if (prevC !== cc.c) { b.dx = -b.dx; b.x = prevC * CELL + (cc.c > prevC ? CELL - 1 : 1); }
            else { b.dy = -b.dy; b.y = prevR * CELL + (cc.r > prevR ? CELL - 1 : 1); }
          } else {
            b.dx = -b.dx;
            b.dy = -b.dy;
          }
        } else {
          b.dead = true;
        }
      } else if (tile === CRACK) {
        b.dead = true;
        const key = `${cc.c},${cc.r}`;
        if (this.crackHp[key]) {
          this.crackHp[key] -= b.dmg || 1;
          if (this.crackHp[key] <= 0) {
            delete this.crackHp[key];
            this.map[cc.r][cc.c] = EMPTY;
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  _checkBulletCollisions() {
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const t of this.tanks) {
        if (!t.alive) continue;
        if (b.teamId === t.teamId) continue;
        if (b.x > t.x && b.x < t.x + t.w && b.y > t.y && b.y < t.y + t.h) {
          const shieldActive = t.shieldT > this.gtMs;
          if (!shieldActive) {
            t.hp -= b.dmg || 1;
          }
          b.dead = true;

          if (t.hp <= 0 && t.alive) {
            t.alive = false;
            t.deaths++;
            const killer = this.tanks.find((tk) => tk.id === b.ownerId);
            t.lastDeathReason = killer ? killer.username : "bullet";
            if (killer && killer.id !== t.id) {
              killer.kills++;
              killer.score++;
            }
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  _checkItemPickup() {
    for (const t of this.tanks) {
      if (!t.alive) continue;
      for (const it of this.items) {
        if (it.dead) continue;
        if (t.x < it.x + it.w && t.x + t.w > it.x && t.y < it.y + it.h && t.y + t.h > it.y) {
          this._applyItem(it, t);
          it.dead = true;
        }
      }
    }
    this.items = this.items.filter((it) => !it.dead);
  }

  _applyItem(it, tank) {
    const now = this.gtMs;
    switch (it.def.id) {
      case "spread": tank.spreadT = now + 18000; break;
      case "fire": tank.fireT = now + 9000; break;
      case "speed": tank.speedT = now + 9000; break;
      case "shield": tank.shieldT = now + 9000; break;
      case "mine": tank.mines += 3; break;
      case "heal": if (tank.hp < tank.maxHp) tank.hp++; break;
      case "drone": if (tank.drones < 5) tank.drones++; break;
    }
  }

  _placeMine(tank) {
    const cc = Math.floor((tank.x + tank.w / 2) / CELL);
    const cr = Math.floor((tank.y + tank.h / 2) / CELL);
    if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) return;
    if (this.map[cr][cc] !== EMPTY) return;
    const occupied = this.mines.some((m) => m.c === cc && m.r === cr);
    if (occupied) return;
    tank.mines--;
    this.mines.push({
      c: cc, r: cr,
      ownerId: tank.id,
      teamId: tank.teamId,
      age: 0,
      dead: false,
    });
  }

  _updateMines(dt) {
    for (const m of this.mines) {
      if (m.dead) continue;
      m.age += dt;
      if (m.age > 20) { m.dead = true; continue; }
      for (const t of this.tanks) {
        if (!t.alive) continue;
        if (t.teamId === m.teamId) continue;
        const tc = Math.floor((t.x + t.w / 2) / CELL);
        const tr = Math.floor((t.y + t.h / 2) / CELL);
        if (tc === m.c && tr === m.r) {
          this._explodeMine(m);
          break;
        }
      }
    }
    this.mines = this.mines.filter((m) => !m.dead);
  }

  _explodeMine(m) {
    if (m.dead) return;
    m.dead = true;
    const x1 = (m.c - 1) * CELL;
    const y1 = (m.r - 1) * CELL;
    const x2 = (m.c + 2) * CELL;
    const y2 = (m.r + 2) * CELL;
    for (const t of this.tanks) {
      if (!t.alive) continue;
      if (t.teamId === m.teamId) continue;
      const tx = t.x + t.w / 2;
      const ty = t.y + t.h / 2;
      if (tx >= x1 && tx < x2 && ty >= y1 && ty < y2) {
        if (t.shieldT > this.gtMs) continue;
        t.hp -= 3;
        if (t.hp <= 0 && t.alive) {
          t.alive = false;
          t.deaths++;
          const killer = this.tanks.find((tk) => tk.id === m.ownerId);
          t.lastDeathReason = killer ? killer.username : "地雷";
          if (killer && killer.id !== t.id) {
            killer.kills++;
            killer.score++;
          }
        }
      }
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = m.r + dr;
        const c = m.c + dc;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        if (this.map[r][c] === CRACK) {
          const key = `${c},${r}`;
          if (this.crackHp[key]) {
            this.crackHp[key] -= 2;
            if (this.crackHp[key] <= 0) {
              delete this.crackHp[key];
              this.map[r][c] = EMPTY;
            }
          }
        }
      }
    }
  }

  _gateAt(c, r) {
    for (const g of this.gates) {
      if (g.cells.some((cell) => cell.c === c && cell.r === r)) return g;
    }
    return null;
  }

  _checkEnd() {
    const alive = this.tanks.filter((t) => t.alive);
    if (alive.length <= 1) {
      this.state = "over";
      this.stop();

      if (alive.length === 1) {
        alive[0].score += 3;
      }

      const sorted = [...this.tanks].sort((a, b) => b.score - a.score);
      const maxScore = sorted[0]?.score || 0;
      const allDead = alive.length === 0;
      const allSameScore = sorted.every((t) => t.score === maxScore);
      const isDraw = allDead || allSameScore || maxScore === 0;

      let winner = null;
      if (!isDraw) {
        const winners = sorted.filter((t) => t.score === maxScore && t.score > 0);
        if (winners.length === 1) winner = winners[0];
      }

      this._broadcastFn("game-over", {
        winner: winner ? { employeeId: winner.employeeId, username: winner.username, tankName: winner.tankName } : null,
        isDraw,
        players: sorted.map((t) => ({
          employeeId: t.employeeId,
          username: t.username,
          tankName: t.tankName,
          score: t.score,
          kills: t.kills,
          deaths: t.deaths,
          deathReason: t.lastDeathReason,
          isWinner: winner && winner.id === t.id,
        })),
        gameDurationMs: Math.floor(this.gtMs),
      });

      if (this._endFn) {
        this._endFn({
          winner,
          isDraw,
          gameDurationMs: Math.floor(this.gtMs),
          players: sorted,
        });
      }
    }
  }

  _getStateSnapshot() {
    return {
      gtMs: Math.floor(this.gtMs),
      tanks: this.tanks.map((t) => ({
        id: t.id,
        x: Math.round(t.x * 10) / 10,
        y: Math.round(t.y * 10) / 10,
        dir: t.dir,
        dirName: t.dirName,
        hp: Math.round(t.hp * 10) / 10,
        maxHp: t.maxHp,
        alive: t.alive,
        color: t.color,
        teamId: t.teamId,
        username: t.username,
        score: t.score,
        kills: t.kills,
        deaths: t.deaths,
        mines: t.mines,
        drones: t.drones,
      })),
      bullets: this.bullets.map((b) => ({
        x: Math.round(b.x * 10) / 10,
        y: Math.round(b.y * 10) / 10,
        dx: Math.round(b.dx),
        dy: Math.round(b.dy),
        teamId: b.teamId,
      })),
      items: this.items.filter((it) => !it.dead).map((it) => ({
        x: it.x,
        y: it.y,
        type: it.def.id,
        name: it.def.name,
      })),
      mines: this.mines.filter((m) => !m.dead).map((m) => ({
        c: m.c,
        r: m.r,
      })),
    };
  }

  _getFullState() {
    return {
      map: this.map,
      gates: this.gates.map((g) => ({
        cells: g.cells,
        partnerCells: g.partner ? g.partner.cells : [],
      })),
      crackHp: this.crackHp,
      tanks: this.tanks.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
        dir: t.dir,
        dirName: t.dirName,
        color: t.color,
        teamId: t.teamId,
        hp: t.hp,
        maxHp: t.maxHp,
        alive: t.alive,
        username: t.username,
        tankName: t.tankName,
        score: t.score,
        kills: t.kills,
        deaths: t.deaths,
      })),
    };
  }
}

module.exports = GameEngine;
