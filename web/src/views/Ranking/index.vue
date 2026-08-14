<template>
  <div class="ranking-wrap">
    <div class="ranking-header">
      <div class="title">坦克击杀排名</div>
      <div class="subtitle">TIME TANK KILL RANKING</div>
    </div>

    <div class="search-bar">
      <input
        v-model.trim="searchQuery"
        type="text"
        placeholder="按工号搜索..."
      />
      <span v-if="searchQuery" class="search-count">
        匹配 {{ filteredRankings.length }} 条
      </span>
    </div>

    <div class="ranking-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="rankings.length === 0" class="empty">暂无排名数据</div>
      <div v-else-if="filteredRankings.length === 0" class="empty">
        未找到工号 "{{ searchQuery }}" 的排名
      </div>
      <div v-else class="list">
        <div
          v-for="{ item, index } in filteredRankings"
          :key="item.id || index"
          class="rank-item"
          :class="[getRankClass(index), { 'rank-mine': isMe(item) }]"
        >
          <div class="rank-num">{{ getMedal(index) }}</div>
          <div class="rank-info">
            <div class="rank-name">
              <span v-if="isMe(item)" class="my-tag">我的</span>
              {{ item.name || "匿名玩家" }}
            </div>
            <div class="rank-stats">
              <span>最高击杀数: {{ item.kills || 0 }}</span>
              <span>最高Boss击杀数: {{ item.bossKills || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="back-btn" @click="$router.push('/tank-game')">返回游戏</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getRankList } from "@/api/rank";
import { getUserInfo } from "@/utils/user";

const rankings = ref([]);
const loading = ref(false);
const error = ref("");
const searchQuery = ref("");
const myEmployeeId = ref("");

const filteredRankings = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return rankings.value.map((item, index) => ({ item, index }));
  return rankings.value
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => String(item.id).toLowerCase().includes(query));
});

function isMe(item) {
  return myEmployeeId.value && String(item.id) === String(myEmployeeId.value);
}

function getMedal(index) {
  if (index === 0) return "👑";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `#${index + 1}`;
}

function getRankClass(index) {
  if (index === 0) return "rank-first";
  if (index === 1) return "rank-second";
  if (index === 2) return "rank-third";
  return "";
}

onMounted(async () => {
  loading.value = true;
  try {
    const data = await getRankList();
    const list = Array.isArray(data.data) ? data.data : data.data?.list || [];
    rankings.value = list.map((row) => ({
      id: row.employee_id,
      name: row.employee_id || "匿名玩家",
      avatar: "",
      kills: row.high_skills || 0,
      bossKills: row.last_boss_kills || 0,
      deaths: row.deaths || 0,
      score: row.high_skills || 0,
    }));

    const userInfo = getUserInfo();
    if (userInfo && userInfo.employeeId) {
      myEmployeeId.value = userInfo.employeeId;
    }
  } catch (e) {
    console.warn("[Ranking] API failed:", e.message);
    if (!error.value) {
      error.value = e.message;
    } else {
      rankings.value = [];
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.ranking-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #0a0f08 0%, #1a2118 50%, #0d120a 100%);
  overflow: hidden;
}

.ranking-header {
  text-align: center;
  margin-bottom: 24px;
}

.ranking-header .title {
  font-size: 28px;
  font-weight: bold;
  color: #c8a84e;
  text-shadow: 0 0 20px rgba(200, 168, 78, 0.5);
  letter-spacing: 2px;
}

.ranking-header .subtitle {
  font-size: 12px;
  color: #5a7a4a;
  letter-spacing: 4px;
  margin-top: 4px;
}

.search-bar {
  width: 100%;
  max-width: 500px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.search-bar input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(30, 45, 25, 0.8);
  border: 1px solid #2a3a2a;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.search-bar input:focus {
  border-color: #c8a84e;
  box-shadow: 0 0 10px rgba(200, 168, 78, 0.3);
}

.search-bar input::placeholder {
  color: #5a7a4a;
}

.search-count {
  font-size: 12px;
  color: #c8a84e;
  white-space: nowrap;
  flex-shrink: 0;
}

.ranking-list {
  width: 100%;
  max-width: 500px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #3a5a3a transparent;
}

.ranking-list::-webkit-scrollbar {
  width: 6px;
}

.ranking-list::-webkit-scrollbar-thumb {
  background: #3a5a3a;
  border-radius: 3px;
}

.ranking-list::-webkit-scrollbar-track {
  background: transparent;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 40px;
  color: #5a7a4a;
  font-size: 14px;
}

.error {
  color: #c0392b;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(30, 45, 25, 0.8);
  border: 1px solid #2a3a2a;
  border-radius: 8px;
  transition: all 0.3s;
}

.rank-item:hover {
  background: rgba(40, 60, 30, 0.9);
  border-color: #3a5a3a;
  transform: translateX(4px);
}

.rank-mine {
  border-color: #c8a84e;
  box-shadow: 0 0 12px rgba(200, 168, 78, 0.25);
}

.rank-mine .rank-name {
  color: #f0d88a;
}

.my-tag {
  font-size: 11px;
  color: #0a0f08;
  background: #c8a84e;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-right: 6px;
}

.rank-first {
  background: linear-gradient(
    90deg,
    rgba(200, 168, 78, 0.2),
    rgba(30, 45, 25, 0.8)
  );
  border-color: #c8a84e;
  box-shadow: 0 0 15px rgba(200, 168, 78, 0.3);
}

.rank-second {
  background: linear-gradient(
    90deg,
    rgba(192, 192, 192, 0.15),
    rgba(30, 45, 25, 0.8)
  );
  border-color: #a0a0a0;
}

.rank-third {
  background: linear-gradient(
    90deg,
    rgba(205, 127, 50, 0.15),
    rgba(30, 45, 25, 0.8)
  );
  border-color: #cd7f32;
}

.rank-num {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #c8a84e;
  flex-shrink: 0;
}

.rank-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: rgba(200, 168, 78, 0.1);
  border: 1px solid #3a4a3a;
  border-radius: 50%;
  flex-shrink: 0;
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #7a9a6a;
  margin-top: 4px;
}

.rank-stats span {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
}

.rank-score {
  text-align: right;
  flex-shrink: 0;
}

.score-val {
  font-size: 20px;
  font-weight: bold;
  color: #c8a84e;
}

.score-label {
  font-size: 10px;
  color: #5a7a4a;
  text-transform: uppercase;
}

.back-btn {
  margin-top: 20px;
  padding: 10px 32px;
  background: linear-gradient(90deg, #2a4a2a, #3a5a3a);
  border: 1px solid #4a6a4a;
  border-radius: 6px;
  color: #a0c090;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: linear-gradient(90deg, #3a5a3a, #4a6a4a);
  color: #c0e0b0;
  box-shadow: 0 0 15px rgba(74, 106, 74, 0.5);
}
</style>
