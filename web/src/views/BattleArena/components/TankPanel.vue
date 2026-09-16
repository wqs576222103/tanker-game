<template>
  <div id="tank-panel">
    <div class="panel-title">AI玩家列表</div>
    <div id="tank-list">
      <div
        v-for="(ai, i) in sortedAiTanks"
        :key="ai.id"
        class="tank-item"
        :style="{ borderLeftColor: ai.color }"
      >
        <span class="tank-rank">{{ i + 1 }}</span>
        <span class="tank-color" :style="{ background: ai.color }"></span>
        <span class="tank-name">{{
          ai.name.length > 20 ? ai.name.slice(0, 20) + "..." : ai.name
        }}</span>
        <span v-if="ai.username" class="tank-employee-id">{{
          ai.username
        }}</span>
        <span
          class="tank-status"
          :class="
            ai.tank
              ? ai.tank.alive
                ? 'status-alive'
                : 'status-dead'
              : 'status-waiting'
          "
        >
          {{ ai.tank ? (ai.tank.alive ? "存活" : "淘汰") : "准备" }}
        </span>
        <span class="tank-score">{{ ai.score }}分</span>
        <span class="tank-stats">{{ ai.kills }}杀/{{ ai.deaths }}死</span>
        <button class="btn-remove" v-if="!isPlaying" @click="removeTank(i)">
          ✕
        </button>
        <div
          v-if="ai.tank && !ai.tank.alive && ai.lastDeathReason"
          class="death-reason"
        >
          {{
            ai.lastDeathReason === "punishment"
              ? "⚠️ 挂机惩罚"
              : "💀 被 " + ai.lastDeathReason + " 击杀"
          }}
        </div>
      </div>
    </div>
    <div id="tank-actions">
      <button
        id="btn-import-ai"
        :disabled="isPlaying"
        @click="openServerAILoad"
      >
        ➕ 选择AI
      </button>
      <button
        id="btn-export-all"
        :disabled="isPlaying"
        @click="showScriptImport = true"
      >
        📤 导入AI
      </button>
      <button id="btn-clear-all" :disabled="isPlaying" @click="clearAll">
        🗑️ 清空
      </button>
      <button class="btn-record" @click="openBattleRecord">📋 对战记录</button>
      <button class="btn-record" @click="openBattleWinRate">🏆 胜率榜</button>

      <button class="game-intro-btn" @click="goBack">返回主菜单</button>
    </div>

    <!-- 导入已有AI弹窗 -->
    <ServerAIModal v-if="showServerAI" @close="showServerAI = false" />

    <!-- 脚本导入弹窗 -->
    <ScriptImportModal
      v-if="showScriptImport"
      @close="showScriptImport = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { aiTanks, gameState } from "../logic/gameState.js";
import {
  removeAITank,
  clearAllAITanks,
} from "../logic/aiManager.js";
import { getToken } from "@/utils/user.js";
import ScriptImportModal from "./ScriptImportModal.vue";
import ServerAIModal from "./ServerAIModal.vue";

const route = useRoute();
const router = useRouter();

const battleRecordUrl = computed(() => {
  const tokenStr = new URLSearchParams(location.search).get("token");
  const query = tokenStr ? { token: tokenStr } : {};
  return router.resolve({ name: "BattleRecord", query }).href;
});

function openBattleRecord() {
  window.open(battleRecordUrl.value, "_blank");
}

const battleWinRateUrl = computed(() => {
  const tokenStr = new URLSearchParams(location.search).get("token");
  const query = tokenStr ? { token: tokenStr } : {};
  return router.resolve({ name: "BattleWinRate", query }).href;
});

function openBattleWinRate() {
  window.open(battleWinRateUrl.value, "_blank");
}

const isPlaying = computed(
  () => gameState.value === "playing" || gameState.value === "paused",
);

const sortedAiTanks = computed(() => {
  return [...aiTanks.value].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDead = a.tank && !a.tank.alive;
    const bDead = b.tank && !b.tank.alive;
    if (aDead !== bDead) return aDead ? 1 : -1;
    if (aDead && bDead) return a.deathTime - b.deathTime;
    return 0;
  });
});

function goBack() {
  router.push({ name: "Home", query: { token: getToken() } });
}
function removeTank(idx) {
  removeAITank(idx);
}

function clearAll() {
  clearAllAITanks();
}

// --- 服务器AI列表相关 ---
const showServerAI = ref(false);
const showScriptImport = ref(false);

function openServerAILoad() {
  showServerAI.value = true;
}
</script>

<style scoped>
#tank-panel {
  margin-top: 30px;
  width: 520px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #3a4a3a;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-title {
  font-size: 16px;
  font-weight: bold;
  color: #ffd76e;
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #3a4a3a;
}

#tank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tank-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 10px;
  border-radius: 6px;
  border-left: 4px solid;
  flex-wrap: wrap;
}

.tank-rank {
  font-size: 12px;
  font-weight: bold;
  color: #ffd76e;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.tank-score {
  font-size: 12px;
  color: #ffd76e;
  font-weight: bold;
  flex-shrink: 0;
}

.death-reason {
  width: 100%;
  font-size: 11px;
  color: #ff6b6b;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.tank-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tank-name {
  flex: 160px 1 0;
  font-size: 13px;
  color: #ffd76e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.tank-employee-id {
  font-size: 11px;
  color: #9fb6a6;
  flex-shrink: 0;
}

.tank-stats {
  font-size: 12px;
  color: #9fb6a6;
  flex-shrink: 0;
}

.tank-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.status-alive {
  background: rgba(125, 224, 125, 0.2);
  color: #7de07d;
}

.status-dead {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.status-waiting {
  background: rgba(159, 182, 166, 0.2);
  color: #9fb6a6;
}

.btn-remove {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

.btn-remove:hover {
  background: rgba(255, 107, 107, 0.2);
}

#tank-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #3a4a3a;
}

#tank-actions button {
  background: #26332b;
  color: #cfe3cf;
  border: 1px solid #4a5a4a;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

#tank-actions button:hover:not(:disabled) {
  background: #3a4a3a;
}

#tank-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-record {
  background: #1e2a3a !important;
  border-color: #3a5a7a !important;
  color: #8ac0e0 !important;
}

.btn-record:hover {
  background: #2a3a4a !important;
}
</style>
