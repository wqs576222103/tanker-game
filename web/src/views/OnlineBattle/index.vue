<template>
  <Lobby v-if="view === 'lobby'" />
  <BattleView v-else-if="view === 'play'" @back="onBattleBack" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getSocket,
  userInfoPayload,
  saveLastRoomId,
  getLastRoomId,
} from "@/utils/socket";
import Lobby from "./components/Lobby.vue";
import BattleView from "./components/BattleView.vue";

const route = useRoute();
const router = useRouter();
const view = ref("lobby");
const socket = getSocket();
let indexHandlers = null;
let rejoinTimer = null;

onMounted(() => {
  _syncView();
  indexHandlers = {
    "game-start": (data) => {
      socket._pendingGameState = data;
      view.value = "play";
    },
    matched: (data) => {
      socket._lastRoomId = data.roomId;
      saveLastRoomId(data.roomId);
    },
    "room-created": (data) => {
      socket._lastRoomId = data.roomId;
      saveLastRoomId(data.roomId);
    },
    "room-joined": (data) => {
      socket._lastRoomId = data.roomId;
      saveLastRoomId(data.roomId);
    },
    "join-error": (data) => {
      if (data && typeof data.message === "string" && data.message.includes("房间不存在")) {
        saveLastRoomId("");
        if (socket._lastRoomId) socket._lastRoomId = "";
      }
    },
    kicked: () => {
      saveLastRoomId("");
      if (socket._lastRoomId) socket._lastRoomId = "";
    },
  };
  Object.entries(indexHandlers).forEach(([ev, fn]) => socket.on(ev, fn));

  if (view.value === "play") {
    const savedRoomId = getLastRoomId();
    if (savedRoomId) {
      socket.emit("join-room", {
        roomId: savedRoomId,
        userInfo: userInfoPayload(),
      });
      rejoinTimer = setTimeout(() => {
        if (view.value === "play" && !socket._pendingGameState) {
          view.value = "lobby";
          if (route.path === "/online-battle/play") {
            router.replace("/online-battle");
          }
        }
      }, 2500);
    } else {
      view.value = "lobby";
      if (route.path === "/online-battle/play") {
        router.replace("/online-battle");
      }
    }
  }
});

onUnmounted(() => {
  if (rejoinTimer) {
    clearTimeout(rejoinTimer);
    rejoinTimer = null;
  }
  socket.emit("leave-room");
  saveLastRoomId("");
  if (socket._lastRoomId) socket._lastRoomId = "";
  if (indexHandlers) {
    Object.entries(indexHandlers).forEach(([ev, fn]) => socket.off(ev, fn));
    indexHandlers = null;
  }
});

function onBattleBack() {
  view.value = "lobby";
  if (route.path === "/online-battle/play") {
    router.replace("/online-battle");
  }
}

function _syncView() {
  view.value = route.path.includes("/play") ? "play" : "lobby";
}
</script>
