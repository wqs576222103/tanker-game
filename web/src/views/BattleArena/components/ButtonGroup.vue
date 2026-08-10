<template>
  <div id="btn-group">
    <button id="btn-pause" @click="$emit('pause')">暂停 P</button>
    <button id="btn-restart2" @click="$emit('restart')">重新开始 R</button>
    <button id="btn-speed">⏩ 1x</button>
    <button id="btn-fullscreen" @click="$emit('fullscreen')">⛶ 全屏 F</button>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";

const emit = defineEmits(["pause", "restart", "fullscreen"]);

const onKeydown = (e) => {
  if (e.key.toLowerCase() === "p") {
    emit("pause");
  } else if (e.key.toLowerCase() === "r") {
    emit("restart");
  } else if (e.key.toLowerCase() === "f") {
    emit("fullscreen");
  } else if (e.key >= "1" && e.key <= "8") {
    const idx = ["1", "2", "4", "8"].indexOf(e.key);
    if (idx >= 0) {
      window.gameSpeed = [1, 2, 4, 8][idx];
      const btn = document.getElementById("btn-speed");
      if (btn) btn.textContent = `⏩ ${window.gameSpeed}x`;
    }
  }
};

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
#btn-group {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
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
