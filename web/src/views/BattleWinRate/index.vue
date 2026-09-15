<template>
  <div class="winrate-wrap">
    <div class="winrate-header">
      <div class="title">对战AI胜率榜</div>
      <div class="subtitle">BATTLE AI WIN RATE RANKING</div>
    </div>

    <div class="search-bar">
      <input
        v-model.trim="keyword"
        type="text"
        placeholder="按工号或姓名搜索..."
        @keyup.enter="handleSearch"
      />
      <button class="search-btn" @click="handleSearch">搜索</button>
      <span v-if="total > 0" class="search-count">共 {{ total }} 条</span>
    </div>

    <div class="winrate-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="list.length === 0" class="empty">暂无胜率数据</div>
      <div v-else class="list">
        <div
          v-for="(item, index) in list"
          :key="item.employee_id + item.tank_name"
          class="rank-item"
          :class="[getRankClass(index), { 'rank-mine': isMe(item) }]"
        >
          <div class="rank-num">{{ getMedal(index) }}</div>
          <div class="rank-info">
            <div class="rank-name">
              <span v-if="isMe(item)" class="my-tag">我的</span>
              {{ item.tank_name || "未知坦克" }}
            </div>
            <div class="rank-user">{{ item.username || item.employee_id || "匿名" }}</div>
            <div class="rank-stats">
              <span class="stat-battles">场次: {{ item.total_battles }}</span>
              <span class="stat-wins">胜: {{ item.wins }}</span>
              <span class="stat-kills">击杀: {{ item.total_kills }}</span>
              <span class="stat-deaths">死亡: {{ item.total_deaths }}</span>
            </div>
          </div>
          <div class="rank-rate">
            <div class="rate-val" :class="getRateClass(item.win_rate)">{{ item.win_rate }}%</div>
            <div class="rate-label">胜率</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
    </div>

    <div class="back-btn" @click="$router.push('/battle-arena')">返回对战</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getBattleWinRate } from "@/api/battleRecord.js";
import { getUserInfo } from "@/utils/user";

const list = ref([]);
const loading = ref(false);
const error = ref("");
const keyword = ref("");
const searchKeyword = ref("");
const myEmployeeId = ref("");
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

async function fetchData() {
  loading.value = true;
  error.value = "";
  try {
    const res = await getBattleWinRate({
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
    });
    const data = res.data || {};
    list.value = data.list || [];
    total.value = data.total || 0;

    const userInfo = getUserInfo();
    if (userInfo && userInfo.employeeId) {
      myEmployeeId.value = userInfo.employeeId;
    }
  } catch (e) {
    error.value = e.message || "加载失败";
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  searchKeyword.value = keyword.value;
  page.value = 1;
  fetchData();
}

function goPage(p) {
  page.value = p;
  fetchData();
}

function isMe(item) {
  return myEmployeeId.value && String(item.employee_id) === String(myEmployeeId.value);
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

function getRateClass(rate) {
  if (rate >= 60) return "rate-high";
  if (rate >= 40) return "rate-mid";
  return "rate-low";
}

onMounted(fetchData);
</script>

<style scoped>
.winrate-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #0a0f08 0%, #1a2118 50%, #0d120a 100%);
  overflow: hidden;
}

.winrate-header {
  text-align: center;
  margin-bottom: 24px;
}

.winrate-header .title {
  font-size: 28px;
  font-weight: bold;
  color: #c8a84e;
  text-shadow: 0 0 20px rgba(200, 168, 78, 0.5);
  letter-spacing: 2px;
}

.winrate-header .subtitle {
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

.search-btn {
  padding: 10px 20px;
  background: linear-gradient(90deg, #2a4a2a, #3a5a3a);
  border: 1px solid #4a6a4a;
  border-radius: 8px;
  color: #a0c090;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.search-btn:hover {
  background: linear-gradient(90deg, #3a5a3a, #4a6a4a);
  color: #c0e0b0;
}

.winrate-list {
  width: 100%;
  max-width: 500px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #3a5a3a transparent;
}

.winrate-list::-webkit-scrollbar {
  width: 6px;
}

.winrate-list::-webkit-scrollbar-thumb {
  background: #3a5a3a;
  border-radius: 3px;
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
  background: linear-gradient(90deg, rgba(200, 168, 78, 0.2), rgba(30, 45, 25, 0.8));
  border-color: #c8a84e;
  box-shadow: 0 0 15px rgba(200, 168, 78, 0.3);
}

.rank-second {
  background: linear-gradient(90deg, rgba(192, 192, 192, 0.15), rgba(30, 45, 25, 0.8));
  border-color: #a0a0a0;
}

.rank-third {
  background: linear-gradient(90deg, rgba(205, 127, 50, 0.15), rgba(30, 45, 25, 0.8));
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

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: bold;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-user {
  font-size: 12px;
  color: #5a7a4a;
  margin-top: 2px;
}

.rank-stats {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #7a9a6a;
  margin-top: 4px;
  flex-wrap: wrap;
}

.rank-stats span {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
}

.rank-rate {
  text-align: right;
  flex-shrink: 0;
  min-width: 50px;
}

.rate-val {
  font-size: 20px;
  font-weight: bold;
}

.rate-label {
  font-size: 10px;
  color: #5a7a4a;
  text-transform: uppercase;
}

.rate-high {
  color: #7de07d;
}

.rate-mid {
  color: #ffd76e;
}

.rate-low {
  color: #ff6b6b;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.pagination button {
  padding: 8px 16px;
  background: rgba(30, 45, 25, 0.8);
  border: 1px solid #2a3a2a;
  border-radius: 6px;
  color: #a0c090;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.pagination button:hover:not(:disabled) {
  background: rgba(40, 60, 30, 0.9);
  border-color: #3a5a3a;
  color: #c0e0b0;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: #7a9a6a;
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
