<template>
  <div class="tank-game-wrap">
    <Map></Map>
    <div class="top-right">
      <div v-if="employeeId" class="user-info">工号：{{ employeeId }}</div>
      <a class="ranking-link" :href="rankingUrl" target="_blank">排 行 榜</a>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getUserInfoByToken } from "@/api";
import { getToken, getUserInfo } from "@/utils/user";
import Map from "./components/Map/index.vue";

const route = useRoute();
const router = useRouter();
const token = getToken();
const employeeId = ref("");
const rankingUrl = computed(() => {
  const tokenStr = new URLSearchParams(location.search).get("token");
  const query = tokenStr ? { token: tokenStr } : {};
  return router.resolve({ name: "Ranking", query }).href;
});

onMounted(async () => {
  if (token) {
    try {
      const userInfo = getUserInfo();
      employeeId.value = userInfo.employeeId || "";
    } catch (err) {
      console.error("获取用户信息失败:", err);
    }
  }
});
</script>

<style scoped>
.tank-game-wrap {
  position: absolute;
  inset: 0;
}
.top-right {
  position: absolute;
  top: 8px;
  right: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-info {
  background: rgba(255, 255, 255, 0.1);
  color: #cfe3cf;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 14px;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.ranking-link {
  background: rgba(255, 255, 255, 0.1);
  color: #cfe3cf;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 14px;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  text-decoration: none;
  cursor: pointer;
}
.ranking-link:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
