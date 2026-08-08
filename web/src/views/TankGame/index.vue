<template>
  <Map></Map>
</template>
<script setup>
import { onMounted } from "vue";
import Map from "./components/Map/index.vue";
import { initGame } from "./script/base.js";
import { AIPlayer } from "./script/ai-player.js";
import DefaultAI from "./script/ai-tanker/default-tank.js";
import HunterAI from "./script/ai-tanker/hunter-tank.js";
// ====================== 默认启用内置 AI ======================
AIPlayer.setDefault(HunterAI);

onMounted(() => {
  initGame();
});
</script>

