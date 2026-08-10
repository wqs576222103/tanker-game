<template>
  <div class="overlay hidden" id="ov-over">
    <h2>决 斗 结 束</h2>
    <p id="ov-over-winner"></p>
    <p id="ov-over-stats"></p>
    <button id="btn-restart" @click="$emit('restart')">再 来 一 局</button>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: rgba(8, 12, 16, 0.86);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #d7e6d7;
  text-align: center;
  padding: 20px;
  gap: 12px;
  z-index: 5;
}

.overlay h2 {
  font-size: 26px;
  color: #ff7b6e;
}

.overlay p {
  font-size: 14px;
  color: #9fb6a6;
  line-height: 1.9;
}

.overlay button {
  background: #e0a93a;
  color: #1c1408;
  border: none;
  padding: 12px 40px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 24px;
  cursor: pointer;
  letter-spacing: 3px;
}

.overlay button:active {
  transform: scale(0.96);
}

.hidden {
  display: none !important;
}
</style>
