<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal-box">
      <button class="modal-close-tr" @click="$emit('close')">✕</button>
      <div class="modal-header">
        <span>导入自定义地图</span>
      </div>
      <div class="modal-body">
        <div class="modal-tip-text">
          <strong>第一步：获取地图脚本编写指南</strong>
          <div class="action-buttons">
            <button class="btn-action" @click="downloadGuide">
              <span class="icon">⬇️</span> 下载指南文件
            </button>
            <span class="action-or">或者</span>
            <button class="btn-action" @click="copyGuideToClipboard">
              <span class="icon">📋</span> 复制指南到剪贴板
            </button>
          </div>
          <div v-if="copySuccess" class="copy-success">✅ 已复制到剪贴板</div>
        </div>

        <div class="modal-tip-text">
          <strong>第二步：编写地图脚本</strong>
          <div class="tip-detail">
            根据指南编写 JS
            脚本，定义地图布局、道具、出生点等。可借助AI生成脚本：
            <div class="site-links">
              <a
                href="https://tongyi.aliyun.com/qianwen"
                target="_blank"
                class="site-link"
                >通义千问</a
              >
              <a
                href="https://chat.deepseek.com/"
                target="_blank"
                class="site-link"
                >DeepSeek</a
              >
              <a
                href="https://chat.openai.com"
                target="_blank"
                class="site-link"
                >ChatGPT🪜</a
              >
              <a href="https://claude.ai" target="_blank" class="site-link"
                >Claude🪜</a
              >
            </div>
            <br />
            <span
              >将指南内容发送给AI，并追加你的需求，如："我想要一个迷宫地图，有加速通道和草丛掩体"。</span
            >
          </div>
        </div>

        <div class="modal-tip-text">
          <strong>第三步：导入脚本</strong>
        </div>
        <div class="script-input-area">
          <div class="file-import-section">
            <button class="btn-import-file" @click="triggerFileInput">
              <span class="icon">📁</span> 选择本地脚本文件
            </button>
            <input
              ref="fileInput"
              type="file"
              accept=".js"
              class="hidden-file-input"
              @change="handleFileImport"
            />
            <span v-if="fileName" class="file-name">{{ fileName }}</span>
            <span class="or-divider">或者粘贴脚本</span>
          </div>
          <textarea
            v-model="scriptContent"
            placeholder="将地图脚本代码粘贴到此处..."
            class="script-textarea"
          ></textarea>
        </div>
        <div v-if="scriptError" class="modal-error">{{ scriptError }}</div>
        <div v-if="scriptContent.trim() && employeeId" class="map-name-section">
          <label class="map-name-label">地图名称</label>
          <input
            v-model="mapName"
            placeholder="地图名称"
            class="map-name-input"
            maxlength="50"
          />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button
          class="btn-confirm"
          :disabled="!scriptContent.trim() || loading"
          @click="handleImport"
        >
          {{ loading ? "导入中..." : "确认导入" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import mapGuideUrl from "@/assets/map-script-guide.txt?url";

const props = defineProps({
  onImport: {
    type: Function,
    required: true,
  },
  employeeId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close"]);

const scriptContent = ref("");
const scriptError = ref("");
const loading = ref(false);
const copySuccess = ref(false);
const fileInput = ref(null);
const fileName = ref("");
const mapName = ref("");
let isUpdatingScript = false;

watch(mapName, (newName) => {
  if (isUpdatingScript || !scriptContent.value) return;
  const old = scriptContent.value;
  const updated = old.replace(/(name\s*:\s*)["'](.+?)["']/, `$1"${newName}"`);
  if (updated !== old) {
    scriptContent.value = updated;
  }
});

watch(scriptContent, (content) => {
  if (!content) {
    mapName.value = "";
    return;
  }
  const nameMatch = content.match(/name\s*:\s*["'](.+?)["']/);
  isUpdatingScript = true;
  mapName.value = nameMatch ? nameMatch[1] : "";
  setTimeout(() => {
    isUpdatingScript = false;
  }, 0);
});

function downloadGuide() {
  const link = document.createElement("a");
  link.href = mapGuideUrl;
  link.download = "map-script-guide.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function copyGuideToClipboard() {
  try {
    const response = await fetch(mapGuideUrl);
    const text = await response.text();
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (err) {
    console.error("复制失败:", err);
    scriptError.value = "复制失败，请手动下载指南文件";
  }
}

function triggerFileInput() {
  fileInput.value.click();
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith(".js")) {
    scriptError.value = "请选择.js格式的文件";
    return;
  }

  fileName.value = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    scriptContent.value = e.target.result;
    scriptError.value = "";
  };
  reader.onerror = () => {
    scriptError.value = "文件读取失败";
  };
  reader.readAsText(file);
  event.target.value = "";
}

async function handleImport() {
  scriptError.value = "";

  if (!scriptContent.value.trim()) {
    scriptError.value = "脚本内容不能为空";
    return;
  }

  loading.value = true;
  try {
    const finalMapName = mapName.value.trim() || "未命名地图";
    await props.onImport(scriptContent.value, {
      saveToServer: true,
      mapName: finalMapName,
    });
    scriptContent.value = "";
    scriptError.value = "";
    emit("close");
  } catch (err) {
    scriptError.value = "导入失败: " + err.message;
  } finally {
    loading.value = false;
  }
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
  position: relative;
  background: #1e2b22;
  border: 1px solid #4a5a4a;
  border-radius: 10px;
  width: 520px;
  max-height: 80vh;
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
}

.modal-tip-text {
  margin-bottom: 12px;
  font-size: 13px;
  color: #9fb6a6;
  line-height: 1.5;
}

.modal-tip-text strong {
  color: #ffd76e;
  display: block;
  margin-bottom: 8px;
}

.tip-detail {
  font-size: 12px;
  color: #8a9a8a;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.action-or {
  color: #6a7a6a;
  font-size: 12px;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #2a3a2a;
  color: #9fb6a6;
  border: 1px solid #4a5a4a;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #3a4a3a;
  color: #cfe3cf;
}

.btn-action .icon {
  font-size: 14px;
}

.copy-success {
  color: #4ade80;
  font-size: 12px;
  margin-top: 8px;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.site-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.site-link {
  display: inline-block;
  background: #2a3a2a;
  color: #4ade80;
  border: 1px solid #4a5a4a;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.site-link:hover {
  background: #3a4a3a;
  color: #86efac;
  border-color: #4ade80;
}

.script-textarea {
  width: 100%;
  height: 200px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid #3a4a3a;
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  font-family: "Consolas", "Monaco", monospace;
  color: #cfe3cf;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
}

.script-textarea:focus {
  border-color: #5a8a5a;
}

.script-textarea::placeholder {
  color: #6a7a6a;
}

.script-input-area {
  position: relative;
}

.file-import-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.or-divider {
  color: #6a7a6a;
  font-size: 12px;
}

.btn-import-file {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #2a3a2a;
  color: #9fb6a6;
  border: 1px solid #4a5a4a;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-import-file:hover {
  background: #3a4a3a;
  color: #cfe3cf;
}

.hidden-file-input {
  display: none;
}

.file-name {
  color: #4ade80;
  font-size: 12px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-error {
  color: #ff6b6b;
  font-size: 12px;
  margin-top: 8px;
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
.map-name-section {
  margin-top: 12px;
}
.map-name-label {
  display: block;
  font-size: 13px;
  color: #9fb6a6;
  margin-bottom: 6px;
}
.map-name-input {
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
.map-name-input:focus {
  border-color: #5a8a5a;
}
.map-name-input::placeholder {
  color: #6a7a6a;
}
</style>
