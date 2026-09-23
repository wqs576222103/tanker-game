<template>
  <div class="lobby-container">
    <div class="lobby-header">
      <h2>在线对战</h2>
      <button class="btn-back" @click="goHome">返回主菜单</button>
    </div>

    <div v-if="toastMsg" class="toast-msg">{{ toastMsg }}</div>

    <div v-if="battleStarting" class="battle-loading">
      <div class="battle-loading-spinner"></div>
      <div class="battle-loading-text">正在进入游戏...</div>
    </div>

    <div class="lobby-body">
      <div class="lobby-left">
        <div class="lobby-section">
          <h3>快速匹配</h3>
          <p class="lobby-desc">点击匹配按钮，系统将自动为你寻找对手</p>
          <div v-if="!matching && !inRoom" class="lobby-actions">
            <button class="btn-match" @click="quickMatch">开始匹配</button>
          </div>
          <div v-if="matching" class="lobby-actions matching-box">
            <div class="matching-spinner"></div>
            <span class="matching-text">匹配中... 已等待 {{ matchElapsed }}s</span>
            <button class="btn-cancel" @click="cancelMatch">取消</button>
          </div>
        </div>

        <div class="lobby-section">
          <h3>创建房间</h3>
          <p class="lobby-desc">创建房间邀请好友对战</p>
          <div v-if="!matching && !inRoom" class="lobby-actions">
            <button class="btn-create" @click="createRoom">创建房间</button>
          </div>
          <div v-if="createdRoomId" class="room-code">
            <span>房间号：</span>
            <code>{{ createdRoomId }}</code>
            <button class="btn-copy" @click="copyRoomId">复制</button>
          </div>
        </div>

        <div class="lobby-section">
          <h3>加入房间</h3>
          <p class="lobby-desc">输入房间号加入好友的房间</p>
          <div v-if="!matching && !inRoom" class="lobby-actions join-form">
            <input
              v-model="joinRoomInput"
              placeholder="输入房间号"
              maxlength="20"
              @keyup.enter="joinRoom"
            />
            <button class="btn-join" @click="joinRoom" :disabled="!joinRoomInput.trim()">
              加入
            </button>
          </div>
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      </div>

      <div class="lobby-right">
        <div class="lobby-section">
          <h3>公开房间</h3>
          <div v-if="inRoom" class="room-players">
            <div class="room-info">
              <span>房间号: <code>{{ currentRoomId }}</code></span>
              <span>玩家: {{ roomPlayers.length }}/8</span>
            </div>
            <div class="player-list">
              <div
                v-for="(p, idx) in roomPlayers"
                :key="p.socketId"
                class="player-item"
                :style="{ borderLeftColor: teamColors[idx % teamColors.length] }"
              >
                <span class="player-avatar" :style="{ background: teamColors[idx % teamColors.length] }">
                  {{ (p.username || '玩家')[0] }}
                </span>
                <span class="player-name">{{ p.username || '玩家' }}</span>
                <span v-if="p.isHost" class="player-host-tag">房主</span>
                <span v-if="p.socketId === mySocketId" class="player-tag">我</span>
                <span
                  v-if="!p.isHost"
                  class="ready-status"
                  :class="p.ready ? 'ready-yes' : 'ready-no'"
                >
                  {{ p.ready ? '已准备' : '未准备' }}
                </span>
                <div v-if="isHost && p.socketId !== mySocketId" class="host-ops">
                  <button
                    v-if="!p.ready"
                    class="btn-mini remind"
                    title="提醒准备"
                    @click="remindReady(p.socketId)"
                  >提醒</button>
                  <button
                    class="btn-mini kick"
                    title="踢出房间"
                    @click="kickPlayer(p.socketId)"
                  >踢出</button>
                </div>
              </div>
            </div>
            <div v-if="!isHost" class="room-actions ready-actions">
              <button
                class="btn-ready"
                :class="{ 'is-ready': myReady }"
                @click="toggleReady"
              >
                {{ myReady ? '取消准备' : '准备' }}
              </button>
            </div>
            <div v-if="isHost && roomPlayers.length >= 2" class="room-actions">
              <button
                class="btn-start"
                :disabled="!allReady"
                @click="startBattle"
              >
                {{ allReady ? '开始对战' : '等待玩家准备...' }}
              </button>
            </div>
            <div v-else-if="!isHost && roomPlayers.length >= 2" class="room-hint">
              等待房主开始...
              <button
                class="btn-mini remind"
                style="margin-left: 8px"
                @click="remindStart"
              >提醒开始</button>
            </div>
            <div v-else class="room-hint">等待更多玩家加入...</div>
            <button class="btn-leave" @click="leaveRoom">离开房间</button>
          </div>
          <div v-else>
            <div v-if="publicRooms.length === 0" class="room-empty">暂无公开房间</div>
            <div v-else class="room-list">
              <div
                v-for="room in publicRooms"
                :key="room.roomId"
                class="room-list-item"
              >
                <div class="room-list-info">
                  <span class="room-list-host">{{ room.host || '匿名' }} 的房间</span>
                  <span class="room-list-meta">
                    {{ room.playerCount }}/{{ room.maxPlayers }} 人
                  </span>
                </div>
                <button
                  class="btn-enter-room"
                  :disabled="room.playerCount >= room.maxPlayers || matching"
                  @click="joinPublicRoom(room.roomId)"
                >
                  进入
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="lobby-section">
          <h3>最近对战</h3>
          <div class="recent-list">
            <div v-if="recentGames.length === 0" class="no-data">暂无记录</div>
            <div
              v-for="game in recentGames"
              :key="game.room_id"
              class="recent-item"
            >
              <span class="recent-winner">
                {{ game.is_draw ? '平局' : (game.winner_username || game.winner_name || '未知') }}
              </span>
              <span class="recent-info">
                {{ game.player_count }}人 · {{ formatDuration(game.game_duration_ms) }}
              </span>
              <span class="recent-time">{{ formatTime(game.create_time) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { getSocket, disconnectSocket } from "@/utils/socket";
import { getUserInfo } from "@/utils/user";
import { getOnlineBattleRooms } from "@/api/onlineBattle";

const router = useRouter();

const matching = ref(false);
const inRoom = ref(false);
const currentRoomId = ref("");
const createdRoomId = ref("");
const joinRoomInput = ref("");
const roomPlayers = ref([]);
const errorMsg = ref("");
const recentGames = ref([]);
const mySocketId = ref("");
const publicRooms = ref([]);
const matchElapsed = ref(0);
const battleStarting = ref(false);
const toastMsg = ref("");
const copied = ref(false);
let matchTimer = null;
let toastTimer = null;

const myReady = computed(() => {
  const me = roomPlayers.value.find((p) => p.socketId === mySocketId.value);
  return me ? me.ready : false;
});

const isHost = computed(() => {
  const me = roomPlayers.value.find((p) => p.socketId === mySocketId.value);
  return me ? me.isHost : false;
});

const allReady = computed(() => {
  const others = roomPlayers.value.filter((p) => !p.isHost);
  return roomPlayers.value.length >= 2 && others.every((p) => p.ready);
});

const teamColors = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4",
  "#ffeaa7", "#dfe6e9", "#a29bfe", "#fd79a8",
];

let socket = null;
let lobbyHandlers = null;

onMounted(() => {
  socket = getSocket();
  mySocketId.value = socket.id;
  setupSocketListeners();
  fetchRecentGames();
  socket.emit("get-my-room");
});

onUnmounted(() => {
  stopMatchTimer();
  if (socket && lobbyHandlers) {
    Object.entries(lobbyHandlers).forEach(([ev, fn]) => socket.off(ev, fn));
    lobbyHandlers = null;
  }
});

function setupSocketListeners() {
  lobbyHandlers = {
    matched: (data) => {
      matching.value = false;
      stopMatchTimer();
      inRoom.value = true;
      currentRoomId.value = data.roomId;
      roomPlayers.value = data.players;
      mySocketId.value = socket.id;
      errorMsg.value = "";
    },
    "queue-joined": () => {
      matching.value = true;
      startMatchTimer();
    },
    "queue-left": () => {
      matching.value = false;
      stopMatchTimer();
    },
    "room-created": (data) => {
      inRoom.value = true;
      currentRoomId.value = data.roomId;
      createdRoomId.value = data.roomId;
      roomPlayers.value = data.players;
      mySocketId.value = socket.id;
      errorMsg.value = "";
      socket.emit("get-rooms");
    },
    "room-joined": (data) => {
      inRoom.value = true;
      currentRoomId.value = data.roomId;
      roomPlayers.value = data.players;
      mySocketId.value = socket.id;
      errorMsg.value = "";
    },
    "player-joined": (data) => {
      roomPlayers.value = data.players;
    },
    "player-left": (data) => {
      roomPlayers.value = data.players;
    },
    "join-error": (data) => {
      errorMsg.value = data.message;
    },
    "start-error": (data) => {
      errorMsg.value = data.message;
    },
    countdown: () => {
      errorMsg.value = "";
    },
    "game-start": () => {
      battleStarting.value = false;
    },
    "game-over": () => {
      battleStarting.value = false;
      showToast("对战已结束，已返回房间");
    },
    "my-room": (data) => {
      if (data && data.inRoom && data.roomId) {
        inRoom.value = true;
        currentRoomId.value = data.roomId;
        roomPlayers.value = data.players || [];
        mySocketId.value = socket.id;
      }
    },
    "rooms-list": (data) => {
      publicRooms.value = data.rooms || [];
    },
    "rooms-updated": (data) => {
      publicRooms.value = data.rooms || [];
    },
    "room-updated": (data) => {
      roomPlayers.value = data.players || [];
      if (data.state === "waiting") {
        battleStarting.value = false;
      }
    },
    "battle-starting": () => {
      battleStarting.value = true;
      errorMsg.value = "";
    },
    kicked: (data) => {
      inRoom.value = false;
      currentRoomId.value = "";
      createdRoomId.value = "";
      roomPlayers.value = [];
      battleStarting.value = false;
      showToast(data.message || "你已被移出房间");
    },
    reminded: (data) => {
      showToast(data.message || "房主提醒您准备！");
    },
  };
  Object.entries(lobbyHandlers).forEach(([ev, fn]) => socket.on(ev, fn));
  socket.emit("get-rooms");
}

function startMatchTimer() {
  matchElapsed.value = 0;
  stopMatchTimer();
  matchTimer = setInterval(() => {
    matchElapsed.value++;
  }, 1000);
}

function stopMatchTimer() {
  if (matchTimer) {
    clearInterval(matchTimer);
    matchTimer = null;
  }
}

function quickMatch() {
  if (!socket) return;
  errorMsg.value = "";
  matching.value = true;
  startMatchTimer();
  socket.emit("quick-match", {
    userInfo: _getUserInfoPayload(),
  });
}

function cancelMatch() {
  if (!socket) return;
  socket.emit("leave-queue");
  matching.value = false;
  stopMatchTimer();
}

function joinPublicRoom(roomId) {
  if (!socket || matching.value || inRoom.value) return;
  errorMsg.value = "";
  socket.emit("join-room", {
    roomId,
    userInfo: _getUserInfoPayload(),
  });
}

function createRoom() {
  if (!socket) return;
  errorMsg.value = "";
  socket.emit("create-room", {
    userInfo: _getUserInfoPayload(),
  });
}

function joinRoom() {
  const roomId = joinRoomInput.value.trim();
  if (!roomId || !socket) return;
  errorMsg.value = "";
  socket.emit("join-room", {
    roomId,
    userInfo: _getUserInfoPayload(),
  });
}

function startBattle() {
  if (!socket) return;
  socket.emit("start-battle");
}

function toggleReady() {
  if (!socket) return;
  socket.emit("player-ready", { ready: !myReady.value });
}

function kickPlayer(targetSocketId) {
  if (!socket) return;
  socket.emit("kick-player", { targetSocketId });
}

function remindReady(targetSocketId) {
  if (!socket) return;
  socket.emit("remind-ready", { targetSocketId });
}

function remindStart() {
  if (!socket) return;
  socket.emit("remind-start");
}

function showToast(msg) {
  toastMsg.value = msg;
  copied.value = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMsg.value = "";
  }, 2500);
}

function leaveRoom() {
  if (!socket) return;
  socket.emit("leave-room");
  inRoom.value = false;
  currentRoomId.value = "";
  createdRoomId.value = "";
  roomPlayers.value = [];
  battleStarting.value = false;
}

function goHome() {
  if (inRoom.value) leaveRoom();
  router.push("/home");
}

function copyRoomId() {
  const text = createdRoomId.value;
  const onSuccess = () => {
    copied.value = true;
    showToast("房间号已复制");
  };
  const onFail = () => {
    showToast("复制失败，请手动复制");
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      fallbackCopy(text) ? onSuccess() : onFail();
    });
  } else {
    fallbackCopy(text) ? onSuccess() : onFail();
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

function _getUserInfoPayload() {
  const info = getUserInfo();
  return {
    employeeId: info.employeeId || "",
    username: info.username || "匿名",
    tankName: info.username || "坦克",
  };
}

async function fetchRecentGames() {
  try {
    const res = await getOnlineBattleRooms({ page: 1, pageSize: 5 });
    if (res.code === 200) {
      recentGames.value = res.data.list || [];
    }
  } catch (e) {
    console.warn("获取最近对战失败:", e);
  }
}

function formatDuration(ms) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const d = new Date(timeStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
}
</script>

<style scoped>
.lobby-container {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #1a2118;
  color: #e0e0e0;
  font-family: 'Microsoft YaHei', sans-serif;
  overflow: hidden;
}

.lobby-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #1e2a1c;
  border-bottom: 1px solid #3a4a3a;
  flex-shrink: 0;
}

.lobby-header h2 {
  margin: 0;
  font-size: 20px;
  color: #7de07d;
}

.btn-back {
  padding: 6px 16px;
  background: #3a4a3a;
  color: #ccc;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-back:hover {
  background: #4a5a4a;
}

.lobby-body {
  display: flex;
  flex: 1;
  gap: 16px;
  padding: 16px 24px;
  overflow: hidden;
}

.lobby-left, .lobby-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.lobby-section {
  background: #1e2a1c;
  border: 1px solid #3a4a3a;
  border-radius: 8px;
  padding: 16px;
}

.lobby-section h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #7de07d;
}

.lobby-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: #8a9a8a;
}

.lobby-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-match, .btn-create, .btn-join, .btn-start {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-match {
  background: linear-gradient(135deg, #7de07d, #4ecdc4);
  color: #1a2118;
}

.btn-match:hover {
  transform: scale(1.05);
}

.btn-create {
  background: linear-gradient(135deg, #45b7d1, #96ceb4);
  color: #1a2118;
}

.btn-join {
  background: linear-gradient(135deg, #a29bfe, #6c5ce7);
  color: #fff;
}

.btn-start {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: #fff;
  width: 100%;
  padding: 12px;
  font-size: 16px;
}

.btn-cancel {
  padding: 8px 16px;
  background: #555;
  color: #ccc;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-leave {
  margin-top: 8px;
  padding: 8px 16px;
  background: #553;
  color: #aa8;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}

.join-form {
  display: flex;
  gap: 8px;
}

.join-form input {
  flex: 1;
  padding: 8px 12px;
  background: #2a3a2a;
  border: 1px solid #4a5a4a;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
}

.join-form input:focus {
  border-color: #7de07d;
}

.join-form input:disabled {
  opacity: 0.5;
}

.room-code {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.room-code code {
  background: #2a3a2a;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: #7de07d;
  user-select: all;
}

.btn-copy {
  padding: 4px 8px;
  background: #3a4a3a;
  color: #aaa;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.room-players {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #8a9a8a;
}

.room-info code {
  color: #7de07d;
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #2a3a2a;
  border-radius: 6px;
  border-left: 3px solid;
}

.player-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  color: #1a2118;
  flex-shrink: 0;
}

.player-name {
  flex: 1;
  font-size: 14px;
}

.player-tag {
  background: #7de07d;
  color: #1a2118;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.room-actions {
  margin-top: 8px;
}

.room-hint {
  text-align: center;
  color: #8a9a8a;
  font-size: 13px;
  padding: 8px;
}

.matching-box {
  background: rgba(255, 234, 167, 0.08);
  border: 1px solid rgba(255, 234, 167, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
}

.matching-spinner {
  width: 22px;
  height: 22px;
  border: 3px solid rgba(255, 234, 167, 0.25);
  border-top-color: #ffeaa7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.matching-text {
  color: #ffeaa7;
  font-weight: bold;
  font-size: 14px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.room-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: #2a3a2a;
  border-radius: 6px;
}

.room-list-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.room-list-host {
  font-size: 14px;
  color: #e0e0e0;
}

.room-list-meta {
  font-size: 12px;
  color: #8a9a8a;
}

.btn-enter-room {
  padding: 6px 16px;
  background: linear-gradient(135deg, #a29bfe, #6c5ce7);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  flex-shrink: 0;
}

.btn-enter-room:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-enter-room:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.room-empty {
  text-align: center;
  color: #5a6a5a;
  padding: 24px;
}

.error-msg {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(255, 107, 107, 0.15);
  border: 1px solid #ff6b6b;
  border-radius: 4px;
  color: #ff6b6b;
  font-size: 13px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.no-data {
  text-align: center;
  color: #5a6a5a;
  padding: 16px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #2a3a2a;
  border-radius: 4px;
  font-size: 13px;
}

.recent-winner {
  color: #ffeaa7;
  font-weight: bold;
  flex: 1;
}

.recent-info {
  color: #8a9a8a;
}

.recent-time {
  color: #6a7a6a;
  font-size: 12px;
}

.player-host-tag {
  background: #ffeaa7;
  color: #1a2118;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.ready-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.ready-yes {
  background: rgba(125, 224, 125, 0.2);
  color: #7de07d;
}

.ready-no {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
}

.host-ops {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-mini {
  padding: 2px 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  font-weight: bold;
}

.btn-mini.remind {
  background: #45b7d1;
  color: #1a2118;
}

.btn-mini.kick {
  background: #ff6b6b;
  color: #fff;
}

.btn-mini:hover {
  transform: scale(1.05);
}

.ready-actions {
  display: flex;
  gap: 8px;
}

.btn-ready {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  background: linear-gradient(135deg, #45b7d1, #96ceb4);
  color: #1a2118;
  transition: all 0.2s;
}

.btn-ready:hover {
  transform: scale(1.02);
}

.btn-ready.is-ready {
  background: #3a4a3a;
  color: #7de07d;
}

.btn-start:disabled {
  background: #3a4a3a;
  color: #6a7a6a;
  cursor: not-allowed;
  transform: none;
}

.toast-msg {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: #2a3a2a;
  border: 1px solid #7de07d;
  color: #7de07d;
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  z-index: 1000;
  animation: toast-in 0.3s ease;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.battle-loading {
  position: absolute;
  inset: 0;
  background: rgba(26, 33, 24, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 999;
}

.battle-loading-spinner {
  width: 48px;
  height: 48px;
  border: 5px solid rgba(125, 224, 125, 0.2);
  border-top-color: #7de07d;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.battle-loading-text {
  color: #7de07d;
  font-size: 18px;
  font-weight: bold;
}
</style>
