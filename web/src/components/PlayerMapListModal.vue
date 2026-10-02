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
            placeholder="搜索地图名、工号或玩家名..."
            class="search-input"
            @input="debounceSearch"
          />
        </div>
        <div class="import-row">
          <button class="btn-import" @click="showMapImport = true">
            📥 导入地图
          </button>
          <span class="import-tip">导入后点击「使用」即可应用</span>
        </div>
        <div class="map-list" v-if="displayList.length > 0">
          <div
            v-for="item in displayList"
            :key="item.id ?? 'local-map'"
            class="map-item"
            @click="handleSelect(item)"
          >
            <div class="map-info">
              <div class="map-name">
                {{ item.mapName }}
                <span v-if="item._local" class="local-tag">刚导入</span>
              </div>
              <div class="map-meta">
                <span v-if="item.username">{{ item.username }}</span>
                <span v-else-if="item.employeeId">{{ item.employeeId }}</span>
                <span v-else>本地</span>
                <span class="map-time">{{ formatTime(item.createTime) }}</span>
              </div>
            </div>
            <button class="btn-use" @click.stop="handleSelect(item)">
              使用
            </button>
            <button
              v-if="item.id && item.employeeId === currentEmployeeId"
              class="btn-delete"
              @click.stop="handleDelete(item)"
            >
              删除
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
    <GameModal
      :visible="showDeleteConfirm"
      :message="`确定删除地图「${deleteTarget?.mapName || ''}」吗？`"
      confirm-text="删除"
      cancel-text="取消"
      :show-cancel="true"
      icon=""
      @confirm="confirmDelete"
      @close="showDeleteConfirm = false"
    />
    <MapScriptImportModal
      v-if="showMapImport"
      :on-import="handleMapImport"
      :employee-id="currentEmployeeId"
      @close="showMapImport = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getMapScriptList, deleteMapScript, uploadMapScript } from "@/api/map.js";
import { parseMapScript, validateMapConfig } from "@/views/TankGame/script/base/map-script.js";
import GameModal from "@/components/GameModal.vue";
import MapScriptImportModal from "@/components/MapScriptImportModal.vue";

const props = defineProps({
  currentEmployeeId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close", "select"]);

const keyword = ref("");
const mapList = ref([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const showDeleteConfirm = ref(false);
const deleteTarget = ref(null);
const showMapImport = ref(false);
const localImported = ref(null);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

const displayList = computed(() => {
  const local = localImported.value;
  if (
    !local ||
    page.value !== 1 ||
    (keyword.value && !local.mapName.includes(keyword.value))
  ) {
    return mapList.value;
  }
  const duplicated = mapList.value.some((m) => m.mapName === local.mapName);
  return duplicated ? mapList.value : [local, ...mapList.value];
});

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
    mapList.value = (data?.list || []).map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      username: r.username,
      mapName: r.map_name,
      fileName: r.file_name,
      scriptPath: r.script_path,
      createTime: r.create_time,
    }));
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

async function handleMapImport(scriptContent, { saveToServer, mapName } = {}) {
  const config = await parseMapScript(scriptContent);
  const result = validateMapConfig(config);
  if (!result.valid) {
    throw new Error(result.message);
  }
  const name =
    String(config.name || mapName || "自定义地图").trim().slice(0, 20) ||
    "自定义地图";
  if (saveToServer && props.currentEmployeeId) {
    try {
      const blob = new Blob([scriptContent], { type: "text/javascript" });
      const file = new File([blob], `${mapName || "custom-map"}.js`, {
        type: "text/javascript",
      });
      await uploadMapScript(props.currentEmployeeId, mapName, file);
    } catch (err) {
      console.warn("[PlayerMapList] 上传地图脚本到服务器失败:", err);
    }
  }
  keyword.value = "";
  page.value = 1;
  await fetchList();
  localImported.value = {
    id: null,
    employeeId: props.currentEmployeeId,
    username: "",
    mapName: name,
    config,
    createTime: Date.now(),
    _local: true,
  };
}

function handleSelect(item) {
  emit("select", item);
}

async function handleDelete(item) {
  deleteTarget.value = item;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  const item = deleteTarget.value;
  if (!item) return;
  try {
    await deleteMapScript(item.id);
    fetchList();
  } catch (err) {
    console.error("删除地图失败:", err);
  }
  deleteTarget.value = null;
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
  width: 620px;
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

.import-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.btn-import {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #2a3a2a;
  color: #9fb6a6;
  border: 1px solid #4a5a4a;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-import:hover {
  background: #3a4a3a;
  color: #ffd76e;
  border-color: #6a9a6a;
}

.import-tip {
  font-size: 12px;
  color: #6a7a6a;
}

.local-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.4);
  border-radius: 8px;
  font-size: 11px;
  color: #4ade80;
  font-weight: normal;
  vertical-align: middle;
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

.btn-delete {
  background: transparent;
  color: #ff6b6b;
  border: 1px solid #ff6b6b;
  padding: 4px 14px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: 6px;
}

.btn-delete:hover {
  background: rgba(255, 107, 107, 0.15);
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
