<template>
  <div id="hud">
    <div class="l">
      <span class="bar">存活 <b id="hud-alive">0</b>/8</span>
      <span class="bar">击杀 <b id="hud-score">0</b></span>
      <span class="bar">时间 <b id="hud-time">0:00</b></span>
    </div>
    <div class="r">
      <span class="bar" id="hud-buffs"></span>
    </div>
  </div>
</template>

<style scoped>
#hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #cfe3cf;
  padding: 8px 12px;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 6px 6px 0 0;
  z-index: 10;
  flex-wrap: wrap;
  gap: 4px;
}

#hud .l,
#hud .r {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

#hud .bar {
  background: rgba(255, 255, 255, 0.06);
  padding: 4px 10px;
  border-radius: 12px;
}
</style>
