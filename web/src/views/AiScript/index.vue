<template>
  <div class="ai-script-wrap">
    <div class="ai-header">
      <div class="title">玩家AI脚本列表</div>
      <div class="subtitle">PLAYER AI SCRIPT LIST</div>
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

    <div class="script-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="list.length === 0" class="empty">暂无脚本数据</div>
      <div v-else class="list">
        <div class="list-header">
          <span class="col-name">姓名</span>
          <span class="col-id">工号</span>
          <span class="col-script">脚本名</span>
          <span class="col-time">创建时间</span>
        </div>
        <div
          v-for="(item, index) in list"
          :key="item.employee_id || index"
          class="script-item"
        >
          <span class="col-name">{{ item.username || "未知" }}</span>
          <span class="col-id">{{ item.employee_id }}</span>
          <span class="col-script" :title="item.file_name">{{
            item.file_name
          }}</span>
          <span class="col-time">{{ formatTime(item.create_time) }}</span>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)">
        下一页
      </button>
    </div>

    <div class="back-btn" @click="$router.push('/tank-game')">返回游戏</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getAiList } from "@/api/ai";

const list = ref([]);
const loading = ref(false);
const error = ref("");
const keyword = ref("");
const searchKeyword = ref("");
const page = ref(1);
const pageSize = ref(200);
const total = ref(0);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

async function fetchData() {
  loading.value = true;
  error.value = "";
  try {
    const res = await getAiList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
    });
    const data = res.data || {};
    list.value = Array.isArray(data.list) ? data.list : [];
    total.value = data.total || 0;
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

function formatTime(t) {
  if (!t) return "-";
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(fetchData);
</script>

<style scoped>
.ai-script-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #0a0f08 0%, #1a2118 50%, #0d120a 100%);
  overflow: hidden;
}

.ai-header {
  text-align: center;
  margin-bottom: 24px;
}

.ai-header .title {
  font-size: 28px;
  font-weight: bold;
  color: #c8a84e;
  text-shadow: 0 0 20px rgba(200, 168, 78, 0.5);
  letter-spacing: 2px;
}

.ai-header .subtitle {
  font-size: 12px;
  color: #5a7a4a;
  letter-spacing: 4px;
  margin-top: 4px;
}

.search-bar {
  width: 100%;
  max-width: 600px;
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

.search-count {
  font-size: 12px;
  color: #c8a84e;
  white-space: nowrap;
  flex-shrink: 0;
}

.script-list {
  width: 100%;
  max-width: 600px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #3a5a3a transparent;
}

.script-list::-webkit-scrollbar {
  width: 6px;
}

.script-list::-webkit-scrollbar-thumb {
  background: #3a5a3a;
  border-radius: 3px;
}

.script-list::-webkit-scrollbar-track {
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
  gap: 0;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: rgba(200, 168, 78, 0.15);
  border: 1px solid #3a4a3a;
  border-radius: 8px 8px 0 0;
  font-size: 13px;
  font-weight: bold;
  color: #c8a84e;
}

.script-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(30, 45, 25, 0.8);
  border: 1px solid #2a3a2a;
  border-top: none;
  transition: all 0.3s;
}

.script-item:last-child {
  border-radius: 0 0 8px 8px;
}

.script-item:hover {
  background: rgba(40, 60, 30, 0.9);
  border-color: #3a5a3a;
}

.col-id {
  width: 100px;
  flex-shrink: 0;
  font-size: 13px;
  color: #7a9a6a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-name {
  width: 100px;
  flex-shrink: 0;
  font-size: 14px;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-script {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #a0c090;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-time {
  width: 140px;
  flex-shrink: 0;
  font-size: 12px;
  color: #7a9a6a;
  text-align: right;
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
