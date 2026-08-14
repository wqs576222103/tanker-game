<template>
  <div class="tank-game-wrap">
    <Map></Map>
    <div v-if="employeeId" class="user-info">工号：{{ employeeId }}</div>
  </div>
</template>
<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { getUserInfoByToken } from "@/api";
import { getToken, getUserInfo } from "@/utils/user";
import Map from "./components/Map/index.vue";
import { initGame } from "./script/base.js";
import { AIPlayer } from "./script/ai-player.js";
import SurvivalAI from "./script/ai-tanker/survival-tank.js";

const route = useRoute();
const token = getToken();
const employeeId = ref("");

onMounted(async () => {
  if (token) {
    try {
      const userInfo = getUserInfo();
      employeeId.value = userInfo.employeeId || "";
    } catch (err) {
      console.error("获取用户信息失败:", err);
    }
  }
  initGame();
});

AIPlayer.setDefault(SurvivalAI);
</script>

<style scoped>
.tank-game-wrap {
  position: absolute;
  inset: 0;
}
.user-info {
  position: absolute;
  top: 8px;
  right: 16px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.1);
  color: #cfe3cf;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 14px;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
</style>
