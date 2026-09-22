<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleClose">
        <div class="modal-content">
          <div class="modal-icon" v-if="icon">{{ icon }}</div>
          <p class="modal-message">{{ message }}</p>
          <div class="modal-actions">
            <button
              v-if="showCancel"
              class="modal-btn secondary"
              @click="handleClose"
            >
              {{ cancelText }}
            </button>
            <button class="modal-btn primary" @click="handleConfirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: "",
  },
  confirmText: {
    type: String,
    default: "确定",
  },
  cancelText: {
    type: String,
    default: "取消",
  },
  showCancel: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["confirm", "close"]);

function handleConfirm() {
  emit("confirm");
  emit("close");
}

function handleClose() {
  emit("close");
}

function handleKeydown(e) {
  if (e.key === "Enter" || e.key === " ") {
    handleConfirm();
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      document.addEventListener("keydown", handleKeydown);
    } else {
      document.removeEventListener("keydown", handleKeydown);
    }
  },
);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: linear-gradient(145deg, #2a3a2a, #1a2a1a);
  border: 2px solid #4a6a4a;
  border-radius: 16px;
  padding: 28px 36px;
  max-width: 380px;
  width: 90%;
  text-align: center;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 0 60px rgba(100, 150, 100, 0.1);
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.modal-message {
  color: #d7e6d7;
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 20px;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.modal-btn {
  padding: 10px 32px;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 1px;
}

.modal-btn.primary {
  background: #e0a93a;
  color: #1c1408;
}

.modal-btn.primary:hover {
  background: #f0b94a;
  transform: scale(1.02);
}

.modal-btn.primary:active {
  transform: scale(0.98);
}

.modal-btn.secondary {
  background: transparent;
  color: #9fb6a6;
  border: 1px solid #4a5a4a;
}

.modal-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.08);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}
</style>
