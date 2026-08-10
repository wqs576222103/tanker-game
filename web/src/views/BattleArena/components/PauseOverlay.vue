<template>
  <div class="overlay hidden" id="ov-pause">
    <h1>暂 停</h1>
    <p>按 P 或点击继续</p>
    <button id="btn-resume" @click="$emit('resume')">继 续</button>
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

.overlay h1 {
  font-size: 34px;
  letter-spacing: 6px;
  color: #ffd76e;
  text-shadow: 0 0 16px rgba(255, 215, 110, 0.5);
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
