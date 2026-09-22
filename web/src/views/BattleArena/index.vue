<template>
  <div id="wrap">
    <div id="game-area">
      <Hud />
      <div id="canvas-wrap">
        <canvas id="game"></canvas>
        <StartOverlay @start="handleStart" />
        <GameOverOverlay @restart="handleRestart" />
        <PauseOverlay @resume="handleResume" />
      </div>
      <ButtonGroup
        @pause="handlePause"
        @restart="handleRestart"
        @fullscreen="handleFullscreen"
      />
    </div>
    <TankPanel @import="handleImport" @terminate="terminateBattle" />
    <input
      type="file"
      id="ai-file-multi"
      accept=".js"
      multiple
      style="display: none"
    />
    <GameModal
      :visible="modalVisible"
      :message="modalMessage"
      @confirm="modalVisible = false"
      @close="modalVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import {
  initBattleGame,
  startBattle,
  toggleBattlePause,
  terminateBattle,
} from "./logic/battleEngine.js";
import { importAIFiles } from "./logic/aiManager.js";
import Hud from "./components/Hud.vue";
import StartOverlay from "./components/StartOverlay.vue";
import GameOverOverlay from "./components/GameOverOverlay.vue";
import PauseOverlay from "./components/PauseOverlay.vue";
import TankPanel from "./components/TankPanel.vue";
import ButtonGroup from "./components/ButtonGroup.vue";
import GameModal from "@/components/GameModal.vue";

const modalVisible = ref(false);
const modalMessage = ref("");

function showModal(message) {
  modalMessage.value = message;
  modalVisible.value = true;
}

function handleStart() {
  startBattle(showModal);
}

function handleRestart() {
  startBattle(showModal);
}

function handlePause() {
  toggleBattlePause();
}

function handleResume() {
  toggleBattlePause();
}

function handleFullscreen() {
  const reqFs = document.documentElement.requestFullscreen;
  const webkitReqFs = document.documentElement.webkitRequestFullscreen;
  const exitFs = document.exitFullscreen;
  const webkitExitFs = document.documentElement.webkitExitFullscreen;
  if (!document.fullscreenElement) {
    (reqFs || webkitReqFs).call(document.documentElement);
  } else {
    (exitFs || webkitExitFs)();
  }
}

function handleImport(files) {
  importAIFiles(files);
}

onMounted(() => {
  initBattleGame(document.getElementById("game"));
});

onUnmounted(() => {
  if (window.gameLoopId) {
    cancelAnimationFrame(window.gameLoopId);
    window.gameLoopId = null;
  }
  window.state = "start";
  window.tanks = [];
  window.bullets = [];
  window.items = [];
  window.mines = [];
  window.drones = [];
  window.particles = [];
  window.floats = [];
  window.boss = null;
  window.lastTeleport = {};
  window.gtMs = 0;
  window.gameSpeed = 1;
  window.map = [];
  window.gates = [];
  window.crackHp = {};
  window.mapGenerated = false;
  window.itemSpawnTimer = 3;
  window.battleLastTime = 0;
  window.battleOvPause = null;
});
</script>

<style scoped>
#wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: #1a2118;
  overflow: hidden;
}

#game-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 100%;
}

#canvas-wrap {
  position: relative;
  flex-shrink: 1;
  min-width: 0;
}

canvas {
  display: block;
  background: #1a2118;
  border: 2px solid #3a4a3a;
  border-radius: 6px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
  touch-action: none;
}
</style>
