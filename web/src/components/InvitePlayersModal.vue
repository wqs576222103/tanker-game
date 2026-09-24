<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal-box">
      <button class="modal-close-tr" @click="$emit('close')">✕</button>
      <div class="modal-header">
        <span>邀请在线玩家</span>
      </div>
      <div class="modal-body">
        <div class="search-bar">
          <input
            v-model="keyword"
            placeholder="搜索玩家名..."
            class="search-input"
          />
        </div>
        <div v-if="filteredUsers.length > 0" class="user-list">
          <div v-for="u in filteredUsers" :key="u.socketId" class="user-item">
            <span class="user-avatar">{{ (u.username || "玩家")[0] }}</span>
            <div class="user-info">
              <span class="user-name">{{ u.username || "匿名" }}</span>
              <span v-if="u.employeeId" class="user-emp">{{
                u.employeeId
              }}</span>
            </div>
            <span v-if="u.inRoom" class="user-status busy">在房间中</span>
            <button
              v-else
              class="btn-invite-one"
              :disabled="invitedIds.includes(u.socketId)"
              @click="$emit('invite', u.socketId)"
            >
              {{ invitedIds.includes(u.socketId) ? "已邀请" : "邀请" }}
            </button>
          </div>
        </div>
        <div v-else class="empty-tip">暂无匹配的在线玩家</div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  users: {
    type: Array,
    default: () => [],
  },
  invitedIds: {
    type: Array,
    default: () => [],
  },
  mySocketId: {
    type: String,
    default: "",
  },
});

defineEmits(["close", "invite"]);

const keyword = ref("");

const filteredUsers = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return props.users.filter((u) => {
    if (u.socketId === props.mySocketId) return false;
    if (!kw) return true;
    return (u.username || "").toLowerCase().includes(kw);
  });
});
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
  max-height: 70vh;
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
  color: #7de07d;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.search-bar {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid #3a4a3a;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #e0e0e0;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #7de07d;
}

.search-input::placeholder {
  color: #6a7a6a;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #3a4a3a;
  border-radius: 8px;
  padding: 10px 12px;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #45b7d1;
  color: #1a2118;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-emp {
  font-size: 11px;
  color: #6a7a6a;
}

.user-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.user-status.busy {
  background: rgba(255, 234, 167, 0.12);
  color: #ffeaa7;
}

.btn-invite-one {
  background: linear-gradient(135deg, #45b7d1, #96ceb4);
  color: #1a2118;
  border: none;
  padding: 5px 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-invite-one:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-invite-one:disabled {
  background: #3a4a3a;
  color: #6a7a6a;
  cursor: not-allowed;
}

.empty-tip {
  text-align: center;
  color: #6a7a6a;
  font-size: 13px;
  padding: 30px 0;
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
</style>
