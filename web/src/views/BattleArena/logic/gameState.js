import { ref } from "vue";
import playerSvg from "@/assets/player.svg";

export const AI_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#ffeaa7",
  "#dfe6e9",
  "#a29bfe",
  "#fd79a8",
];

export const aiTanks = ref([]);

export const gameState = ref("start");

window.gameLoopId = null;
window.battleLastTime = 0;
window.battleOvPause = null;

export const battleTankImg = new Image();
battleTankImg.src = playerSvg;
