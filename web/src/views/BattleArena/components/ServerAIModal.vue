<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <span>选择已有AI脚本</span>
        <span class="modal-tip"
          >已选 {{ selectedScripts.length }} 个，当前
          {{ aiTanks.length }}/8</span
        >
        <button class="modal-close" @click="$emit('close')">✕</button>
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
        <template v-if="employeeId">
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
        </template>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
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
</template>

<script setup>
import { ref, computed } from "vue";
import { aiTanks } from "../logic/gameState.js";
import { loadAIFromUrl, addAITank } from "../logic/aiManager.js";
import { getAiList } from "@/api/ai.js";
import { getUserInfo } from "@/utils/user.js";
import systemDefault from "@/views/TankGame/script/ai-tanker/default-tank.js";
import systemLevel from "@/views/TankGame/script/ai-tanker/level-tank.js";

const emit = defineEmits(["close"]);

const userInfo = computed(() => getUserInfo());
const employeeId = computed(() => userInfo.value?.employeeId);

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

fetchAIList();

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
  emit("close");
}
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
