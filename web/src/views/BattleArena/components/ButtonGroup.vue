<template>
  <div id="btn-group">
    <button
      id="btn-pause"
      v-show="gameState === 'playing' || gameState === 'paused'"
      @click="$emit('pause')"
    >
      暂停 P
    </button>
    <button
      id="btn-restart2"
      v-show="gameState === 'playing' || gameState === 'paused'"
      @click="$emit('restart')"
    >
      重新开始 R
    </button>
    <button id="btn-speed">⏩ 1x</button>
    <button id="btn-fullscreen" @click="$emit('fullscreen')">⛶ 全屏 F</button>
  </div>
</template>

<script setup>
import { gameState } from "../logic/gameState.js";

defineEmits(["pause", "restart", "fullscreen"]);
</script>

<style scoped>
#btn-group {
  display: flex;
  gap: 8px;
}

#btn-group button {
  background: #26332b;
  color: #cfe3cf;
  border: 1px solid #4a5a4a;
  padding: 8px 22px;
  border-radius: 20px;
  font-size: 15px;
  cursor: pointer;
}

#btn-group button:active {
  background: #3a4a3a;
}
</style>
