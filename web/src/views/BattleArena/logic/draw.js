import { battleTankImg } from "./gameState.js";
import {
  W,
  H,
  drawMap,
  drawItems,
  drawBullets,
  drawGrassOverlay,
  drawParticles,
  drawFloats,
} from "../../TankGame/script/base.js";

let battleCtx = null;

export function setBattleCtx(ctx) {
  battleCtx = ctx;
}

export function drawBattle() {
  if (!battleCtx) return;
  const c = battleCtx;
  c.fillStyle = "#202a1c";
  c.fillRect(0, 0, W, H);

  window.ctx = c;
  window.map = window.map || [];

  drawMap();
  drawItems();
  drawBullets();

  for (const t of window.tanks) {
    if (!t.alive) continue;
    drawBattleTank(t);
  }

  drawGrassOverlay();
  drawParticles();
  drawFloats();
}

export function drawBattleTank(t) {
  if (!battleCtx) return;
  const c = battleCtx;
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const ang = Math.atan2(t.dir.y, t.dir.x);

  c.save();
  c.translate(cx, cy);
  c.rotate(ang + Math.PI / 2);

  if (
    battleTankImg &&
    battleTankImg.complete &&
    battleTankImg.naturalWidth > 0
  ) {
    c.drawImage(battleTankImg, -t.w / 2 - 1, -t.h / 2 - 1, t.w + 2, t.h + 2);
  } else {
    c.fillStyle = t.color || "#ff6b6b";
    c.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
  }

  c.restore();

  const pct = Math.max(0, t.hp / t.maxHp);
  c.fillStyle = "#1c1f1c";
  c.fillRect(cx - t.w / 2, cy - t.h / 2 - 8, t.w, 4);
  c.fillStyle = pct > 0.5 ? "#7de07d" : pct > 0.25 ? "#ffd76e" : "#ff6b6b";
  c.fillRect(cx - t.w / 2, cy - t.h / 2 - 8, t.w * pct, 4);

  c.font = "bold 11px 'Microsoft YaHei', sans-serif";
  c.textAlign = "center";
  c.textBaseline = "bottom";
  c.fillStyle = "rgba(0,0,0,.8)";
  c.fillText(t.aiName || "AI", cx + 1, cy - t.h / 2 - 11);
  c.fillStyle = "#fff";
  c.fillText(t.aiName || "AI", cx, cy - t.h / 2 - 12);
}
