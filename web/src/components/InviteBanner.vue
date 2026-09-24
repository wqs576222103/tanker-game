<template>
  <Transition name="invite-slide">
    <div v-if="inviteStore.pending" class="invite-banner">
      <div class="invite-text">
        <span class="invite-from">{{ inviteStore.pending.fromUsername }}</span>
        邀请你加入
        <span class="invite-room">{{
          inviteStore.pending.roomName || "房间"
        }}</span>
      </div>
      <div class="invite-actions">
        <button class="btn-accept" @click="acceptInvite">接受</button>
        <button class="btn-decline" @click="declineInvite">拒绝</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getSocket } from "@/utils/socket";
import { getUserInfo } from "@/utils/user";
import { inviteStore } from "@/utils/inviteStore";

const router = useRouter();
const route = useRoute();

let dismissTimer = null;

watch(
  () => inviteStore.pending,
  (val) => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    if (val) {
      dismissTimer = setTimeout(() => {
        inviteStore.pending = null;
      }, 30000);
    }
  },
  { immediate: true },
);

function _payload() {
  const info = getUserInfo();
  return {
    employeeId: info.employeeId || "",
    username: info.username || "匿名",
    tankName: info.username || "坦克",
  };
}

async function acceptInvite() {
  const inv = inviteStore.pending;
  if (!inv) return;
  inviteStore.pending = null;
  const socket = getSocket();
  socket.emit("leave-queue");

  const onLobby =
    route.path === "/online-battle" || route.path === "/online-battle/";
  if (onLobby) {
    socket.emit("join-room", { roomId: inv.roomId, userInfo: _payload() });
    return;
  }
  inviteStore.autoJoinRoomId = inv.roomId;
  if (!route.path.startsWith("/online-battle")) {
    await router.push("/online-battle");
  }
}

function declineInvite() {
  const inv = inviteStore.pending;
  if (!inv) return;
  inviteStore.pending = null;
  getSocket().emit("decline-invite", { fromSocketId: inv.fromSocketId });
}
</script>

<style scoped>
.invite-banner {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: #1e2b22;
  border: 1px solid #45b7d1;
  color: #e0e0e0;
  padding: 12px 18px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  z-index: 2000;
  font-size: 14px;
  max-width: 90vw;
}

.invite-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invite-from {
  color: #7de07d;
  font-weight: bold;
}

.invite-room {
  color: #45b7d1;
  font-weight: bold;
}

.invite-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-accept {
  padding: 6px 16px;
  background: linear-gradient(135deg, #7de07d, #4ecdc4);
  color: #1a2118;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
}

.btn-accept:hover {
  transform: scale(1.05);
}

.btn-decline {
  padding: 6px 16px;
  background: #3a4a3a;
  color: #ccc;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-decline:hover {
  background: #4a5a4a;
}

.invite-slide-enter-active,
.invite-slide-leave-active {
  transition: all 0.3s ease;
}

.invite-slide-enter-from,
.invite-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}
</style>
