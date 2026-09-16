<template>
  <div class="user-list-wrap">
    <div class="user-header">
      <div class="title">用户管理</div>
      <div class="subtitle">USER MANAGEMENT</div>
    </div>

    <div class="search-bar">
      <input
        v-model.trim="keyword"
        type="text"
        placeholder="按姓名、工号或手机号搜索..."
        @keyup.enter="handleSearch"
      />
      <button class="search-btn" @click="handleSearch">搜索</button>
      <span v-if="total > 0" class="search-count">共 {{ total }} 条</span>
    </div>

    <div class="user-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="users.length === 0" class="empty">暂无用户数据</div>
      <div v-else class="list">
        <div
          v-for="(item, index) in users"
          :key="item.id || index"
          class="user-item"
        >
          <div class="user-index">{{ index + 1 }}</div>
          <div class="user-info">
            <div class="user-name">{{ item.username || "未知用户" }}</div>
            <div class="user-details">
              <span class="detail-item"
                >工号: {{ item.employee_id || "-" }}</span
              >
              <span class="detail-item">手机: {{ item.phone || "-" }}</span>
              <span class="detail-item">岗位: {{ item.post_name || "-" }}</span>
            </div>
            <div class="user-time">
              注册时间: {{ formatTime(item.create_time) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
      <template v-for="p in pageNumbers" :key="p">
        <button v-if="p === '...'" class="page-ellipsis" disabled>...</button>
        <button
          v-else
          :class="['page-btn', { active: p === page }]"
          @click="goPage(p)"
        >
          {{ p }}
        </button>
      </template>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)">
        下一页
      </button>
    </div>

    <div class="back-btn" @click="$router.push('/home')">返回首页</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getUserList } from "@/api/user";

const users = ref([]);
const loading = ref(false);
const error = ref("");
const keyword = ref("");
const searchKeyword = ref("");
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const current = page.value;
  const pages = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  if (current > 4) pages.push("...");

  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 3) pages.push("...");

  pages.push(total);

  return pages;
});

async function fetchData() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getUserList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
    });
    const list = Array.isArray(data.data) ? data.data : data.data?.list || [];
    total.value = data.data?.total || 0;
    users.value = list;
  } catch (e) {
    error.value = e.message || "加载失败";
    users.value = [];
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

function formatTime(time) {
  if (!time) return "-";
  const date = new Date(time);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(fetchData);
</script>

<style scoped>
.user-list-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #0a0f08 0%, #1a2118 50%, #0d120a 100%);
  overflow: hidden;
}

.user-header {
  text-align: center;
  margin-bottom: 24px;
}

.user-header .title {
  font-size: 28px;
  font-weight: bold;
  color: #c8a84e;
  text-shadow: 0 0 20px rgba(200, 168, 78, 0.5);
  letter-spacing: 2px;
}

.user-header .subtitle {
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

.search-count {
  font-size: 12px;
  color: #c8a84e;
  white-space: nowrap;
  flex-shrink: 0;
}

.user-list {
  width: 100%;
  max-width: 600px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #3a5a3a transparent;
}

.user-list::-webkit-scrollbar {
  width: 6px;
}

.user-list::-webkit-scrollbar-thumb {
  background: #3a5a3a;
  border-radius: 3px;
}

.user-list::-webkit-scrollbar-track {
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

.user-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(30, 45, 25, 0.8);
  border: 1px solid #2a3a2a;
  border-radius: 8px;
  transition: all 0.3s;
}

.user-item:hover {
  background: rgba(40, 60, 30, 0.9);
  border-color: #3a5a3a;
  transform: translateX(4px);
}

.user-index {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #7a9a6a;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: bold;
  color: #e0e0e0;
  margin-bottom: 6px;
}

.user-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.detail-item {
  font-size: 12px;
  color: #7a9a6a;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
}

.user-time {
  font-size: 11px;
  color: #5a7a4a;
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

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  background: rgba(30, 45, 25, 0.8);
  border: 1px solid #2a3a2a;
  border-radius: 6px;
  color: #a0c090;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  background: rgba(40, 60, 30, 0.9);
  border-color: #3a5a3a;
  color: #c0e0b0;
}

.page-btn.active {
  background: linear-gradient(90deg, #3a5a3a, #4a6a4a);
  border-color: #c8a84e;
  color: #c8a84e;
  font-weight: bold;
}

.page-ellipsis {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  background: transparent;
  border: none;
  color: #5a7a4a;
  font-size: 13px;
  cursor: default;
}
</style>
