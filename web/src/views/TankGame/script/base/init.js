import { CELL, W, H, CRACK, GRASS } from "./constants.js";
import { initCanvas } from "./constants.js";
import { keys } from "./constants.js";
import { resetGame, startGame, togglePause, gameOver } from "./game-flow.js";
import { toggleSfx, playBgm } from "./audio.js";
import { updateHud, loadHighScore } from "./hud.js";
import { spawnItemAtCell } from "./items.js";
import { AIPlayer } from "../ai-player.js";
import { AILogger } from "../ai-logger.js";
import { stopGameLoop, startRaf } from "./loop.js";

// ====================== UI 初始化 ======================
export function initGame() {
  if (window.__tankGameInited) {
    window.gameSpeed = 1;
    const btnSpeed = document.getElementById("btn-speed");
    if (btnSpeed) btnSpeed.textContent = "⏩ 1x";
    resetGame();
    return;
  }
  window.__tankGameInited = true;
  initCanvas();

  // ====================== 输入 ======================
  document.addEventListener("keydown", (e) => {
    if (window.state !== "playing" && window.state !== "paused") {
      if (e.code === "Space" || e.code === "Enter") {
        startGame();
        e.preventDefault();
      }
      return;
    }
    const k = e.key.toLowerCase();
    if (e.code === "Space") {
      keys.fire = true;
      e.preventDefault();
    } else if (e.code === "KeyJ") keys.fire = true;
    else if (k === "w" || e.code === "ArrowUp") {
      keys.up = true;
      e.preventDefault();
    } else if (k === "s" || e.code === "ArrowDown") {
      keys.down = true;
      e.preventDefault();
    } else if (k === "a" || e.code === "ArrowLeft") {
      keys.left = true;
      e.preventDefault();
    } else if (k === "d" || e.code === "ArrowRight") {
      keys.right = true;
      e.preventDefault();
    } else if (k === "k") {
      if (window.state === "playing") keys.mine = true;
    } else if (k === "p") togglePause();
    else if (k === "r" && window.state !== "start") startGame();
    else if (k === "t" && window.state === "playing") toggleAI();
  });
  document.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (e.code === "Space" || e.code === "KeyJ") keys.fire = false;
    else if (k === "w" || e.code === "ArrowUp") keys.up = false;
    else if (k === "s" || e.code === "ArrowDown") keys.down = false;
    else if (k === "a" || e.code === "ArrowLeft") keys.left = false;
    else if (k === "d" || e.code === "ArrowRight") keys.right = false;
    else if (k === "k") keys.mine = false;
  });

  // 移动端按钮
  document.querySelectorAll("#controls [data-key]").forEach((btn) => {
    const k = btn.dataset.key;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      keys[k] = true;
    });
    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      keys[k] = false;
    });
    btn.addEventListener("pointerleave", () => {
      keys[k] = false;
    });
    btn.addEventListener("pointercancel", () => {
      keys[k] = false;
    });
  });

  window.addEventListener(
    "keydown",
    (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
    },
    { passive: false },
  );

  document.getElementById("btn-start").addEventListener("click", startGame);
  document.getElementById("btn-restart").addEventListener("click", startGame);
  document.getElementById("btn-restart2").addEventListener("click", () => {
    if (window.state !== "start") startGame();
  });
  document.getElementById("btn-pause").addEventListener("click", () => {
    if (window.state === "playing" || window.state === "paused") togglePause();
  });
  document.getElementById("btn-resume").addEventListener("click", togglePause);

  const sfxBtn = document.getElementById("btn-sfx");
  sfxBtn.addEventListener("click", toggleSfx);
  sfxBtn.classList.toggle("active", window.sfxEnabled);
  sfxBtn.textContent = window.sfxEnabled ? "🔊 音效" : "🔇 音效";

  const btnAI = document.getElementById("btn-ai");
  btnAI.addEventListener("click", toggleAI);

  const btnSpeed = document.getElementById("btn-speed");
  const SPEEDS = [1, 2, 4, 8];
  function cycleSpeed() {
    const idx = SPEEDS.indexOf(window.gameSpeed);
    window.gameSpeed = SPEEDS[(idx + 1) % SPEEDS.length];
    btnSpeed.textContent = "⏩ " + window.gameSpeed + "x";
  }
  btnSpeed.addEventListener("click", () => {
    cycleSpeed();
  });

  function toggleAI() {
    const enabled = AIPlayer.toggle();
    btnAI.classList.toggle("active", enabled);
    if (!enabled) {
      window.gameSpeed = 1;
      btnSpeed.textContent = "⏩ 1x";
    }
  }

  // ====================== AI 日志面板 ======================
  function showAILog() {
    const records = AILogger.getRecords();
    const content = document.getElementById("ai-log-content");

    if (records.length === 0) {
      content.innerHTML =
        '<p style="color:#9fb6a6;text-align:center">暂无淘汰日志</p>';
    } else {
      content.innerHTML = records
        .map(
          (r, i) => `
      <div class="log-item">
        <div class="log-header">淘汰 #${i + 1} - ${
          r.type === "ai" ? `🤖 ${r.aiName || "AI"}` : "🎮 玩家"
        } - ${r.deathReason}</div>
        <div class="log-detail">时间: <span>${new Date(r.timestamp).toLocaleString()}</span></div>
        <div class="log-detail">击杀: <span>${r.kills ?? 0}</span></div>
        <div class="log-detail">Boss击杀: <span>${r.bossKills ?? 0}</span></div>
        <div class="log-detail">位置: <span>(${Math.round(r.playerState.x)}, ${Math.round(r.playerState.y)})</span></div>
        ${
          r.type === "ai"
            ? `<div class="log-detail">躲避中: <span>${r.aiState.wasDodging ? "是" : "否"}</span></div>`
            : ""
        }
        <div class="log-detail">环境 - 敌人数: <span>${r.surroundings.enemyCount}</span> | 子弹数: <span>${r.surroundings.bulletCount}</span></div>
        ${r.surroundings.threatBullets.length > 0 ? `<div class="log-detail">威胁子弹: <span>${r.surroundings.threatBullets.length}个</span></div>` : ""}
        ${
          r.type === "ai" && r.decisionLog.length > 0
            ? `
          <div class="log-decisions">
            <div style="margin-bottom:4px;font-weight:bold">决策历史 (最近${r.decisionLog.length}次):</div>
            ${r.decisionLog
              .slice(-5)
              .map(
                (d) => `
              <div>[${d.time.toFixed(1)}s] ${d.action}</div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `,
        )
        .join("");
    }

    document.getElementById("ov-ai-log").classList.remove("hidden");
  }

  function hideAILog() {
    document.getElementById("ov-ai-log").classList.add("hidden");
  }

  function exportAILog() {
    const json = AILogger.exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `death-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAILog() {
    AILogger.clear();
    document.getElementById("ai-log-content").innerHTML =
      '<p style="color:#9fb6a6;text-align:center">日志已清除</p>';
    const logBtn = document.getElementById("btn-ai-log");
    if (logBtn) logBtn.textContent = "淘汰日志 (0)";
  }

  document.getElementById("btn-ai-log").addEventListener("click", showAILog);
  document.getElementById("btn-close-log").addEventListener("click", hideAILog);
  document
    .getElementById("btn-export-log")
    .addEventListener("click", exportAILog);
  document
    .getElementById("btn-clear-log")
    .addEventListener("click", clearAILog);
  document
    .getElementById("btn-export-death-log")
    .addEventListener("click", showAILog);

  // ====================== 画面缩放 / 全屏 ======================
  function isFullscreen() {
    return !!document.fullscreenElement;
  }

  function fitCanvas() {
    const pad = 10;
    let availW = window.innerWidth - pad;
    let availH = window.innerHeight - pad;
    const hud = document.getElementById("hud");
    const group = document.getElementById("btn-group");
    const statusEl = document.getElementById("ai-status");
    const controls = document.getElementById("controls");
    const chromeH =
      (hud ? hud.offsetHeight : 0) +
      (group ? group.offsetHeight + 8 : 0) +
      (statusEl && statusEl.style.display !== "none"
        ? statusEl.offsetHeight + 6
        : 0) +
      (controls && getComputedStyle(controls).display !== "none"
        ? controls.offsetHeight
        : 0);
    availH -= chromeH;
    const scale = Math.min(availW / W, availH / H);
    canvas.style.width = Math.round(W * scale) + "px";
    canvas.style.height = Math.round(H * scale) + "px";
  }

  function toggleFullscreen() {
    if (isFullscreen()) {
      document.exitFullscreen();
    } else {
      (
        document.documentElement.requestFullscreen ||
        document.documentElement.webkitRequestFullscreen
      ).call(document.documentElement);
    }
  }

  document
    .getElementById("btn-fullscreen")
    .addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", fitCanvas);
  document.addEventListener("webkitfullscreenchange", fitCanvas);
  window.addEventListener("resize", fitCanvas);
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyF") toggleFullscreen();
  });

  fitCanvas();

  window.addEventListener("blur", () => {
    if (window.state === "playing" && !AIPlayer.enabled) togglePause();
  });

  // ====================== 启动 ======================
  resetGame();
  updateHud();
  loadHighScore();
  window.gameSpeed = 1;
  document.getElementById("btn-speed").textContent = "⏩ 1x";

  playBgm();
  const resumeBgm = () => {
    if (window.state !== "playing") playBgm();
    window.removeEventListener("pointerdown", resumeBgm);
    window.removeEventListener("keydown", resumeBgm);
  };
  window.addEventListener("pointerdown", resumeBgm);
  window.addEventListener("keydown", resumeBgm);

  startRaf();
}
