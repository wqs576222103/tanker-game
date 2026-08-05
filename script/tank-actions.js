"use strict";

// ====================== 坦克移动、攻击、碰撞方法 ======================

const TankActions = {
  // 移动坦克
  moveTank(t, dx, dy, dt) {
    let sp = t.speed * dt;
    if (t.isPlayer && t.speedT > gtMs) sp *= 1.4;
    const nx = t.x + dx * sp,
      ny = t.y + dy * sp;
    if (!this.blocked(nx, t.y, t.w, t.h, t)) {
      t.x = nx;
      if (dx !== 0) t.y = Math.round(t.y / CELL) * CELL + (CELL - t.h) / 2;
    }
    if (!this.blocked(t.x, ny, t.w, t.h, t)) {
      t.y = ny;
      if (dy !== 0) t.x = Math.round(t.x / CELL) * CELL + (CELL - t.w) / 2;
    }
    t.dir = { x: dx, y: dy };
    t.dirName = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
    if (t.invincible > 0) t.invincible -= dt * 1000;
  },

  // 设置坦克方向
  setDirName(t, name) {
    t.dir = { ...DIRS[name] };
    t.dirName = name;
  },

  // 检测碰撞（障碍/坦克）
  blocked(x, y, w, h, self) {
    const c1 = Math.max(0, Math.floor(x / CELL)),
      c2 = Math.min(COLS - 1, Math.floor((x + w - 1) / CELL));
    const r1 = Math.max(0, Math.floor(y / CELL)),
      r2 = Math.min(ROWS - 1, Math.floor((y + h - 1) / CELL));
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++) {
        const v = map[r][c];
        if (v === WALL || v === BORDER || v === CRACK) return true;
      }
    for (const o of tanks) {
      if (!o.alive || o === self) continue;
      if (o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y) {
        this.resolveTankCollision(self, o);
        return true;
      }
    }
    // 检查boss碰撞
    if (boss && boss.alive && self !== boss) {
      if (
        boss.x < x + w &&
        boss.x + boss.w > x &&
        boss.y < y + h &&
        boss.y + boss.h > y
      ) {
        if (self && self.isPlayer) {
          // 玩家碰到boss会受伤
          this.damagePlayer("撞上BOSS");
        }
        return true;
      }
    }
    return false;
  },

  // 坦克碰撞检测
  tanksCollide(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  },

  // 解决坦克碰撞
  resolveTankCollision(attacker, defender) {
    const attackerMoving =
      Math.abs(attacker.dir.x) + Math.abs(attacker.dir.y) > 0;
    const defenderMoving =
      Math.abs(defender.dir.x) + Math.abs(defender.dir.y) > 0;
    const oppositeDir =
      attacker.dir.x + defender.dir.x === 0 &&
      attacker.dir.y + defender.dir.y === 0;

    if (attackerMoving && defenderMoving && oppositeDir) {
      // 正面相撞
      if (attacker.hp >= defender.hp) {
        attacker.hp -= defender.hp;
        defender.hp = 0;
        defender.flash = 120;
        spawnExplosion(
          defender.x + defender.w / 2,
          defender.y + defender.h / 2,
          25,
          "#ff6040",
        );
        sfx("boom");
        if (defender.hp <= 0) {
          defender.alive = false;
          if (defender.isPlayer) {
            player.flash = 300;
            damageFlash = 350;
            deathReason = "被敌人坦克撞击";
            AILogger.logDeath(deathReason, {
              trigger: "tankCollision_headOn",
              attacker: { x: attacker.x, y: attacker.y, hp: attacker.hp },
            });
            gameOver();
          } else killEnemy(defender);
        }
      } else {
        defender.hp -= attacker.hp;
        attacker.hp = 0;
        attacker.flash = 120;
        spawnExplosion(
          attacker.x + attacker.w / 2,
          attacker.y + attacker.h / 2,
          25,
          "#ff6040",
        );
        sfx("boom");
        if (attacker.hp <= 0) {
          attacker.alive = false;
          if (attacker.isPlayer) {
            player.flash = 300;
            damageFlash = 350;
            deathReason = "被敌人坦克撞击";
            AILogger.logDeath(deathReason, {
              trigger: "tankCollision_headOn",
              defender: { x: defender.x, y: defender.y, hp: defender.hp },
            });
            gameOver();
          } else killEnemy(attacker);
        }
      }
      return true;
    } else if (attackerMoving && !oppositeDir) {
      // 正面撞击非正面，攻击者获胜
      defender.hp -= 1;
      defender.flash = 120;
      spawnExplosion(
        defender.x + defender.w / 2,
        defender.y + defender.h / 2,
        15,
        "#ff8a5a",
      );
      sfx("hit");
      if (defender.hp <= 0) {
        defender.alive = false;
        if (defender.isPlayer) {
          player.flash = 300;
          damageFlash = 350;
          deathReason = "被敌人坦克撞击";
          AILogger.logDeath(deathReason, {
            trigger: "tankCollision_side",
            attacker: { x: attacker.x, y: attacker.y, hp: attacker.hp },
          });
          gameOver();
        } else killEnemy(defender);
      }
      return true;
    }
    return false;
  },

  // 矩形碰撞检测
  rectHit(a, b) {
    return (
      a.x < b.x + (b.w || b.size || 22) &&
      a.x + a.w > b.x &&
      a.y < b.y + (b.h || b.size || 22) &&
      a.y + a.h > b.y
    );
  },

  // 尝试传送
  tryTeleport(t) {
    const cx = t.x + t.w / 2,
      cy = t.y + t.h / 2;
    const cc = cellOf(cx, cy);
    const g = gateAt(cc.c, cc.r);
    if (g && g.partner && (lastTeleport[t.id] || 0) + 1000 < gtMs) {
      const cen = centerOf(g.partner.cells[0].c, g.partner.cells[0].r);
      t.x = cen.x - t.w / 2;
      t.y = cen.y - t.h / 2;
      lastTeleport[t.id] = gtMs;
      spawnExplosion(cen.x, cen.y, 26, "#58a6ff");
      addFloat(cen.x, cen.y - 18, "传送", "#58a6ff");
      sfx("tp");
    }
  },

  // 射击子弹
  fireBullet(x, y, dir, owner, dmg) {
    if (bullets.length > 200) return;
    const len = Math.hypot(dir.x, dir.y) || 1;
    bullets.push({
      x,
      y,
      dx: dir.x / len,
      dy: dir.y / len,
      owner,
      dmg: dmg || 1,
      bounced: false,
      dead: false,
      born: gtMs,
    });
    sfx("shoot");
  },

  // 按方向射击
  fireDir(x, y, angle, owner, dmg) {
    this.fireBullet(
      x,
      y,
      { x: Math.cos(angle), y: Math.sin(angle) },
      owner,
      dmg,
    );
  },

  // 更新子弹
  updateBullets(dt) {
    for (const b of bullets) {
      if (b.dead) continue;

      // 处理旋转弹
      if (b.rotationSpeed) {
        b.angle += b.rotationSpeed * dt;
        b.dx = Math.cos(b.angle);
        b.dy = Math.sin(b.angle);
      }

      const step = (b.speed || 210) * dt;
      const steps = Math.max(1, Math.ceil(step / 3));
      const d = step / steps;
      for (let i = 0; i < steps && !b.dead; i++) {
        const px = b.x,
          py = b.y;
        b.x += (b.dx || 0) * d;
        b.y += (b.dy || 0) * d;
        const cc = cellOf(b.x, b.y);
        const g = gateAt(cc.c, cc.r);
        if (g && g.partner && !b.tp && gtMs - b.born > 60) {
          const cen = centerOf(g.partner.cells[0].c, g.partner.cells[0].r);
          b.x = cen.x;
          b.y = cen.y;
          b.tp = true;
          spawnExplosion(cen.x, cen.y, 14, "#58a6ff");
          sfx("tp");
          continue;
        }
        const v =
          cc.r >= 0 && cc.r < ROWS && cc.c >= 0 && cc.c < COLS
            ? map[cc.r][cc.c]
            : BORDER;
        if (v === WALL || v === BORDER) {
          if (b.bounced) {
            b.dead = true;
            break;
          }
          const pc = cellOf(px, py);
          if (cc.c !== pc.c) {
            b.dx = -b.dx;
            b.x = b.dx > 0 ? pc.c * CELL + CELL - 1 : pc.c * CELL + 1;
          }
          if (cc.r !== pc.r) {
            b.dy = -b.dy;
            b.y = b.dy > 0 ? pc.r * CELL + CELL - 1 : pc.r * CELL + 1;
          }
          if (cc.c === pc.c && cc.r === pc.r) {
            b.dead = true;
            break;
          }
          b.bounced = true;
          sfx("bounce");
          spawnExplosion(b.x, b.y, 6, "#c9a35a");
          break;
        } else if (v === CRACK) {
          damageCrack(cc.c, cc.r, 1);
          b.dead = true;
          break;
        }
      }
      // 子弹只应在出图或二次撞墙时消失
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        b.dead = true;
        continue;
      }

      // 命中判定
      if (!b.dead) {
        const br = { x: b.x - 2, y: b.y - 2, w: 4, h: 4 };
        if (!b.dead) {
          for (const t of tanks) {
            if (!t.alive) continue;
            if (b.owner === "player" && t.isPlayer) continue;
            if (b.owner === "enemy" && !t.isPlayer) continue;
            if (t.invincible > 0) continue;
            if (this.rectHit(br, t)) {
              if (t.isPlayer) {
                this.damagePlayer("被敌人子弹击中", true);
              } else {
                t.hp -= b.dmg || 1;
                t.flash = 90;
                spawnExplosion(b.x, b.y, 10, "#ff8a5a");
                if (t.hp <= 0) killEnemy(t);
              }
              b.dead = true;
              break;
            }
          }
        }
        // 无人机
        if (!b.dead && b.owner === "enemy") {
          for (const dr of drones) {
            if (this.rectHit(br, dr)) {
              b.dead = true;
              dr.hp--;
              spawnExplosion(b.x, b.y, 8, "#58a6ff");
              break;
            }
          }
        }
        // 命中boss
        if (!b.dead && b.owner === "player" && boss && boss.alive) {
          if (this.rectHit(br, boss)) {
            boss.hp -= b.dmg || 1;
            boss.flash = 90;
            spawnExplosion(b.x, b.y, 15, "#ee5253");
            if (boss.hp <= 0) {
              killBoss();
            }
            b.dead = true;
          }
        }
      }
    }
    bullets = bullets.filter((b) => !b.dead);
  },

  // 该方向是否可通行
  dirFree(t, name) {
    const d = DIRS[name];
    return !this.blocked(t.x + d.x * 4, t.y + d.y * 4, t.w, t.h, t);
  },

  // 该方向可直行的距离（像素）
  freeDist(t, name) {
    const d = DIRS[name];
    let dist = 0;
    while (dist < 120) {
      dist += 2;
      if (this.blocked(t.x + d.x * dist, t.y + d.y * dist, t.w, t.h, t)) break;
    }
    return dist;
  },

  // 选择敌人方向
  pickEnemyDir(t) {
    const p = player;
    const dx = p.x - t.x,
      dy = p.y - t.y;
    const vertical = Math.abs(dy) > Math.abs(dx);
    const opts = vertical ? ["up", "down"] : ["left", "right"];
    let name;
    if (Math.random() < 0.6) {
      name = Math.random() < 0.5 ? opts[0] : opts[1];
    } else {
      name = DIR_NAMES[Math.floor(Math.random() * 4)];
    }
    if (this.dirFree(t, name)) return name;
    let best = name,
      bestD = -1;
    for (const n of DIR_NAMES) {
      if (!this.dirFree(t, n)) continue;
      const fd = this.freeDist(t, n);
      if (fd > bestD) {
        bestD = fd;
        best = n;
      }
    }
    return bestD > 0 ? best : name;
  },

  // 更新敌人
  updateEnemies(dt) {
    const alive = tanks.filter((t) => t.alive && !t.isPlayer);
    if (spawnTimer <= 0 && alive.length < maxEnemies()) {
      spawnEnemy(false);
      spawnTimer = Math.max(2, 4.5 - gtMs / 30000);
    } else {
      spawnTimer -= dt;
    }
    for (const t of alive) {
      t.dirTimer -= dt;
      if (t.dirTimer <= 0) {
        this.setDirName(t, this.pickEnemyDir(t));
        t.dirTimer = 0.5 + Math.random() * 1.1;
      }
      const d = t.dir;
      const px = t.x,
        py = t.y;
      this.moveTank(t, d.x, d.y, dt);
      if (t.x === px && t.y === py) {
        t.stuckT = (t.stuckT || 0) + dt;
        if (t.stuckT > 0.45) {
          this.setDirName(t, this.pickEnemyDir(t));
          t.stuckT = 0;
          t.dirTimer = 0.15;
        }
      } else {
        t.stuckT = 0;
      }
      if (this.blocked(t.x + d.x * 2, t.y + d.y * 2, t.w, t.h, t)) {
        this.setDirName(t, this.pickEnemyDir(t));
        t.stuckT = 0;
        t.dirTimer = 0.2 + Math.random() * 0.4;
      }
      this.tryTeleport(t);
      t.fireCd -= dt;
      if (t.fireCd <= 0 && player.alive) {
        t.fireCd = 2.2 + Math.random() * 2.0 - Math.min(0.6, gtMs / 60000);
        const dx = player.x + player.w / 2 - (t.x + t.w / 2);
        const dy = player.y + player.h / 2 - (t.y + t.h / 2);
        // 转向玩家方向
        let targetDir;
        if (Math.abs(dx) > Math.abs(dy)) {
          targetDir = dx > 0 ? "right" : "left";
        } else {
          targetDir = dy > 0 ? "down" : "up";
        }
        this.setDirName(t, targetDir);
        // 向玩家发射子弹（基于当前朝向）
        const ang = Math.atan2(t.dir.y, t.dir.x) + (Math.random() - 0.5) * 0.22;
        this.fireDir(t.x + t.w / 2, t.y + t.h / 2, ang, "enemy", 1);
      }
    }
    tanks = tanks.filter((t) => t.alive);
  },

  // 移动boss
  moveBoss(dt) {
    if (!boss || !boss.alive) return;

    boss.moveTimer -= dt;
    if (boss.moveTimer <= 0) {
      // 随机改变方向
      const dirs = Object.keys(DIRS);
      const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
      boss.dirName = randomDir;
      boss.dir = { ...DIRS[randomDir] };
      boss.moveTimer = 2 + Math.random() * 3;
    }

    // 移动boss
    const sp = boss.speed * dt;
    const nx = boss.x + boss.dir.x * sp;
    const ny = boss.y + boss.dir.y * sp;

    if (!this.blocked(nx, boss.y, boss.w, boss.h, boss)) boss.x = nx;
    if (!this.blocked(boss.x, ny, boss.w, boss.h, boss)) boss.y = ny;

    if (boss.invincible > 0) boss.invincible -= dt * 1000;
  },

  // boss射击逻辑
  bossFire(dt) {
    if (!boss || !boss.alive) return;

    // 散弹冷却
    boss.spreadCd -= dt;
    if (boss.spreadCd <= 0) {
      boss.spreadCd = 8;
      // 发射散弹
      const cx = boss.x + boss.w / 2;
      const cy = boss.y + boss.h / 2;

      // 向8个方向发射子弹
      const angles = [
        0,
        Math.PI / 4,
        Math.PI / 2,
        (3 * Math.PI) / 4,
        Math.PI,
        (5 * Math.PI) / 4,
        (3 * Math.PI) / 2,
        (7 * Math.PI) / 4,
      ];
      for (const angle of angles) {
        this.fireDir(cx, cy, angle, "enemy", 2);
      }

      addFloat(cx, cy, "散弹攻击！", "#ee5253");
    }

    // 旋转弹冷却
    boss.rotateCd -= dt;
    if (boss.rotateCd <= 0) {
      boss.rotateCd = 15;
      // 发射旋转弹（发射后沿直线传播，不再原地旋转）
      const cx = boss.x + boss.w / 2;
      const cy = boss.y + boss.h / 2;
      const pcx = player.x + player.w / 2;
      const pcy = player.y + player.h / 2;
      const baseAng = Math.atan2(pcy - cy, pcx - cx);
      for (let i = 0; i < 4; i++) {
        this.fireDir(cx, cy, baseAng + (i * Math.PI) / 2, "enemy", 2);
      }

      addFloat(cx, cy, "旋转弹攻击！", "#ee5253");
    }
  },

  // 玩家受伤
  damagePlayer(reason, bullet) {
    if (player.shieldT > gtMs) {
      if (!bullet) {
        player.shieldT = 0;
        spawnExplosion(
          player.x + player.w / 2,
          player.y + player.h / 2,
          22,
          "#58a6ff",
        );
        addFloat(player.x, player.y - 14, "护盾破碎", "#58a6ff");
        sfx("hit");
      }
      return;
    }
    player.hp--;
    player.flash = 300;
    damageFlash = 350;
    spawnExplosion(
      player.x + player.w / 2,
      player.y + player.h / 2,
      26,
      "#ff4a3a",
    );
    sfx("boom");
    if (player.hp <= 0) {
      deathReason = reason || "不明原因";
      AILogger.logDeath(deathReason, {
        trigger: "damagePlayer",
        bullet: bullet
          ? { x: bullet.x, y: bullet.y, vx: bullet.vx, vy: bullet.vy }
          : null,
      });
      gameOver();
    }
    updateHud();
  },

  // 更新玩家
  updatePlayer(dt) {
    const k = keys;
    let mx = 0,
      my = 0;
    if (k.up) my -= 1;
    if (k.down) my += 1;
    if (k.left) mx -= 1;
    if (k.right) mx += 1;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      this.moveTank(player, mx / len, my / len, dt);
    }
    if (player.invincible > 0) player.invincible -= dt * 1000;
    this.tryTeleport(player);

    // 射击
    player.fireCd -= dt;
    if (k.fire && player.fireCd <= 0) {
      const base = player.fireT > gtMs ? 0.16 : 0.34;
      player.fireCd = base;
      const cx = player.x + player.w / 2,
        cy = player.y + player.h / 2;
      const ang = Math.atan2(player.dir.y, player.dir.x);
      if (player.spreadT > gtMs) {
        for (let i = -1; i <= 1; i++)
          this.fireDir(cx, cy, ang + i * 0.18, "player", 1);
      } else {
        this.fireDir(cx, cy, ang, "player", 1);
      }
    }

    // 放雷
    if (k.mine && player.mines > 0) {
      const cc = cellOf(player.x + player.w / 2, player.y + player.h / 2);
      if (map[cc.c][cc.r] === EMPTY) {
        player.mines--;
        mines.push({
          x: cc.c * CELL + 3,
          y: cc.r * CELL + 3,
          w: 24,
          h: 24,
          size: 24,
          dead: false,
          age: 0,
        });
        k.mine = false;
        updateHud();
      }
    }

    // 无人机
    for (let i = drones.length - 1; i >= 0; i--) {
      const dr = drones[i];
      dr.age += dt;
      if (dr.hp <= 0) {
        drones.splice(i, 1);
        continue;
      }
      const px = player.x + player.w / 2,
        py = player.y + player.h / 2;
      const orbitA =
        dr.age * 2 + (i * Math.PI * 2) / Math.max(1, drones.length);
      const tx = px + Math.cos(orbitA) * 34,
        ty = py + Math.sin(orbitA) * 20 - 16;
      dr.x += (tx - dr.x) * Math.min(1, dt * 4);
      dr.y += (ty - dr.y) * Math.min(1, dt * 4);
      dr.fireCd -= dt;
      if (dr.fireCd <= 0) {
        let best = null,
          bd = 280;
        for (const t of tanks) {
          if (t.isPlayer || !t.alive) continue;
          const dx = t.x - dr.x,
            dy = t.y - dr.y;
          const dist = Math.hypot(dx, dy);
          if (dist < bd) {
            bd = dist;
            best = t;
          }
        }
        if (best) {
          const ang = Math.atan2(
            best.y + best.w / 2 - dr.y,
            best.x + best.h / 2 - dr.x,
          );
          this.fireDir(dr.x, dr.y, ang, "player", 1);
          dr.fireCd = 0.3;
        } else {
          dr.fireCd = 0.15;
        }
      }
    }
  },
};
