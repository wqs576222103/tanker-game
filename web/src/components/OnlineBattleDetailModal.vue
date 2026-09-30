<template>
  <div v-if="visible" class="ob-detail-mask" @click.self="$emit('close')">
    <div class="ob-detail-panel">
      <div class="ob-detail-header">
        <span class="ob-detail-title">对战详情</span>
        <span class="ob-detail-close" @click="$emit('close')">✕</span>
      </div>
      <div v-if="loading" class="ob-detail-loading">加载中...</div>
      <template v-else-if="data">
        <div class="ob-detail-info">
          <div v-if="data.room.is_draw" class="ob-detail-draw">平局</div>
          <div v-else class="ob-detail-winner">
            🏆 获胜者：{{ data.room.winner_name }}
          </div>
          <div class="ob-detail-meta">
            <span>房间：{{ data.room.room_id }}</span>
            <span>时长：{{ formatDuration(data.room.game_duration_ms) }}</span>
            <span>{{ formatTime(data.room.create_time) }}</span>
          </div>
        </div>
        <div class="ob-detail-players">
          <div class="ob-players-title">参与玩家</div>
          <div
            v-for="(p, i) in data.players"
            :key="i"
            class="ob-player-row"
            :class="{ 'is-winner': p.is_winner }"
          >
            <div class="ob-player-rank">{{ i + 1 }}</div>
            <div class="ob-player-info">
              <div class="ob-player-name">
                <span v-if="p.is_winner" class="ob-win-tag">胜</span>
                <span v-if="isQuitter(p)" class="ob-quit-tag">中途退出</span>
                {{ p.username || p.tank_name || "匿名" }}
              </div>
              <div class="ob-player-id">{{ p.employee_id || "-" }}</div>
            </div>
            <div class="ob-player-stats">
              <span class="ob-stat-score">{{ p.score }}分</span>
              <span class="ob-stat-kills">{{ p.kills }}杀</span>
              <span class="ob-stat-deaths">{{ p.deaths }}淘汰</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { getOnlineBattleRoomDetail } from "@/api/onlineBattle";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  roomId: {
    type: String,
    default: "",
  },
});

defineEmits(["close"]);

const loading = ref(false);
const data = ref(null);

watch(
  () => props.visible,
  (val) => {
    if (!val) {
      loading.value = false;
      data.value = null;
      return;
    }
    loading.value = true;
    data.value = null;
    getOnlineBattleRoomDetail(props.roomId)
      .then((res) => {
        data.value = res.data || null;
      })
      .catch(() => {
        data.value = {
          room: {
            room_id: props.roomId,
            game_duration_ms: 0,
            create_time: "",
            is_draw: false,
            winner_name: "",
          },
          players: [],
        };
      })
      .finally(() => {
        loading.value = false;
      });
  },
  { immediate: true },
);

function formatDuration(ms) {
  if (!ms) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTime(t) {
  if (!t) return "-";
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isQuitter(p) {
  if (!p) return false;
  return Number(p.quit_mid_game) === 1 || p.death_reason === "中途退出";
}
</script>

<style scoped>
.ob-detail-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.ob-detail-panel {
  width: 90%;
  max-width: 560px;
  max-height: 80vh;
  background: #1a2118;
  border: 1px solid #3a5a3a;
  border-radius: 12px;
  padding: 20px;
  overflow-y: auto;
}

.ob-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.ob-detail-title {
  font-size: 18px;
  font-weight: bold;
  color: #c8a84e;
}

.ob-detail-close {
  font-size: 18px;
  color: #5a7a4a;
  cursor: pointer;
  transition: color 0.3s;
}

.ob-detail-close:hover {
  color: #e0e0e0;
}

.ob-detail-loading {
  text-align: center;
  padding: 40px;
  color: #5a7a4a;
}

.ob-detail-info {
  text-align: center;
  margin-bottom: 16px;
}

.ob-detail-draw {
  font-size: 20px;
  color: #7a9a6a;
}

.ob-detail-winner {
  font-size: 18px;
  color: #f0d88a;
}

.ob-detail-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  font-size: 13px;
  color: #5a7a4a;
  margin-top: 8px;
}

.ob-players-title {
  font-size: 14px;
  font-weight: bold;
  color: #7a9a6a;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #2a3a2a;
}

.ob-detail-players {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ob-player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.ob-player-row:hover {
  background: rgba(40, 60, 30, 0.5);
}

.ob-player-row.is-winner {
  background: rgba(200, 168, 78, 0.1);
}

.ob-player-rank {
  width: 24px;
  font-size: 13px;
  font-weight: bold;
  color: #5a7a4a;
  text-align: center;
  flex-shrink: 0;
}

.ob-player-info {
  flex: 1;
  min-width: 0;
}

.ob-player-name {
  font-size: 14px;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ob-win-tag {
  font-size: 10px;
  color: #0a0f08;
  background: #c8a84e;
  padding: 1px 5px;
  border-radius: 3px;
  margin-right: 4px;
}

.ob-quit-tag {
  font-size: 10px;
  color: #ffd0d0;
  background: rgba(180, 60, 60, 0.7);
  padding: 1px 5px;
  border-radius: 3px;
  margin-right: 4px;
}

.ob-player-id {
  font-size: 11px;
  color: #5a7a4a;
  margin-top: 2px;
}

.ob-player-stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.ob-stat-score {
  font-size: 13px;
  font-weight: bold;
  color: #c8a84e;
}

.ob-stat-kills {
  font-size: 13px;
  color: #e07070;
}

.ob-stat-deaths {
  font-size: 13px;
  color: #7a9a6a;
}
</style>
