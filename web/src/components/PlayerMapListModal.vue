<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal-box">
      <button class="modal-close-tr" @click="$emit('close')">✕</button>
      <div class="modal-header">
        <span>玩家地图</span>
      </div>
      <div class="modal-body">
        <div class="search-bar">
          <input
            v-model="keyword"
            placeholder="搜索地图名或作者..."
            class="search-input"
            @input="debounceSearch"
          />
        </div>
        <div class="map-list" v-if="mapList.length > 0">
          <div
            v-for="item in mapList"
            :key="item.id"
            class="map-item"
            @click="handleSelect(item)"
          >
            <div class="map-info">
              <div class="map-name">{{ item.mapName }}</div>
              <div class="map-meta">
                <span v-if="item.username">{{ item.username }}</span>
                <span v-else>{{ item.employeeId }}</span>
                <span class="map-time">{{ formatTime(item.createTime) }}</span>
              </div>
            </div>
            <button class="btn-use" @click.stop="handleSelect(item)">
              使用
            </button>
          </div>
        </div>
        <div class="empty-tip" v-else-if="!loading">暂无玩家地图</div>
        <div class="empty-tip" v-if="loading">加载中...</div>
        <div class="pagination" v-if="total > pageSize">
          <button :disabled="page <= 1" @click="changePage(page - 1)">
            上一页
          </button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="changePage(page + 1)">
            下一页
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getMapScriptList } from "@/api/map.js";

const emit = defineEmits(["close", "select"]);

const keyword = ref("");
const mapList = ref([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

let searchTimer = null;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    fetchList();
  }, 300);
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getMapScriptList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
    });
    const data = res?.data;
    mapList.value = data?.list || [];
    total.value = data?.total || 0;
  } catch (err) {
    console.error("获取地图列表失败:", err);
    mapList.value = [];
  } finally {
    loading.value = false;
  }
}

function changePage(p) {
  page.value = p;
  fetchList();
}

function handleSelect(item) {
  emit("select", item);
}

function formatTime(t) {
  if (!t) return "";
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(() => {
  fetchList();
});
</script>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  position: relative;
  background: #1e2b22;
  border: 1px solid #4a5a4a;
  border-radius: 10px;
  width: 520px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-close-tr {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  background: none;
  border: none;
  color: #9fb6a6;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
}

.modal-close-tr:hover {
  color: #ff6b6b;
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #3a4a3a;
  font-size: 15px;
  font-weight: bold;
  color: #ffd76e;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.search-bar {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid #3a4a3a;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #cfe3cf;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #5a8a5a;
}

.search-input::placeholder {
  color: #6a7a6a;
}

.map-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #3a4a3a;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.map-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #5a8a5a;
}

.map-info {
  flex: 1;
  min-width: 0;
}

.map-name {
  font-size: 14px;
  color: #cfe3cf;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-meta {
  font-size: 12px;
  color: #6a7a6a;
  margin-top: 4px;
  display: flex;
  gap: 12px;
}

.map-time {
  margin-left: auto;
}

.btn-use {
  background: #4a7a4a;
  color: #fff;
  border: 1px solid #6a9a6a;
  padding: 4px 14px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: 10px;
}

.btn-use:hover {
  background: #5a8a5a;
}

.empty-tip {
  text-align: center;
  color: #6a7a6a;
  font-size: 13px;
  padding: 30px 0;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
  font-size: 13px;
  color: #9fb6a6;
}

.pagination button {
  background: #26332b;
  color: #cfe3cf;
  border: 1px solid #4a5a4a;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background: #3a4a3a;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #3a4a3a;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  color: #9fb6a6;
  border: 1px solid #3a4a3a;
  padding: 6px 20px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
