<template>
  <Lobby v-if="view === 'lobby'" />
  <BattleView v-else-if="view === 'play'" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { getSocket } from "@/utils/socket";
import Lobby from "./components/Lobby.vue";
import BattleView from "./components/BattleView.vue";

const route = useRoute();
const view = ref("lobby");
const socket = getSocket();
let indexHandlers = null;

onMounted(() => {
  _syncView();
  indexHandlers = {
    "game-start": (data) => {
      socket._pendingGameState = data;
      view.value = "play";
    },
    matched: () => {
      socket._lastRoomId = "";
    },
    "room-created": (data) => {
      socket._lastRoomId = data.roomId;
    },
    "room-joined": (data) => {
      socket._lastRoomId = data.roomId;
    },
  };
  Object.entries(indexHandlers).forEach(([ev, fn]) => socket.on(ev, fn));
});

onUnmounted(() => {
  if (indexHandlers) {
    Object.entries(indexHandlers).forEach(([ev, fn]) => socket.off(ev, fn));
    indexHandlers = null;
  }
});

function _syncView() {
  view.value = route.path.includes("/play") ? "play" : "lobby";
}
</script>
