import { ref, onUnmounted } from "vue";

export function useGameTimer() {
  const elapsed = ref(0);
  let accumulated = 0;
  let lastStart = 0;
  let checkInterval = null;

  function start() {
    accumulated = 0;
    elapsed.value = 0;
    lastStart = 0;

    checkInterval = setInterval(() => {
      const state = window.state;

      if (state === "playing") {
        if (lastStart === 0) lastStart = Date.now();
        elapsed.value = accumulated + (Date.now() - lastStart);
      } else if (state === "paused" || state === "start") {
        if (lastStart > 0) {
          accumulated += Date.now() - lastStart;
          lastStart = 0;
        }
        elapsed.value = accumulated;
      }
    }, 200);
  }

  function stop() {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    if (lastStart > 0) {
      accumulated += Date.now() - lastStart;
      lastStart = 0;
    }
    elapsed.value = accumulated;
    return elapsed.value;
  }

  function format(ms) {
    if (!ms) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  onUnmounted(() => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  });

  return { elapsed, start, stop, format };
}
