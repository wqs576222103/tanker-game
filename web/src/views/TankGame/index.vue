<template>
  <Map></Map>
</template>
<script setup>
import { onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { getUserInfoByToken } from "@/api";
import Map from "./components/Map/index.vue";
import { initGame } from "./script/base.js";
import { AIPlayer } from "./script/ai-player.js";
import SurvivalAI from "./script/ai-tanker/survival-tank.js";

const route = useRoute();
const token = computed(() => route.query.token);

onMounted(async () => {
  if (token.value) {
    try {
      // const userInfo = await getUserInfoByToken(token.value);
      // console.log("用户信息:", userInfo);
    } catch (err) {
      console.error("获取用户信息失败:", err);
    }
  }
  initGame();
});

AIPlayer.setDefault(SurvivalAI);
</script>
