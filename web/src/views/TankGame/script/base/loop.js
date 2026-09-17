import { W, H } from "./constants.js";
import { update } from "./game-flow.js";
import { updateHud } from "./hud.js";
import {
  drawMap,
  drawItems,
  drawMines,
  drawDrones,
  drawBullets,
  drawTank,
  drawBoss,
  drawDogCage,
  drawPlayer,
  drawGrassOverlay,
  drawParticles,
  drawFloats,
} from "./render.js";

// ====================== 主循环 ======================
window.lastTime = 0;
let rafId = null;

export function stopGameLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  window.__tankGameInited = false;
}

export function loop(ts) {
  const dt = Math.min(0.033, (ts - window.lastTime) / 1000 || 0.016);
  window.lastTime = ts;
  if (window.state === "playing") update(dt * window.gameSpeed);
  if (window.damageFlash > 0) window.damageFlash -= dt * 1000;
  updateHud();

  drawMap();
  drawItems();
  drawMines();
  drawDrones();
  drawBullets();
  for (const t of window.tanks) if (t !== window.player) drawTank(t);
  drawBoss();
  drawDogCage();
  drawPlayer();
  drawGrassOverlay();
  drawParticles();
  drawFloats();

  if (window.damageFlash > 0) {
    window.ctx.strokeStyle = `rgba(255, 0, 0, ${0.4 * Math.min(1, window.damageFlash / 150)})`;
    window.ctx.lineWidth = 12;
    window.ctx.strokeRect(2, 2, W - 4, H - 4);
  }

  if (window.tutorialMode && window.tutorialHooks?.render) {
    window.tutorialHooks.render(window.ctx);
  }

  rafId = requestAnimationFrame(loop);
}

export function startRaf() {
  rafId = requestAnimationFrame((t) => {
    window.lastTime = t;
    rafId = requestAnimationFrame(loop);
  });
}
