<template>
  <div id="tank-panel">
    <div class="panel-title">AI玩家列表</div>
    <div id="tank-list">
      <div
        v-for="(ai, i) in aiTanks"
        :key="ai.id"
        class="tank-item"
        :style="{ borderLeftColor: ai.color }"
      >
        <span class="tank-color" :style="{ background: ai.color }"></span>
        <span class="tank-name">{{
          ai.name.length > 8 ? ai.name.slice(0, 8) + "..." : ai.name
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
          {{ ai.tank ? (ai.tank.alive ? "存活" : "阵亡") : "准备" }}
        </span>
        <span class="tank-stats">{{ ai.kills }}杀/{{ ai.deaths }}死</span>
        <button class="btn-remove" @click="removeTank(i)">✕</button>
      </div>
    </div>
    <div id="tank-actions">
      <button id="btn-import-ai" :disabled="isPlaying" @click="triggerImport">
        📥 导入 AI
      </button>
      <button id="btn-clear-all" :disabled="isPlaying" @click="clearAll">
        🗑️ 清空
      </button>
      <input
        type="file"
        id="ai-file"
        accept=".js"
        multiple
        style="display: none"
        @change="onFileChange"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { aiTanks, gameState } from "../logic/gameState.js";
import { removeAITank, clearAllAITanks } from "../logic/aiManager.js";

const emit = defineEmits(["import"]);

const isPlaying = computed(
  () => gameState.value === "playing" || gameState.value === "paused",
);

function triggerImport() {
  document.getElementById("ai-file").click();
}

function onFileChange(e) {
  if (e.target.files.length > 0) {
    emit("import", e.target.files);
  }
  e.target.value = "";
}
</script>

<style scoped>
#tank-panel {
  margin-top: 30px;
  width: 280px;
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
}

.tank-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tank-name {
  flex: 1;
  font-size: 13px;
  color: #ffd76e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
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
</style>
