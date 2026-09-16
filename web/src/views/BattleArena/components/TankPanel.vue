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
    <div
      v-if="showServerAI"
      class="modal-mask"
      @click.self="showServerAI = false"
    >
      <div class="modal-box">
        <div class="modal-header">
          <span>选择已有AI脚本</span>
          <span class="modal-tip"
            >已选 {{ selectedScripts.length }} 个，当前
            {{ aiTanks.length }}/8</span
          >
          <button class="modal-close" @click="showServerAI = false">✕</button>
        </div>
        <div class="modal-search">
          <input
            v-model="searchKeyword"
            placeholder="搜索员工ID或用户名..."
            @input="fetchAIList"
          />
        </div>
        <div class="modal-list">
          <div class="modal-section-title">系统脚本</div>
          <div
            v-for="item in systemScripts"
            :key="item.employee_id"
            class="modal-item"
            :class="{
              'is-dup': isDuplicated(item.file_name, '', item.employee_id),
              'is-full':
                aiTanks.length >= 8 &&
                !isDuplicated(item.file_name, '', item.employee_id) &&
                !isSelected(item.employee_id),
            }"
          >
            <label class="modal-item-inner">
              <input
                type="checkbox"
                :checked="isSelected(item.employee_id)"
                :disabled="
                  isDuplicated(item.file_name, '', item.employee_id) ||
                  (aiTanks.length >= 8 && !isSelected(item.employee_id))
                "
                @change="toggleSelect(item)"
              />
              <span class="modal-item-name" :title="item.file_name">{{
                item.file_name
              }}</span>
              <span class="modal-item-user">{{ item.username }}</span>
              <span
                v-if="isDuplicated(item.file_name, '', item.employee_id)"
                class="modal-item-tag tag-dup"
                >已导入</span
              >
              <span
                v-else-if="aiTanks.length >= 8 && !isSelected(item.employee_id)"
                class="modal-item-tag tag-full"
                >已满</span
              >
            </label>
          </div>
          <div class="modal-section-title">玩家AI脚本</div>
          <div
            v-if="serverAIList.length === 0 && !listLoading"
            class="modal-empty"
          >
            暂无AI脚本
          </div>
          <div
            v-for="item in serverAIList"
            :key="item.employee_id"
            class="modal-item"
            :class="{
              'is-dup': isDuplicated(
                item.file_name,
                item.script_path,
                item.employee_id,
              ),
              'is-full':
                aiTanks.length >= 8 &&
                !isDuplicated(
                  item.file_name,
                  item.script_path,
                  item.employee_id,
                ) &&
                !isSelected(item.employee_id),
            }"
          >
            <label class="modal-item-inner">
              <input
                type="checkbox"
                :checked="isSelected(item.employee_id)"
                :disabled="
                  isDuplicated(
                    item.file_name,
                    item.script_path,
                    item.employee_id,
                  ) ||
                  (aiTanks.length >= 8 && !isSelected(item.employee_id))
                "
                @change="toggleSelect(item)"
              />
              <span class="modal-item-name" :title="item.file_name">{{
                item.file_name
              }}</span>
              <span class="modal-item-user">{{
                item.username || item.employee_id
              }}</span>
              <span
                v-if="
                  isDuplicated(
                    item.file_name,
                    item.script_path,
                    item.employee_id,
                  )
                "
                class="modal-item-tag tag-dup"
                >已导入</span
              >
              <span
                v-else-if="aiTanks.length >= 8 && !isSelected(item.employee_id)"
                class="modal-item-tag tag-full"
                >已满</span
              >
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showServerAI = false">取消</button>
          <button
            class="btn-confirm"
            :disabled="selectedScripts.length === 0 || importing"
            @click="confirmImport"
          >
            {{ importing ? "导入中..." : `导入 (${selectedScripts.length})` }}
          </button>
        </div>
      </div>
    </div>

    <!-- 脚本导入弹窗 -->
    <div
      v-if="showScriptImport"
      class="modal-mask"
      @click.self="showScriptImport = false"
    >
      <div class="modal-box modal-box-script">
        <button
          class="modal-close modal-close-tr"
          @click="showScriptImport = false"
        >
          ✕
        </button>
        <div class="modal-header">
          <span>导入AI脚本</span>
        </div>
        <div class="modal-list" style="padding: 16px">
          <div style="margin-bottom: 8px; font-size: 13px; color: #9fb6a6">
            请粘贴JS脚本内容，支持直接复制：
          </div>
          <textarea
            v-model="scriptContent"
            placeholder="在此粘贴AI脚本代码..."
            style="
              width: 100%;
              height: 300px;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid #3a4a3a;
              border-radius: 6px;
              padding: 12px;
              font-size: 12px;
              font-family: &quot;Consolas&quot;, &quot;Monaco&quot;, monospace;
              color: #cfe3cf;
              outline: none;
              box-sizing: border-box;
              resize: vertical;
            "
          ></textarea>
          <div
            v-if="scriptError"
            style="color: #ff6b6b; font-size: 12px; margin-top: 8px"
          >
            {{ scriptError }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showScriptImport = false">
            取消
          </button>
          <button
            class="btn-confirm"
            :disabled="!scriptContent.trim()"
            @click="confirmScriptImport"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { aiTanks, gameState } from "../logic/gameState.js";
import {
  removeAITank,
  clearAllAITanks,
  loadAIFromUrl,
  loadAIFile,
  addAITank,
} from "../logic/aiManager.js";
import { getAiList } from "@/api/ai.js";
import { getUserInfo, getToken } from "@/utils/user.js";
import { generateFingerprint } from "@/utils/fingerprint.js";
import systemDefault from "@/views/TankGame/script/ai-tanker/default-tank.js";
import systemLevel from "@/views/TankGame/script/ai-tanker/level-tank.js";

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
const serverAIList = ref([]);
const selectedScripts = ref([]);
const searchKeyword = ref("");
const listLoading = ref(false);
const importing = ref(false);

const systemScripts = [
  {
    file_name: systemDefault.name || "随机游走",
    scriptModule: systemDefault,
    employee_id: "XT01",
    username: "系统",
  },
  {
    file_name: systemLevel.name || "关卡AI",
    scriptModule: systemLevel,
    employee_id: "XT02",
    username: "系统",
  },
];

function openServerAILoad() {
  showServerAI.value = true;
  selectedScripts.value = [];
  fetchAIList();
}

async function fetchAIList() {
  listLoading.value = true;
  try {
    const res = await getAiList({ keyword: searchKeyword.value, pageSize: 50 });
    serverAIList.value = res?.data?.list || [];
  } catch (err) {
    console.error("获取AI列表失败:", err);
    serverAIList.value = [];
  } finally {
    listLoading.value = false;
  }
}

const importedKeys = computed(() => {
  return new Set(
    aiTanks.value.map(
      (ai) => `${ai.name}\n${ai.scriptPath || ""}\n${ai.employeeId || ""}`,
    ),
  );
});

const importedEmployeeIds = computed(() => {
  return new Set(aiTanks.value.map((ai) => ai.employeeId).filter(Boolean));
});

// 脚本导入弹窗相关
const showScriptImport = ref(false);
const scriptContent = ref("");
const scriptError = ref("");

async function confirmScriptImport() {
  scriptError.value = "";

  if (!scriptContent.value.trim()) {
    scriptError.value = "脚本内容不能为空";
    return;
  }

  if (aiTanks.value.length >= 8) {
    scriptError.value = "AI槽位已满，无法导入";
    return;
  }

  try {
    const userInfo = getUserInfo();
    let empId = userInfo?.employeeId;
    if (!empId) {
      empId = generateFingerprint();
    }

    const blob = new Blob([scriptContent.value], { type: "text/javascript" });
    const file = new File([blob], "custom-ai.js", { type: "text/javascript" });
    const aiModule = await loadAIFile(file);
    const name = aiModule.name || "自定义AI";
    addAITank(name, aiModule, "custom-script", empId, userInfo.username);

    scriptContent.value = "";
    scriptError.value = "";
    showScriptImport.value = false;
  } catch (err) {
    scriptError.value = "导入失败: " + err.message;
  }
}

function isDuplicated(fileName, scriptPath, employeeId) {
  if (employeeId && importedEmployeeIds.value.has(employeeId)) {
    return true;
  }
  return importedKeys.value.has(
    `${fileName}\n${scriptPath || ""}\n${employeeId || ""}`,
  );
}

function isSelected(employeeId) {
  return selectedScripts.value.some((s) => s.employee_id === employeeId);
}

function toggleSelect(item) {
  if (isSelected(item.employee_id)) {
    selectedScripts.value = selectedScripts.value.filter(
      (s) => s.employee_id !== item.employee_id,
    );
  } else {
    if (aiTanks.value.length + selectedScripts.value.length >= 8) return;
    selectedScripts.value.push(item);
  }
}

async function confirmImport() {
  importing.value = true;
  const tasks = selectedScripts.value.map(async (item) => {
    try {
      if (item.scriptModule) {
        addAITank(
          item.file_name,
          item.scriptModule,
          "",
          item.employee_id,
          item.username,
        );
      } else {
        await loadAIFromUrl(
          item.script_path,
          item.file_name,
          item.employee_id,
          item.username,
        );
      }
    } catch (err) {
      console.error(`导入 ${item.file_name} 失败:`, err);
    }
  });
  await Promise.allSettled(tasks);
  importing.value = false;
  showServerAI.value = false;
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

/* 弹窗样式 */
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
  background: #1e2b22;
  border: 1px solid #4a5a4a;
  border-radius: 10px;
  width: 440px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #3a4a3a;
  font-size: 15px;
  font-weight: bold;
  color: #ffd76e;
  gap: 8px;
}

.modal-tip {
  font-size: 12px;
  font-weight: normal;
  color: #9fb6a6;
  margin-left: auto;
}

.modal-close {
  background: none;
  border: none;
  color: #9fb6a6;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  margin-left: 8px;
}

.modal-close:hover {
  color: #ff6b6b;
}

.modal-box-script {
  position: relative;
}

.modal-close-tr {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
}

.modal-search {
  padding: 10px 16px 0;
}

.modal-search input {
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

.modal-search input:focus {
  border-color: #5a8a5a;
}

.modal-search input::placeholder {
  color: #6a7a6a;
}

.modal-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
  max-height: 400px;
  min-height: 120px;
}

.modal-empty {
  text-align: center;
  color: #6a7a6a;
  padding: 30px 0;
  font-size: 13px;
}

.modal-section-title {
  font-size: 12px;
  font-weight: bold;
  color: #7a9a7a;
  padding: 8px 0 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 2px;
}

.modal-item {
  padding: 0;
}

.modal-item + .modal-item {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-item-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  cursor: pointer;
  font-size: 13px;
}

.modal-item input[type="checkbox"] {
  accent-color: #5a8a5a;
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.modal-item input[type="checkbox"]:disabled {
  cursor: not-allowed;
}

.modal-item-name {
  color: #cfe3cf;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.modal-item-user {
  color: #6a7a6a;
  font-size: 12px;
  flex-shrink: 0;
}

.modal-item-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.tag-dup {
  background: rgba(159, 182, 166, 0.2);
  color: #9fb6a6;
}

.tag-full {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.modal-item.is-dup .modal-item-name,
.modal-item.is-full .modal-item-name {
  color: #6a7a6a;
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

.btn-confirm {
  background: #4a7a4a;
  color: #fff;
  border: 1px solid #6a9a6a;
  padding: 6px 20px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-confirm:hover:not(:disabled) {
  background: #5a8a5a;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
