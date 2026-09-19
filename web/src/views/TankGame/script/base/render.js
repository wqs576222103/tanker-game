import { CELL, COLS, ROWS, W, H, EMPTY, WALL, GATE, BORDER, CRACK, GRASS, SPEED, SPIKE, FALLING, DOOR, SWITCH, PORTAL } from "./constants.js";
import { playerImg, enemyImg, bossImg, dogImg } from "./constants.js";
import { protectedKey } from "./map.js";
import { AIPlayer } from "../ai-player.js";

// ====================== 绘制 ======================
export function drawMap() {
  const m = window.map;
  window.ctx.fillStyle = "#202a1c";
  window.ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * CELL,
        y = r * CELL;
      const v = m[r][c];
      if (v === EMPTY) {
        if ((r + c) % 2 === 0) {
          window.ctx.fillStyle = "#1d2619";
          window.ctx.fillRect(x, y, CELL, CELL);
        }
        continue;
      }
      if (v === BORDER) {
        window.ctx.fillStyle = "#3d4650";
        window.ctx.fillRect(x, y, CELL, CELL);
        window.ctx.fillStyle = "#2a3138";
        window.ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        window.ctx.fillStyle = "#20262c";
        window.ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
        continue;
      }
      if (v === WALL) {
        window.ctx.save();
        window.ctx.shadowColor = "rgba(0,0,0,.5)";
        window.ctx.shadowBlur = 4;
        window.ctx.shadowOffsetY = 2;
        window.ctx.fillStyle = "#aeb6c0";
        window.ctx.fillRect(x, y, CELL, CELL);
        window.ctx.shadowColor = "transparent";
        window.ctx.shadowBlur = 0;
        window.ctx.shadowOffsetY = 0;
        window.ctx.fillStyle = "#c6cdd6";
        window.ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        window.ctx.strokeStyle = "rgba(60,70,85,.55)";
        window.ctx.lineWidth = 1.5;
        window.ctx.beginPath();
        window.ctx.moveTo(x, y + CELL / 2);
        window.ctx.lineTo(x + CELL, y + CELL / 2);
        window.ctx.moveTo(x + CELL / 2, y);
        window.ctx.lineTo(x + CELL / 2, y + CELL / 2);
        window.ctx.moveTo(x + CELL / 4, y + CELL / 2);
        window.ctx.lineTo(x + CELL / 4, y + CELL);
        window.ctx.moveTo(x + (CELL * 3) / 4, y + CELL / 2);
        window.ctx.lineTo(x + (CELL * 3) / 4, y + CELL);
        window.ctx.stroke();
        window.ctx.restore();
        continue;
      }
      if (v === CRACK) {
        const hp = window.crackHp[protectedKey(c, r)] || 1;
        window.ctx.save();
        window.ctx.shadowColor = "rgba(0,0,0,.5)";
        window.ctx.shadowBlur = 4;
        window.ctx.shadowOffsetY = 2;
        window.ctx.fillStyle = "#ff9f43";
        window.ctx.fillRect(x, y, CELL, CELL);
        window.ctx.shadowColor = "transparent";
        window.ctx.shadowBlur = 0;
        window.ctx.shadowOffsetY = 0;
        window.ctx.fillStyle = "#ffbe76";
        window.ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        window.ctx.strokeStyle = hp <= 1 ? "#ff9a5a" : "#c2600f";
        window.ctx.lineWidth = 2;
        window.ctx.beginPath();
        window.ctx.moveTo(x + 2, y + CELL - 4);
        window.ctx.lineTo(x + 8, y + 8);
        window.ctx.lineTo(x + 12, y + 5);
        window.ctx.lineTo(x + CELL - 3, y + 8);
        window.ctx.stroke();
        if (hp <= 1) {
          window.ctx.strokeStyle = "#ff9a5a";
          window.ctx.lineWidth = 2;
          window.ctx.beginPath();
          window.ctx.moveTo(x + 5, y + 5);
          window.ctx.lineTo(x + CELL - 4, y + CELL - 4);
          window.ctx.moveTo(x + CELL - 5, y + 5);
          window.ctx.lineTo(x + 5, y + CELL - 4);
          window.ctx.stroke();
        }
        window.ctx.fillStyle = "rgba(255,255,255,.55)";
        for (let i = 0; i < hp; i++) window.ctx.fillRect(x + 2 + i * 5, y + 2, 3, 2);
        window.ctx.restore();
        continue;
      }
      if (v === GRASS) {
        drawGrassCell(c, r);
        continue;
      }
      if (v === SPEED) {
        const pulse = 0.5 + 0.5 * Math.sin(window.gtMs / 200 + c * 0.5 + r * 0.5);
        window.ctx.fillStyle = `rgba(0,200,100,${0.2 + pulse * 0.2})`;
        window.ctx.fillRect(x, y, CELL, CELL);
        window.ctx.strokeStyle = `rgba(0,255,120,${0.5 + pulse * 0.5})`;
        window.ctx.lineWidth = 1;
        window.ctx.beginPath();
        window.ctx.moveTo(x + 2, y + CELL - 2);
        window.ctx.lineTo(x + CELL - 2, y + 2);
        window.ctx.stroke();
        window.ctx.beginPath();
        window.ctx.moveTo(x + 6, y + CELL - 2);
        window.ctx.lineTo(x + CELL - 2, y + 6);
        window.ctx.stroke();
        window.ctx.beginPath();
        window.ctx.moveTo(x + 10, y + CELL - 2);
        window.ctx.lineTo(x + CELL - 2, y + 10);
        window.ctx.stroke();
        continue;
      }
      if (v === SPIKE) {
        const pulse = 0.5 + 0.5 * Math.sin(window.gtMs / 300 + c * 0.4 + r * 0.4);
        window.ctx.fillStyle = `rgba(200,50,50,${0.2 + pulse * 0.2})`;
        window.ctx.fillRect(x, y, CELL, CELL);
        window.ctx.strokeStyle = `rgba(255,80,80,${0.6 + pulse * 0.4})`;
        window.ctx.lineWidth = 2;
        const spikeCount = 3;
        const spikeWidth = CELL / spikeCount;
        for (let i = 0; i < spikeCount; i++) {
          const sx = x + i * spikeWidth + spikeWidth / 2;
          window.ctx.beginPath();
          window.ctx.moveTo(sx - 4, y + CELL - 2);
          window.ctx.lineTo(sx, y + 2);
          window.ctx.lineTo(sx + 4, y + CELL - 2);
          window.ctx.stroke();
        }
        continue;
      }
      if (v === FALLING) {
        const hp = window.crackHp[protectedKey(c, r)] || 2;
        window.ctx.fillStyle = `rgba(150,120,80,0.3)`;
        window.ctx.fillRect(x, y, CELL, CELL);
        window.ctx.strokeStyle = `rgba(180,150,100,${0.4 + hp * 0.2})`;
        window.ctx.lineWidth = 1;
        window.ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
        window.ctx.fillStyle = `rgba(200,180,120,${0.3 + hp * 0.1})`;
        window.ctx.fillRect(x + 4, y + 4, CELL - 8, 4);
        window.ctx.fillStyle = "rgba(255,255,255,.6)";
        for (let i = 0; i < hp; i++) window.ctx.fillRect(x + 2 + i * 5, y + 2, 3, 2);
        continue;
      }
      if (v === DOOR) {
        const isOpen = window.doorStates && window.doorStates[protectedKey(c, r)];
        if (isOpen) {
          window.ctx.fillStyle = "rgba(100,100,100,0.2)";
          window.ctx.fillRect(x, y, CELL, CELL);
          window.ctx.strokeStyle = "rgba(150,150,150,0.3)";
          window.ctx.lineWidth = 1;
          window.ctx.setLineDash([2, 2]);
          window.ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
          window.ctx.setLineDash([]);
        } else {
          window.ctx.fillStyle = "#6a6a6a";
          window.ctx.fillRect(x, y, CELL, CELL);
          window.ctx.fillStyle = "#5a5a5a";
          window.ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          window.ctx.fillStyle = "#7a7a7a";
          window.ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        }
        continue;
      }
      if (v === SWITCH) {
        const isOn = window.switchStates && window.switchStates[protectedKey(c, r)];
        window.ctx.fillStyle = isOn ? "rgba(0,200,0,0.3)" : "rgba(200,0,0,0.3)";
        window.ctx.fillRect(x, y, CELL, CELL);
        window.ctx.fillStyle = isOn ? "#00AA00" : "#AA0000";
        window.ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
        window.ctx.fillStyle = "#FFD700";
        window.ctx.beginPath();
        window.ctx.arc(x + CELL / 2, y + CELL / 2, 3, 0, Math.PI * 2);
        window.ctx.fill();
        window.ctx.strokeStyle = "#FFD700";
        window.ctx.lineWidth = 2;
        window.ctx.beginPath();
        window.ctx.arc(x + CELL / 2, y + CELL / 2, 6, 0, Math.PI * 2);
        window.ctx.stroke();
        continue;
      }
      if (v === PORTAL) {
        const pulse = 0.5 + 0.5 * Math.sin(window.gtMs / 200);
        window.ctx.fillStyle = `rgba(100,0,200,${0.3 + pulse * 0.3})`;
        window.ctx.fillRect(x, y, CELL, CELL);
        window.ctx.strokeStyle = `rgba(150,0,255,${0.5 + pulse * 0.5})`;
        window.ctx.lineWidth = 2;
        window.ctx.beginPath();
        window.ctx.arc(x + CELL / 2, y + CELL / 2, 6 + pulse * 2, 0, Math.PI * 2);
        window.ctx.stroke();
        window.ctx.fillStyle = `rgba(200,100,255,${0.5 + pulse * 0.4})`;
        window.ctx.beginPath();
        window.ctx.arc(x + CELL / 2, y + CELL / 2, 3 + pulse * 2, 0, Math.PI * 2);
        window.ctx.fill();
        continue;
      }
      if (v === GATE) {
        const pulse = 0.5 + 0.5 * Math.sin(window.gtMs / 250 + c * 0.6 + r * 0.3);
        window.ctx.fillStyle = `rgba(40,90,140,${0.25 + pulse * 0.35})`;
        window.ctx.fillRect(x, y, CELL, CELL);
        window.ctx.strokeStyle = `rgba(120,200,255,${0.4 + pulse * 0.5})`;
        window.ctx.lineWidth = 2;
        window.ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        window.ctx.fillStyle = `rgba(160,220,255,${0.5 + pulse * 0.4})`;
        window.ctx.beginPath();
        window.ctx.arc(x + CELL / 2, y + CELL / 2, 3 + pulse * 3, 0, Math.PI * 2);
        window.ctx.fill();
        continue;
      }
    }
  }
  if (window.levelMode && window.flagPosition && !window.flagCaptured) {
    const fx = window.flagPosition.x;
    const fy = window.flagPosition.y;
    const flagColor = window.flagPosition.team === "player" ? "#7de07d" : "#ff6b6b";
    window.ctx.save();
    window.ctx.fillStyle = "#888";
    window.ctx.fillRect(fx + 2, fy + 2, 2, CELL - 4);
    const wave = Math.sin(window.gtMs / 200) * 2;
    window.ctx.fillStyle = flagColor;
    window.ctx.beginPath();
    window.ctx.moveTo(fx + 4, fy + 4);
    window.ctx.lineTo(fx + 16 + wave, fy + 8);
    window.ctx.lineTo(fx + 4, fy + 16);
    window.ctx.closePath();
    window.ctx.fill();
    window.ctx.strokeStyle = "rgba(255,255,255,0.3)";
    window.ctx.lineWidth = 1;
    window.ctx.stroke();
    window.ctx.restore();
  }
}

export function drawGrassCell(c, r) {
  const x = c * CELL,
    y = r * CELL;
  const seed = (c * 7919 + r * 104729) % 97;
  window.ctx.save();
  window.ctx.shadowColor = "rgba(0,0,0,.4)";
  window.ctx.shadowBlur = 3;
  window.ctx.shadowOffsetY = 1;
  window.ctx.fillStyle = "#1a4a1e";
  window.ctx.fillRect(x, y, CELL, CELL);
  window.ctx.shadowColor = "transparent";
  window.ctx.shadowBlur = 0;
  window.ctx.shadowOffsetY = 0;
  window.ctx.strokeStyle = "#3f9e3f";
  window.ctx.lineWidth = 2;
  window.ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const gx = x + 2 + ((seed * (i + 3)) % 16);
    const gy = y + 2 + ((seed * (i + 5)) % 16);
    window.ctx.moveTo(gx, gy + 3);
    window.ctx.lineTo(gx + 1.5, gy);
    window.ctx.lineTo(gx + 3, gy + 3);
  }
  window.ctx.stroke();
  window.ctx.strokeStyle = "#2e7d2e";
  window.ctx.lineWidth = 2;
  window.ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const gx = x + 3 + ((seed * (i + 7)) % 14);
    const gy = y + 3 + ((seed * (i + 11)) % 14);
    window.ctx.moveTo(gx, gy + 3);
    window.ctx.lineTo(gx + 1.5, gy - 1);
    window.ctx.lineTo(gx + 3, gy + 3);
  }
  window.ctx.stroke();
  window.ctx.restore();
}

export function drawGrassOverlay() {
  const m = window.map;
  window.ctx.globalAlpha = 0.8;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (m[r][c] === GRASS) drawGrassCell(c, r);
  window.ctx.globalAlpha = 1;
}

export function drawTank(t) {
  if (!t.alive) return;
  if (t.invincible > 0 && Math.floor(window.gtMs / 100) % 2 === 0) {
    window.ctx.globalAlpha = 0.45;
  }
  const cx = t.x + t.w / 2,
    cy = t.y + t.h / 2;
  const ang = Math.atan2(t.dir.y, t.dir.x);
  const img = t.isPlayer ? playerImg : enemyImg;
  window.ctx.save();
  window.ctx.translate(cx, cy);
  window.ctx.rotate(ang + Math.PI / 2);
  if (img && img.complete && img.naturalWidth > 0) {
    window.ctx.drawImage(img, -t.w / 2 - 1, -t.h / 2 - 1, t.w + 2, t.h + 2);
  } else {
    window.ctx.fillStyle = t.isPlayer ? "#3f9e5a" : "#c0554a";
    window.ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
  }
  window.ctx.restore();
  if (t.isPlayer) {
    const label = AIPlayer.enabled ? AIPlayer.aiName : "玩家";
    window.ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
    window.ctx.textAlign = "center";
    window.ctx.textBaseline = "bottom";
    window.ctx.fillStyle = "rgba(0,0,0,.8)";
    window.ctx.fillText(label, cx + 1, cy - t.h / 2 - 5);
    window.ctx.fillStyle = "#e8ffcf";
    window.ctx.fillText(label, cx, cy - t.h / 2 - 6);
  }
  if (!t.isPlayer) {
    const pct = Math.max(0, t.hp / t.maxHp);
    window.ctx.fillStyle = "#1c1f1c";
    window.ctx.fillRect(cx - t.w / 2, cy - t.h / 2 - 6, t.w, 4);
    window.ctx.fillStyle = pct > 0.5 ? "#7de07d" : pct > 0.25 ? "#ffd76e" : "#ff6b6b";
    window.ctx.fillRect(cx - t.w / 2, cy - t.h / 2 - 6, t.w * pct, 4);
  }
  window.ctx.globalAlpha = 1;
}

export function drawBoss() {
  if (!window.boss || !window.boss.alive) return;

  if (window.boss.invincible > 0 && Math.floor(window.gtMs / 100) % 2 === 0) {
    window.ctx.globalAlpha = 0.45;
  }

  const cx = window.boss.x + window.boss.w / 2,
    cy = window.boss.y + window.boss.h / 2;

  window.ctx.save();
  window.ctx.translate(cx, cy);
  const ang = Math.atan2(window.boss.dir.y, window.boss.dir.x);
  window.ctx.rotate(ang + Math.PI / 2);

  if (bossImg && bossImg.complete && bossImg.naturalWidth > 0) {
    window.ctx.drawImage(
      bossImg,
      -window.boss.w / 2 - 1,
      -window.boss.h / 2 - 1,
      window.boss.w + 2,
      window.boss.h + 2,
    );
  } else {
    window.ctx.fillStyle = "#ee5253";
    window.ctx.fillRect(-window.boss.w / 2, -window.boss.h / 2, window.boss.w, window.boss.h);
  }
  window.ctx.restore();

  const pct = Math.max(0, window.boss.hp / window.boss.maxHp);
  window.ctx.fillStyle = "#1c1f1c";
  window.ctx.fillRect(cx - window.boss.w / 2, cy - window.boss.h / 2 - 6, window.boss.w, 4);
  window.ctx.fillStyle = pct > 0.5 ? "#7de07d" : pct > 0.25 ? "#ffd76e" : "#ff6b6b";
  window.ctx.fillRect(cx - window.boss.w / 2, cy - window.boss.h / 2 - 6, window.boss.w * pct, 4);

  window.ctx.globalAlpha = 1;
}

export function drawDogCage() {
  if (!window.levelMode || window.levelConfig?.objective.type !== "rescueDog")
    return;

  const cfg = window.levelConfig;
  if (!cfg?.dogCage) return;

  const { dogPosition, cageDoor } = cfg.dogCage;

  if (window.dogDoorLocked && cageDoor) {
    const doorX = cageDoor.c * CELL;
    const doorY = cageDoor.r * CELL;
    const pulse = 0.5 + 0.5 * Math.sin(window.gtMs / 300);

    window.ctx.fillStyle = `rgba(139, 69, 19, ${0.6 + pulse * 0.3})`;
    window.ctx.fillRect(doorX, doorY, CELL, CELL);

    window.ctx.fillStyle = "#8B4513";
    window.ctx.fillRect(doorX + 4, doorY + 4, CELL - 8, CELL - 8);

    window.ctx.fillStyle = "#FFD700";
    window.ctx.beginPath();
    window.ctx.arc(doorX + CELL / 2, doorY + CELL / 2, 4, 0, Math.PI * 2);
    window.ctx.fill();

    window.ctx.strokeStyle = "#FFD700";
    window.ctx.lineWidth = 2;
    window.ctx.beginPath();
    window.ctx.arc(doorX + CELL / 2, doorY + CELL / 2 - 4, 6, 0, Math.PI, true);
    window.ctx.stroke();

    window.ctx.font = "16px serif";
    window.ctx.textAlign = "center";
    window.ctx.textBaseline = "middle";
    window.ctx.fillText("🔒", doorX + CELL / 2, doorY + CELL / 2);
  }

  if (dogPosition && !window.dogRescued) {
    const dogX = dogPosition.c * CELL;
    const dogY = dogPosition.r * CELL;
    const cx = dogX + CELL / 2;
    const cy = dogY + CELL / 2;

    const pulse = 0.5 + 0.5 * Math.sin(window.gtMs / 200);
    const glowAlpha = window.dogDoorLocked ? 0.15 : 0.3 + pulse * 0.2;
    window.ctx.fillStyle = `rgba(125, 224, 125, ${glowAlpha})`;
    window.ctx.beginPath();
    window.ctx.arc(cx, cy, CELL * 1.2, 0, Math.PI * 2);
    window.ctx.fill();

    if (dogImg && dogImg.complete && dogImg.naturalWidth > 0) {
      window.ctx.drawImage(dogImg, dogX, dogY, CELL, CELL);
    } else {
      window.ctx.fillStyle = "#8B4513";
      window.ctx.beginPath();
      window.ctx.arc(cx, cy, CELL / 3, 0, Math.PI * 2);
      window.ctx.fill();
      window.ctx.fillStyle = "#000";
      window.ctx.beginPath();
      window.ctx.arc(cx - 3, cy - 3, 2, 0, Math.PI * 2);
      window.ctx.arc(cx + 3, cy - 3, 2, 0, Math.PI * 2);
      window.ctx.fill();
    }

    window.ctx.font = "18px serif";
    window.ctx.textAlign = "center";
    window.ctx.textBaseline = "middle";
    window.ctx.fillText("🐕", cx, cy);

    if (!window.dogDoorLocked) {
      window.ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
      window.ctx.fillStyle = "#7de07d";
      window.ctx.fillText("靠近解救", cx, cy + CELL + 10);
    }
  }
}

export function drawPlayer() {
  drawTank(window.player);
  if (window.player.shieldT > window.gtMs) {
    const cx = window.player.x + window.player.w / 2,
      cy = window.player.y + window.player.h / 2;
    window.ctx.strokeStyle = "rgba(88,166,255,.85)";
    window.ctx.lineWidth = 3;
    window.ctx.beginPath();
    window.ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    window.ctx.stroke();
    window.ctx.strokeStyle = "rgba(160,220,255,.4)";
    window.ctx.beginPath();
    window.ctx.arc(cx, cy, 27, window.gtMs / 200, window.gtMs / 200 + Math.PI * 1.4);
    window.ctx.stroke();
  }
}

export function drawBullets() {
  const arr = window.bullets;
  for (const b of arr) {
    window.ctx.fillStyle = b.owner === "player" ? "#ffd76e" : "#ff5a4a";
    window.ctx.beginPath();
    window.ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    window.ctx.fill();
    if (b.bounced) {
      window.ctx.strokeStyle = "rgba(255,255,255,.5)";
      window.ctx.beginPath();
      window.ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      window.ctx.stroke();
    }
  }
}

export function drawItems() {
  const arr = window.items;
  for (const it of arr) {
    const left = it.life - it.age * 1000;
    const blink = left < 3000 && Math.floor(window.gtMs / 150) % 2 === 0;
    if (blink) window.ctx.globalAlpha = 0.4;
    const x = it.x + CELL / 2,
      y = it.y + CELL / 2 + Math.sin(window.gtMs / 300 + it.x) * 2;
    window.ctx.fillStyle = it.def.color;
    window.ctx.globalAlpha *= 0.2;
    window.ctx.beginPath();
    window.ctx.arc(x, y, CELL / 2 - 4, 0, Math.PI * 2);
    window.ctx.fill();
    window.ctx.globalAlpha = blink ? 0.4 : 1;
    window.ctx.font = "20px serif";
    window.ctx.textAlign = "center";
    window.ctx.textBaseline = "middle";
    window.ctx.fillText(it.def.icon, x, y);
    window.ctx.globalAlpha = 1;
  }
}

export function drawMines() {
  for (const m of window.mines) {
    window.ctx.fillStyle = "#3a3a3a";
    window.ctx.beginPath();
    window.ctx.arc(m.x + 10, m.y + 10, 7, 0, Math.PI * 2);
    window.ctx.fill();
    window.ctx.fillStyle = "#c9845a";
    window.ctx.beginPath();
    window.ctx.arc(m.x + 10, m.y + 10, 4, 0, Math.PI * 2);
    window.ctx.fill();
    window.ctx.fillStyle = "#ffe14d";
    window.ctx.fillRect(m.x + 9, m.y + 2, 2, 2);
    window.ctx.globalAlpha = 1;
  }
}

export function drawDrones() {
  for (const dr of window.drones) {
    const pulse = 0.6 + 0.4 * Math.sin(window.gtMs / 120 + dr.x);
    window.ctx.fillStyle = `rgba(79,209,255,${0.3 + pulse * 0.3})`;
    window.ctx.beginPath();
    window.ctx.arc(dr.x, dr.y, 12, 0, Math.PI * 2);
    window.ctx.fill();
    window.ctx.fillStyle = "#4fd1ff";
    window.ctx.fillRect(dr.x - 2, dr.y - 7, 4, 14);
    window.ctx.fillRect(dr.x - 7, dr.y - 2, 14, 4);
    window.ctx.fillStyle = "#eaf9ff";
    window.ctx.beginPath();
    window.ctx.arc(dr.x, dr.y, 4, 0, Math.PI * 2);
    window.ctx.fill();
  }
}

export function drawCrates() {
  const crates = window.crates;
  if (!crates || !crates.length) return;
  
  for (const crate of crates) {
    const x = crate.x;
    const y = crate.y;
    
    window.ctx.fillStyle = "#8B6914";
    window.ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    
    window.ctx.fillStyle = "#A0791A";
    window.ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
    
    window.ctx.strokeStyle = "#6B5010";
    window.ctx.lineWidth = 2;
    window.ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
    
    window.ctx.strokeStyle = "#8B6914";
    window.ctx.lineWidth = 1;
    window.ctx.beginPath();
    window.ctx.moveTo(x + 3, y + 3);
    window.ctx.lineTo(x + CELL - 3, y + CELL - 3);
    window.ctx.moveTo(x + CELL - 3, y + 3);
    window.ctx.lineTo(x + 3, y + CELL - 3);
    window.ctx.stroke();
    
    window.ctx.fillStyle = "#C9A020";
    window.ctx.beginPath();
    window.ctx.arc(x + CELL / 2, y + CELL / 2, 3, 0, Math.PI * 2);
    window.ctx.fill();
  }
}

export function drawFallingStones() {
  const stones = window.fallingStones;
  if (!stones || !stones.length) return;
  
  for (const stone of stones) {
    if (stone.phase === "warning") {
      const cx = stone.x;
      const cy = stone.groundY;
      const pulse = 0.5 + 0.5 * Math.sin(window.gtMs / 150);
      
      window.ctx.fillStyle = `rgba(255, 60, 60, ${0.15 + pulse * 0.15})`;
      window.ctx.beginPath();
      window.ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      window.ctx.fill();
      
      window.ctx.strokeStyle = `rgba(255, 60, 60, ${0.4 + pulse * 0.4})`;
      window.ctx.lineWidth = 2;
      window.ctx.beginPath();
      window.ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      window.ctx.stroke();
      
      window.ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
      window.ctx.textAlign = "center";
      window.ctx.textBaseline = "middle";
      window.ctx.fillStyle = `rgba(255, 80, 80, ${0.7 + pulse * 0.3})`;
      window.ctx.fillText("落石袭来", cx, cy - 30);
    } else {
      const cx = stone.x;
      const cy = stone.y;
      
      window.ctx.fillStyle = "#8B7355";
      window.ctx.beginPath();
      window.ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      window.ctx.fill();
      
      window.ctx.fillStyle = "#6B5340";
      window.ctx.beginPath();
      window.ctx.arc(cx - 2, cy - 2, 6, 0, Math.PI * 2);
      window.ctx.fill();
      
      window.ctx.fillStyle = `rgba(139, 115, 85, 0.3)`;
      window.ctx.beginPath();
      window.ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      window.ctx.fill();
    }
  }
}

export function drawDebris() {
  const debris = window.debris;
  if (!debris || !debris.length) return;
  
  for (const d of debris) {
    const alpha = d.life / d.maxLife;
    const cx = d.x;
    const cy = d.y;
    
    window.ctx.globalAlpha = alpha * 0.6;
    window.ctx.fillStyle = "#6B5340";
    window.ctx.beginPath();
    window.ctx.arc(cx - 6, cy + 2, 4, 0, Math.PI * 2);
    window.ctx.fill();
    window.ctx.beginPath();
    window.ctx.arc(cx + 5, cy - 1, 3, 0, Math.PI * 2);
    window.ctx.fill();
    window.ctx.beginPath();
    window.ctx.arc(cx + 1, cy + 5, 5, 0, Math.PI * 2);
    window.ctx.fill();
    
    window.ctx.fillStyle = "#8B7355";
    window.ctx.beginPath();
    window.ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
    window.ctx.fill();
    window.ctx.beginPath();
    window.ctx.arc(cx + 7, cy + 3, 2, 0, Math.PI * 2);
    window.ctx.fill();
    
    window.ctx.globalAlpha = 1;
  }
}

export function drawParticles() {
  const arr = window.particles;
  for (const p of arr) {
    const a = 1 - p.life / p.max;
    window.ctx.globalAlpha = a;
    if (p.ring) {
      window.ctx.strokeStyle = p.color;
      window.ctx.lineWidth = 3;
      window.ctx.beginPath();
      window.ctx.arc(p.x, p.y, p.size * (1 - p.life / p.max) + 4, 0, Math.PI * 2);
      window.ctx.stroke();
    } else {
      window.ctx.fillStyle = p.color;
      window.ctx.beginPath();
      window.ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      window.ctx.fill();
    }
  }
  window.ctx.globalAlpha = 1;
}

export function drawFloats() {
  const arr = window.floats;
  window.ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
  window.ctx.textAlign = "center";
  window.ctx.textBaseline = "middle";
  for (const f of arr) {
    const a = 1 - f.life / f.max;
    window.ctx.globalAlpha = a;
    window.ctx.fillStyle = "#000";
    window.ctx.fillText(f.text, f.x + 1, f.y + 1);
    window.ctx.fillStyle = f.color;
    window.ctx.fillText(f.text, f.x, f.y);
  }
  window.ctx.globalAlpha = 1;
}
