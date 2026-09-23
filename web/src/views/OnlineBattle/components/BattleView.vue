<template>
  <div id="online-wrap">
    <div id="online-game-area">
      <div id="online-hud">
        <div class="hud-left">
          <span class="hud-label">玩家</span>
          <span id="online-hud-alive" class="hud-value">{{ aliveCount }}</span>
        </div>
        <div class="hud-center">
          <span v-if="myBuffs.length" class="hud-buffs">{{ myBuffs.join(" ") }}</span>
        </div>
        <div class="hud-right">
          <span class="hud-label">地雷</span>
          <span class="hud-value">{{ myMines }}</span>
          <span id="online-hud-time" class="hud-value" style="margin-left: 12px">{{ gameTime }}</span>
        </div>
      </div>

      <div id="online-canvas-wrap">
        <canvas id="online-game"></canvas>

        <div v-if="gamePhase === 'countdown'" class="overlay countdown-overlay">
          <div class="countdown-number">{{ countdownSec }}</div>
        </div>

        <div v-if="gamePhase === 'waiting'" class="overlay waiting-overlay">
          <div class="waiting-text">等待其他玩家...</div>
        </div>

        <div v-if="gamePhase === 'playing' && !myAlive && respawnSec > 0" class="overlay respawn-overlay">
          <div class="respawn-text">{{ respawnSec }} 秒后复活</div>
        </div>

        <div v-if="gamePhase === 'over'" class="overlay gameover-overlay">
          <div class="gameover-box">
            <div class="gameover-title">{{ gameOverText }}</div>
            <div class="gameover-stats">{{ gameOverStats }}</div>
            <button class="btn-gameover" @click="backToRoom">返回房间</button>
          </div>
        </div>
      </div>

      <div id="online-btn-group">
        <button class="ctrl-btn" @click="toggleFullscreen">全屏</button>
        <button class="ctrl-btn" @click="backToRoom">退出</button>
      </div>
      <div class="ctrl-hint">方向键/WASD 移动 · 空格/J 射击 · K/L 放雷 · 8分钟决胜 · 可随时退出</div>
    </div>

    <div id="online-player-panel">
      <div class="panel-title">玩家列表</div>
      <div class="panel-list">
        <div
          v-for="(p, idx) in sortedPlayers"
          :key="p.id"
          class="panel-player"
          :class="{ 'is-dead': !p.alive, 'is-me': p.id === mySocketId }"
        >
          <span class="panel-rank">{{ idx + 1 }}</span>
          <span class="panel-color" :style="{ background: p.color }"></span>
          <span class="panel-name">{{ p.username }}</span>
          <span class="panel-hp">{{ p.alive ? `HP:${Math.ceil(p.hp)}` : deathLabel(p) }}</span>
          <span class="panel-score">{{ p.score }}分</span>
          <span class="panel-kd">{{ p.kills }}杀{{ p.deaths }}淘汰</span>
        </div>
      </div>
      <div class="panel-room-info">
        <span>房间: {{ roomId }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { getSocket } from "@/utils/socket";
import {
  setOnlineCtx,
  updateServerState,
  drawOnlineBattle,
  cleanupOnlineEngine,
  playItemFx,
  playTeleportFx,
  playDeathFx,
  playRespawnFx,
} from "../logic/onlineEngine.js";

const socket = getSocket();
const emit = defineEmits(["back"]);

const gamePhase = ref("waiting");
const countdownSec = ref(3);
const aliveCount = ref(0);
const gameTime = ref("0:00");
const myMines = ref(0);
const roomId = ref("");
const mySocketId = ref(socket.id);
const remotePlayers = ref([]);
const gameOverText = ref("");
const gameOverStats = ref("");
const myBuffs = ref([]);
const myAlive = ref(true);
const respawnSec = ref(0);
let animFrameId = null;

const sortedPlayers = computed(() => {
  return [...remotePlayers.value].sort((a, b) => b.score - a.score);
});

function deathLabel(p) {
  const sec = p.respawnIn > 0 ? Math.ceil(p.respawnIn / 1000) : 0;
  return sec > 0 ? `${sec}s复活` : "淘汰";
}

function buildBuffs(me, gtMs) {
  if (!me || !me.alive) return [];
  const arr = [];
  if (me.shieldT > gtMs) arr.push(`🛡️${Math.ceil((me.shieldT - gtMs) / 1000)}s`);
  if (me.fireT > gtMs) arr.push(`⚡${Math.ceil((me.fireT - gtMs) / 1000)}s`);
  if (me.speedT > gtMs) arr.push(`💨${Math.ceil((me.speedT - gtMs) / 1000)}s`);
  if (me.spreadT > gtMs) arr.push(`✨${Math.ceil((me.spreadT - gtMs) / 1000)}s`);
  if (me.drones > 0) arr.push(`🚁${me.drones}`);
  if (me.bounces) arr.push("🔄");
  return arr;
}

let redirectTimer = null;

onMounted(() => {
  roomId.value = socket._lastRoomId || "";
  setupCanvas();
  setupSocketListeners();
  setupKeyboard();
  if (socket._pendingGameState) {
    gamePhase.value = "playing";
    updateServerState(null, socket._pendingGameState);
    socket._pendingGameState = null;
  } else {
    redirectTimer = setTimeout(() => {
      if (gamePhase.value === "waiting") {
        emit("back");
      }
    }, 3000);
  }
});

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (redirectTimer) clearTimeout(redirectTimer);
  cleanupOnlineEngine();
  removeKeyboard();
  if (socket._bvHandlers) {
    Object.entries(socket._bvHandlers).forEach(([ev, fn]) => socket.off(ev, fn));
    socket._bvHandlers = null;
  }
});

function setupCanvas() {
  const canvas = document.getElementById("online-game");
  if (!canvas) return;
  canvas.width = 900;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  setOnlineCtx(ctx);
  fitCanvas();
  window.addEventListener("resize", fitCanvas);
  animFrameId = requestAnimationFrame(renderLoop);
}

function renderLoop() {
  drawOnlineBattle();
  animFrameId = requestAnimationFrame(renderLoop);
}

function fitCanvas() {
  const canvas = document.getElementById("online-game");
  if (!canvas) return;
  const area = document.getElementById("online-game-area");
  const hud = document.getElementById("online-hud");
  const btns = document.getElementById("online-btn-group");
  if (!area) return;
  const pad = 20;
  const hudH = hud ? hud.offsetHeight : 0;
  const btnH = btns ? btns.offsetHeight : 0;
  const availW = area.clientWidth - pad;
  const availH = area.clientHeight - hudH - btnH - pad;
  if (availW <= 0 || availH <= 0) return;
  const scale = Math.min(availW / 900, availH / 600);
  canvas.style.width = Math.round(900 * scale) + "px";
  canvas.style.height = Math.round(600 * scale) + "px";
}

function setupSocketListeners() {
  socket._bvHandlers = {
    countdown: (data) => {
      gamePhase.value = "countdown";
      countdownSec.value = data.seconds;
    },
    "game-start": (data) => {
      gamePhase.value = "playing";
      socket._lastRoomId = roomId.value;
      updateServerState(null, data);
    },
    "game-state": (data) => {
      updateServerState(data, null);
      aliveCount.value = data.tanks ? data.tanks.filter((t) => t.alive).length : 0;
      remotePlayers.value = data.tanks || [];
      const me = data.tanks ? data.tanks.find((t) => t.id === mySocketId.value) : null;
      myMines.value = me ? me.mines || 0 : 0;
      myAlive.value = me ? !!me.alive : false;
      respawnSec.value = me && !me.alive ? Math.ceil((me.respawnIn || 0) / 1000) : 0;
      myBuffs.value = buildBuffs(me, data.gtMs || 0);
      if (data.gtMs) {
        const mins = Math.floor(data.gtMs / 60000);
        const secs = Math.floor((data.gtMs % 60000) / 1000);
        gameTime.value = `${mins}:${secs.toString().padStart(2, "0")}`;
      }
    },
    "game-over": (data) => {
      gamePhase.value = "over";
      respawnSec.value = 0;
      if (data.isDraw) {
        gameOverText.value = "平局！";
      } else if (data.winner) {
        gameOverText.value = `${data.winner.username || data.winner.tankName} 获胜！`;
      } else {
        gameOverText.value = "对战结束";
      }
      gameOverStats.value = data.players
        ? data.players.map((p) => `${p.username}: ${p.score}分(${p.kills}杀${p.deaths}淘汰)`).join("　")
        : "";
    },
    "player-left": (data) => {
      remotePlayers.value = data.players || [];
    },
    "item-picked": (data) => {
      playItemFx(data);
    },
    teleported: (data) => {
      playTeleportFx(data);
    },
    "player-died": (data) => {
      playDeathFx(data);
    },
    "player-respawned": (data) => {
      playRespawnFx(data);
    },
  };
  Object.entries(socket._bvHandlers).forEach(([ev, fn]) => socket.on(ev, fn));
}

const keysDown = new Set();
let inputTimer = null;
let minePulse = false;

function setupKeyboard() {
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  inputTimer = setInterval(sendInput, 1000 / 30);
}

function removeKeyboard() {
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("keyup", onKeyUp);
  if (inputTimer) clearInterval(inputTimer);
}

function onKeyDown(e) {
  const code = e.code;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) {
    e.preventDefault();
  }
  if ((code === "KeyK" || code === "KeyL") && gamePhase.value === "playing") {
    socket.emit("player-input", {
      up: keysDown.has("ArrowUp") || keysDown.has("KeyW"),
      down: keysDown.has("ArrowDown") || keysDown.has("KeyS"),
      left: keysDown.has("ArrowLeft") || keysDown.has("KeyA"),
      right: keysDown.has("ArrowRight") || keysDown.has("KeyD"),
      fire: keysDown.has("Space") || keysDown.has("KeyJ"),
      mine: true,
    });
    minePulse = true;
    setTimeout(() => { minePulse = false; }, 100);
  }
  keysDown.add(code);
}

function onKeyUp(e) {
  keysDown.delete(e.code);
}

function sendInput() {
  if (gamePhase.value !== "playing") return;
  const input = {
    up: keysDown.has("ArrowUp") || keysDown.has("KeyW"),
    down: keysDown.has("ArrowDown") || keysDown.has("KeyS"),
    left: keysDown.has("ArrowLeft") || keysDown.has("KeyA"),
    right: keysDown.has("ArrowRight") || keysDown.has("KeyD"),
    fire: keysDown.has("Space") || keysDown.has("KeyJ"),
    mine: minePulse,
  };
  socket.emit("player-input", input);
}

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
}

function backToRoom() {
  if (gamePhase.value === "playing" || gamePhase.value === "countdown") {
    socket.emit("leave-battle");
  }
  emit("back");
}
</script>

<style scoped>
#online-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  background: #1a2118;
  overflow: hidden;
}

#online-game-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 100%;
  min-width: 0;
}

#online-hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 900px;
  max-width: 100%;
  padding: 4px 12px;
  background: #1e2a1c;
  border: 1px solid #3a4a3a;
  border-radius: 4px;
  font-size: 13px;
  flex-shrink: 0;
}

.hud-label {
  color: #8a9a8a;
  margin-right: 4px;
}

.hud-value {
  color: #7de07d;
  font-weight: bold;
}

.hud-buffs {
  margin-left: 12px;
  color: #ffeaa7;
  font-weight: bold;
}

.respawn-text {
  font-size: 32px;
  font-weight: bold;
  color: #ffeaa7;
  text-shadow: 0 0 20px rgba(255, 234, 167, 0.5);
}

#online-canvas-wrap {
  position: relative;
  flex-shrink: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

#online-game {
  display: block;
  background: #1a2118;
  border: 2px solid #3a4a3a;
  border-radius: 6px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
  touch-action: none;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10;
}

.countdown-number {
  font-size: 80px;
  font-weight: bold;
  color: #7de07d;
  text-shadow: 0 0 30px rgba(125, 224, 125, 0.6);
  animation: countPulse 1s infinite;
}

@keyframes countPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.waiting-text {
  font-size: 24px;
  color: #ffeaa7;
}

.gameover-box {
  text-align: center;
  padding: 24px 40px;
  background: #1e2a1c;
  border: 2px solid #7de07d;
  border-radius: 12px;
}

.gameover-title {
  font-size: 28px;
  font-weight: bold;
  color: #ffeaa7;
  margin-bottom: 12px;
}

.gameover-stats {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 20px;
}

.btn-gameover {
  padding: 10px 32px;
  background: #7de07d;
  color: #1a2118;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.btn-gameover:hover {
  background: #8ef08e;
}

#online-btn-group {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.ctrl-btn {
  padding: 6px 16px;
  background: #3a4a3a;
  color: #ccc;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.ctrl-btn:hover {
  background: #4a5a4a;
}

#online-player-panel {
  width: 260px;
  background: #1e2a1c;
  border-left: 1px solid #3a4a3a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.panel-title {
  padding: 12px 16px;
  font-size: 15px;
  font-weight: bold;
  color: #7de07d;
  border-bottom: 1px solid #3a4a3a;
}

.panel-list {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-player {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #2a3a2a;
  border-radius: 4px;
  font-size: 12px;
}

.panel-player.is-dead {
  opacity: 0.5;
}

.panel-player.is-me {
  border: 1px solid #7de07d;
}

.panel-rank {
  width: 18px;
  text-align: center;
  color: #8a9a8a;
  font-weight: bold;
}

.panel-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.panel-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff;
}

.panel-hp {
  color: #8a9a8a;
}

.panel-score {
  color: #ffeaa7;
  font-weight: bold;
}

.panel-kd {
  color: #8a9a8a;
}

.panel-room-info {
  padding: 8px 16px;
  border-top: 1px solid #3a4a3a;
  font-size: 12px;
  color: #6a7a6a;
}
</style>
