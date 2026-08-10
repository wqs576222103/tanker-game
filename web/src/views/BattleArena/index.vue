<template>
  <div id="wrap">
    <div id="canvas-wrap">
      <canvas id="game"></canvas>
      <Hud />
      <StartOverlay @start="handleStart" />
      <GameOverOverlay @restart="handleRestart" />
      <PauseOverlay @resume="handleResume" />
      <ButtonGroup
        @pause="handlePause"
        @restart="handleRestart"
        @fullscreen="handleFullscreen"
      />
    </div>
    <TankPanel @import="handleImport" />
    <input
      type="file"
      id="ai-file-multi"
      accept=".js"
      multiple
      style="display: none"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import {
  initBattleGame,
  startBattle,
  toggleBattlePause,
} from "./logic/battleEngine.js";
import { importAIFiles } from "./logic/aiManager.js";
import Hud from "./components/Hud.vue";
import StartOverlay from "./components/StartOverlay.vue";
import GameOverOverlay from "./components/GameOverOverlay.vue";
import PauseOverlay from "./components/PauseOverlay.vue";
import TankPanel from "./components/TankPanel.vue";
import ButtonGroup from "./components/ButtonGroup.vue";

function handleStart() {
  startBattle();
}

function handleRestart() {
  startBattle();
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
  const webkitExitFs = document.webkitExitFullscreen;
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
  }
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
