<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal-box">
      <button class="modal-close-tr" @click="$emit('close')">✕</button>
      <div class="modal-header">
        <span>导入AI脚本</span>
      </div>
      <div class="modal-body">
        <div class="modal-tip-text">请粘贴JS脚本内容，支持直接复制：</div>
        <textarea
          v-model="scriptContent"
          placeholder="在此粘贴AI脚本代码..."
          class="script-textarea"
        ></textarea>
        <div v-if="scriptError" class="modal-error">{{ scriptError }}</div>
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
import { ref } from "vue";
import { AIPlayer } from "../script/ai-player.js";
import { uploadAiScript } from "@/api/ai.js";

const props = defineProps({
  employeeId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close"]);

const scriptContent = ref("");
const scriptError = ref("");
const loading = ref(false);

async function handleImport() {
  scriptError.value = "";

  if (!scriptContent.value.trim()) {
    scriptError.value = "脚本内容不能为空";
    return;
  }

  loading.value = true;
  try {
    const blob = new Blob([scriptContent.value], {
      type: "text/javascript",
    });
    const file = new File([blob], "custom-ai.js", {
      type: "text/javascript",
    });

    if (props.employeeId) {
      try {
        await uploadAiScript(props.employeeId, file);
      } catch (err) {
        console.warn("[AI] 上传脚本到服务器失败:", err);
      }
    }

    const obj = await AIPlayer.parseFromSource(scriptContent.value);
    AIPlayer.loadAI(obj);
    if (!AIPlayer.enabled) {
      AIPlayer.toggle();
    }
    AIPlayer.updateUI();

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
  width: 440px;
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
}

.modal-tip-text {
  margin-bottom: 8px;
  font-size: 13px;
  color: #9fb6a6;
}

.script-textarea {
  width: 100%;
  height: 300px;
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
</style>
