<template>
  <Map></Map>
</template>
<script setup>
import { onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { getUserInfoByToken } from "@/api";
import { getToken, getUserInfo } from "@/utils/user";
import Map from "./components/Map/h5Map.vue";
import { initGame } from "./script/base.js";
import { AIPlayer } from "./script/ai-player.js";
import SurvivalAI from "./script/ai-tanker/survival-tank.js";
import DefaultAI from "./script/ai-tanker/default-tank.js";

const route = useRoute();
const token = getToken();

onMounted(async () => {
  if (token.value) {
    try {
      const userInfo = await getUserInfoByToken(token.value);
      console.log("用户信息:", userInfo);
    } catch (err) {
      console.error("获取用户信息失败:", err);
    }
  }
  initGame();
});

const ai = route.query.ai;
AIPlayer.setDefault(ai === "wangqs" ? SurvivalAI : DefaultAI);
</script>
