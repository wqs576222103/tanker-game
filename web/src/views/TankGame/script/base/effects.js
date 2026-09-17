// ====================== 实体 ======================
import { CELL, DIRS } from "./constants.js";

export function spawnExplosion(x, y, r, color) {
  const n = Math.min(20, Math.floor(r / 2));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (0.5 + Math.random()) * (r / 8);
    window.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0,
      max: 40 + Math.random() * 30,
      size: 2 + Math.random() * (r / 8),
      color,
    });
  }
  window.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0,
    max: 28,
    size: r,
    color: "rgba(255,200,90,0.8)",
    ring: true,
  });
}

export function addFloat(x, y, text, color) {
  window.floats.push({ x, y, text, life: 0, max: 900, color });
}

export function makeTank(x, y, dirName, isPlayer) {
  return {
    id: Math.random().toString(36).slice(2),
    x,
    y,
    w: CELL - 4,
    h: CELL - 4,
    dirName,
    dir: { ...DIRS[dirName] },
    isPlayer,
    hp: isPlayer ? 3 : 2,
    maxHp: isPlayer ? 3 : 2,
    speed: isPlayer ? 100 : 55,
    alive: true,
    invincible: 0,
    dirTimer: Math.random() * 1.2,
    fireCd: 0,
    name: isPlayer ? "玩家" : "",
    shieldT: 0,
    speedT: 0,
    fireT: 0,
    spreadT: 0,
    drones: 0,
    mines: 0,
    bounces: false,
    flash: 0,
  };
}

export function updateParticles(dt) {
  for (const p of window.particles) {
    p.life += dt * 1000;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
  }
  window.particles = window.particles.filter((p) => p.life < p.max);
}

export function updateFloats(dt) {
  for (const f of window.floats) {
    f.life += dt * 1000;
    f.y -= 0.6;
  }
  window.floats = window.floats.filter((f) => f.life < f.max);
}
