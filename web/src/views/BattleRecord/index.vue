<template>
  <div class="battle-record-wrap">
    <div class="record-header">
      <div class="title">对战记录</div>
      <div class="subtitle">BATTLE RECORDS</div>
    </div>

    <div class="search-bar">
      <input
        v-model.trim="keyword"
        type="text"
        placeholder="按工号或姓名搜索参战坦克..."
        @keyup.enter="handleSearch"
      />
      <button class="search-btn" @click="handleSearch">搜索</button>
      <span v-if="total > 0" class="search-count">共 {{ total }} 条</span>
    </div>

    <div class="record-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="records.length === 0" class="empty">暂无对战记录</div>
      <div v-else class="list">
        <div
          v-for="item in records"
          :key="item.id"
          class="record-item"
          @click="showDetail(item.id)"
        >
          <div class="record-left">
            <!-- <div class="record-id">#{{ item.id }}</div> -->
            <div class="record-time">{{ formatTime(item.create_time) }}</div>
          </div>
          <div class="record-center">
            <div class="record-winner">
              <span v-if="item.is_draw" class="draw-badge">平局</span>
              <span v-else>
                <span class="winner-name"
                  >🏆 {{ item.winner_name || "未知" }}</span
                >
                <span v-if="item.winner_username" class="winner-username"
                  >（{{ item.winner_username }}）</span
                >
              </span>
            </div>
            <div class="record-meta">
              <span>{{ item.total_players }} 名坦克</span>
              <span>{{ formatDuration(item.game_duration_ms) }}</span>
            </div>
          </div>
          <div class="record-arrow">›</div>
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

    <div class="back-btn" @click="goBack">返回对战</div>

    <div
      v-if="detailVisible"
      class="detail-mask"
      @click.self="detailVisible = false"
    >
      <div class="detail-panel">
        <div class="detail-header">
          <span class="detail-title"
            >对战详情 #{{ detailData?.record?.id }}</span
          >
          <span class="detail-close" @click="detailVisible = false">✕</span>
        </div>
        <div v-if="detailLoading" class="loading">加载中...</div>
        <template v-else-if="detailData">
          <div class="detail-info">
            <div v-if="detailData.record.is_draw" class="detail-draw">平局</div>
            <div v-else class="detail-winner">
              🏆 获胜者：{{ detailData.record.winner_name }}
            </div>
            <div class="detail-meta">
              <span>参与：{{ detailData.record.total_players }} 名</span>
              <span
                >时长：{{
                  formatDuration(detailData.record.game_duration_ms)
                }}</span
              >
            </div>
          </div>
          <div class="detail-players">
            <div class="players-title">参战坦克</div>
            <div
              v-for="(p, i) in detailData.players"
              :key="i"
              class="player-row"
              :class="{ 'is-winner': p.is_winner }"
            >
              <div class="player-rank">{{ i + 1 }}</div>
              <div class="player-info">
                <div class="player-name">
                  <span v-if="p.is_winner" class="win-tag">胜</span>
                  {{ p.tank_name || "未知坦克" }}
                </div>
                <div class="player-id">
                  {{ p.username || p.employee_id || "无工号" }}
                </div>
              </div>
              <div class="player-stats">
                <span class="stat-score">{{ p.score }}分</span>
                <span class="stat-kills">{{ p.kills }}杀</span>
                <span class="stat-deaths">{{ p.deaths }}亡</span>
              </div>
              <div class="player-reason">{{ p.death_reason || "-" }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  getBattleRecordPage,
  getBattleRecordDetail,
} from "@/api/battleRecord.js";

const records = ref([]);
const loading = ref(false);
const error = ref("");
const keyword = ref("");
const searchKeyword = ref("");
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detailData = ref(null);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

async function fetchData() {
  loading.value = true;
  error.value = "";
  try {
    const res = await getBattleRecordPage({
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
    });
    const data = res.data || {};
    records.value = data.list || [];
    total.value = data.total || 0;
  } catch (e) {
    error.value = e.message || "加载失败";
    records.value = [];
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

async function showDetail(id) {
  detailVisible.value = true;
  detailLoading.value = true;
  detailData.value = null;
  try {
    const res = await getBattleRecordDetail(id);
    detailData.value = res.data || null;
  } catch (e) {
    detailData.value = null;
  } finally {
    detailLoading.value = false;
  }
}

function formatTime(t) {
  if (!t) return "-";
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(ms) {
  if (!ms) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function goBack() {
  if (window.opener && !window.opener.closed) {
    window.opener.focus();
    window.close();
  } else {
    window.history.back();
  }
}

onMounted(fetchData);
</script>

<style scoped>
.battle-record-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #0a0f08 0%, #1a2118 50%, #0d120a 100%);
  overflow: hidden;
}

.record-header {
  text-align: center;
  margin-bottom: 24px;
}

.record-header .title {
  font-size: 28px;
  font-weight: bold;
  color: #c8a84e;
  text-shadow: 0 0 20px rgba(200, 168, 78, 0.5);
  letter-spacing: 2px;
}

.record-header .subtitle {
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

.record-list {
  width: 100%;
  max-width: 600px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #3a5a3a transparent;
}

.record-list::-webkit-scrollbar {
  width: 6px;
}

.record-list::-webkit-scrollbar-thumb {
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

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(30, 45, 25, 0.8);
  border: 1px solid #2a3a2a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.record-item:hover {
  background: rgba(40, 60, 30, 0.9);
  border-color: #3a5a3a;
  transform: translateX(4px);
}

.record-left {
  flex-shrink: 0;
  text-align: center;
}

.record-id {
  font-size: 14px;
  font-weight: bold;
  color: #c8a84e;
}

.record-time {
  font-size: 11px;
  color: #5a7a4a;
  margin-top: 2px;
}

.record-center {
  flex: 1;
  min-width: 0;
}

.record-winner {
  font-size: 15px;
  font-weight: bold;
  color: #e0e0e0;
}

.draw-badge {
  color: #7a9a6a;
  font-size: 13px;
}

.winner-name {
  color: #f0d88a;
}

.winner-username {
  font-size: 12px;
  color: #7a9a6a;
  font-weight: normal;
}

.record-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #5a7a4a;
  margin-top: 4px;
}

.record-arrow {
  font-size: 20px;
  color: #3a5a3a;
  flex-shrink: 0;
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

.detail-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.detail-panel {
  width: 90%;
  max-width: 560px;
  max-height: 80vh;
  background: #1a2118;
  border: 1px solid #3a5a3a;
  border-radius: 12px;
  padding: 20px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-title {
  font-size: 18px;
  font-weight: bold;
  color: #c8a84e;
}

.detail-close {
  font-size: 18px;
  color: #5a7a4a;
  cursor: pointer;
  transition: color 0.3s;
}

.detail-close:hover {
  color: #e0e0e0;
}

.detail-info {
  text-align: center;
  margin-bottom: 16px;
}

.detail-draw {
  font-size: 20px;
  color: #7a9a6a;
}

.detail-winner {
  font-size: 18px;
  color: #f0d88a;
}

.detail-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 13px;
  color: #5a7a4a;
  margin-top: 8px;
}

.players-title {
  font-size: 14px;
  font-weight: bold;
  color: #7a9a6a;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #2a3a2a;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.player-row:hover {
  background: rgba(40, 60, 30, 0.5);
}

.player-row.is-winner {
  background: rgba(200, 168, 78, 0.1);
}

.player-rank {
  width: 24px;
  font-size: 13px;
  font-weight: bold;
  color: #5a7a4a;
  text-align: center;
  flex-shrink: 0;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 14px;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.win-tag {
  font-size: 10px;
  color: #0a0f08;
  background: #c8a84e;
  padding: 1px 5px;
  border-radius: 3px;
  margin-right: 4px;
}

.player-id {
  font-size: 11px;
  color: #5a7a4a;
  margin-top: 2px;
}

.player-stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.stat-score {
  font-size: 13px;
  font-weight: bold;
  color: #c8a84e;
}

.stat-kills {
  font-size: 13px;
  color: #e07070;
}

.stat-deaths {
  font-size: 13px;
  color: #7a9a6a;
}

.player-reason {
  font-size: 11px;
  color: #5a7a4a;
  max-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
</style>
