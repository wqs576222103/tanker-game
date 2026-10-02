<template>
  <div
    class="map-select"
    @mouseenter="clearDropdownTimer"
    @mouseleave="hideDropdown"
  >
    <button
      type="button"
      class="map-select-btn"
      :disabled="disabled"
      @click="showDropdown = !showDropdown"
    >
      🗺️ {{ displayLabel }}
    </button>
    <div v-show="showDropdown && !disabled" class="map-dropdown">
      <div class="map-dropdown-item" @click="pickRandom">
        <span class="map-dropdown-icon">🎲</span> 随机地图
      </div>
      <div class="map-dropdown-item" @click="openPlayerMaps">
        <span class="map-dropdown-icon">👥</span> 玩家地图
      </div>
      <div class="map-dropdown-item" @click="openImport">
        <span class="map-dropdown-icon">📥</span> 导入地图
      </div>
    </div>

    <MapScriptImportModal
      v-if="showMapImport"
      :on-import="handleMapImport"
      :employee-id="employeeId"
      @close="showMapImport = false"
    />
    <PlayerMapListModal
      v-if="showPlayerMapList"
      :current-employee-id="employeeId"
      @close="showPlayerMapList = false"
      @select="handlePlayerMapSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getUserInfo } from "@/utils/user";
import { parseMapScript, validateMapConfig } from "@/views/TankGame/script/base/map-script.js";
import { getMapScript, uploadMapScript } from "@/api/map.js";
import MapScriptImportModal from "@/components/MapScriptImportModal.vue";
import PlayerMapListModal from "@/components/PlayerMapListModal.vue";

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  placeholder: {
    type: String,
    default: "选择地图",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "select"]);

const showDropdown = ref(false);
const showMapImport = ref(false);
const showPlayerMapList = ref(false);
const employeeId = ref("");
let dropdownTimer = null;

const displayLabel = computed(() => {
  const v = props.modelValue;
  if (v && v.name) return v.name;
  return props.placeholder;
});

onMounted(() => {
  try {
    const info = getUserInfo();
    employeeId.value = (info && info.employeeId) || "";
  } catch (err) {
    employeeId.value = "";
  }
});

function pick(value) {
  showDropdown.value = false;
  emit("update:modelValue", value);
  emit("select", value);
}

function pickRandom() {
  pick({ type: "random", name: "随机地图", config: null });
}

function openPlayerMaps() {
  showDropdown.value = false;
  showPlayerMapList.value = true;
}

function openImport() {
  showDropdown.value = false;
  showMapImport.value = true;
}

function hideDropdown() {
  clearTimeout(dropdownTimer);
  dropdownTimer = setTimeout(() => {
    showDropdown.value = false;
  }, 300);
}

function clearDropdownTimer() {
  clearTimeout(dropdownTimer);
}

async function buildCustomMap(scriptContent, name) {
  const config = await parseMapScript(scriptContent);
  const result = validateMapConfig(config);
  if (!result.valid) {
    throw new Error(result.message);
  }
  const mapName = String(config.name || name || "自定义地图").trim().slice(0, 20) || "自定义地图";
  return { type: "custom", name: mapName, config };
}

async function handleMapImport(scriptContent, { saveToServer, mapName } = {}) {
  const value = await buildCustomMap(scriptContent, mapName);
  if (saveToServer && employeeId.value) {
    try {
      const blob = new Blob([scriptContent], { type: "text/javascript" });
      const file = new File([blob], `${mapName || "custom-map"}.js`, {
        type: "text/javascript",
      });
      await uploadMapScript(employeeId.value, mapName, file);
    } catch (err) {
      console.warn("[Map] 上传地图脚本到服务器失败:", err);
    }
  }
  pick(value);
}

async function handlePlayerMapSelect(item) {
  showPlayerMapList.value = false;
  try {
    const res = await getMapScript(item.id);
    const scriptPath = res?.data?.scriptPath;
    if (!scriptPath) {
      console.error("地图脚本路径为空");
      return;
    }
    const resp = await fetch(scriptPath);
    if (!resp.ok) {
      console.error("拉取地图脚本失败:", resp.status);
      return;
    }
    const scriptContent = await resp.text();
    const value = await buildCustomMap(scriptContent, item.mapName);
    pick(value);
  } catch (err) {
    console.error("加载玩家地图失败:", err);
  }
}
</script>

<style scoped>
.map-select {
  position: relative;
  display: inline-block;
}

.map-select-btn {
  padding: 8px 14px;
  background: #2a3a2a;
  color: #cfe3cf;
  border: 1px solid #4a5a4a;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.map-select-btn:hover:not(:disabled) {
  border-color: #7de07d;
  color: #7de07d;
}

.map-select-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.map-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 6px;
  background: #1e2b22;
  border: 1px solid #4a5a4a;
  border-radius: 8px;
  padding: 4px 0;
  min-width: 150px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 30;
}

.map-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  font-size: 13px;
  color: #cfe3cf;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.map-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffd76e;
}

.map-dropdown-icon {
  font-size: 15px;
}
</style>
