<template>
  <div id="wrap">
    <div id="hud">
      <div class="l">
        <span class="bar" id="hud-heart"></span>
        <span class="bar">击杀 <b id="hud-score">0</b></span>
        <span class="bar">最高 <b id="hud-hi">0</b></span>
        <span class="bar">Boss <b id="hud-boss-score">0</b></span>
      </div>
      <div class="r">
        <span class="bar" id="hud-buff"></span>
        <span class="bar">雷 <b id="hud-mine">0</b></span>
      </div>
    </div>
    <div id="canvas-wrap">
      <canvas id="game"></canvas>
      <div class="overlay" id="ov-start">
        <h1>坦 克 训 练 师</h1>
        <p>
          方向键 / WASD 移动，空格 / J 射击，K 放置地雷<br />
          敌人从左上、右上角不断进攻，击杀敌人
        </p>
        <div class="items">
          🚁 无人机 &nbsp;✨ 散弹 &nbsp;⚡ 射速 &nbsp;💨 移速<br />
          🛡️ 护盾 &nbsp;💣 地雷 &nbsp;❤️ 生命恢复
        </div>
        <p>
          ⬜ 银色砖墙：反弹一次子弹（不可摧毁）　🟨 黄色砖墙：可被子弹击碎<br />
          🌿 草丛：坦克可进入隐藏　🌀 蓝色传送门双向传送　🗺️ 每局障碍随机生成
        </p>
        <button id="btn-start">开 始 游 戏</button>
      </div>
      <div class="overlay hidden" id="ov-over">
        <h2>游 戏 结 束</h2>
        <p id="ov-over-score"></p>
        <p id="ov-over-reason" style="font-size: 14px; opacity: 0.85"></p>
        <button id="btn-ai-log" style="display: none; margin-bottom: 10px">
          死亡日志 (0)
        </button>
        <button id="btn-restart">再 来 一 局</button>
      </div>
      <div class="overlay hidden" id="ov-ai-log">
        <h2>死亡日志</h2>
        <div id="ai-log-content"></div>
        <div style="margin-top: 10px">
          <button id="btn-export-log">导出JSON</button>
          <button id="btn-clear-log">清除日志</button>
          <button id="btn-close-log">关闭</button>
        </div>
      </div>
      <div class="overlay hidden" id="ov-pause">
        <h1>暂 停</h1>
        <p>按 P 或点击继续</p>
        <button id="btn-resume">继 续</button>
      </div>
    </div>
    <div id="controls">
      <div class="pad">
        <button class="up" data-key="up">▲</button>
        <button class="left" data-key="left">◀</button>
        <button class="right" data-key="right">▶</button>
        <button class="down" data-key="down">▼</button>
      </div>
      <div class="act">
        <button data-key="mine">💣<br />放雷</button>
        <button data-key="fire">🔥<br />射击</button>
      </div>
    </div>
    <div id="btn-group">
      <button id="btn-pause">暂停 P</button>
      <button id="btn-restart2">重新开始 R</button>
      <button id="btn-ai">🤖 AI: 关</button>
      <button id="btn-import-ai">📥 导入AI</button>
      <button id="btn-fullscreen">⛶ 全屏 F</button>
      <button id="btn-export-death-log">📋 死亡日志</button>
    </div>
    <div class="ai-status" id="ai-status">当前AI：内置AI</div>
    <input
      type="file"
      id="ai-file"
      accept=".js"
      style="display: none"
    />
  </div>
</template>
<script setup>

</script>

<style scoped>
#wrap {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
#canvas-wrap { position: relative; }
canvas {
  display: block;
  background: #1a2118;
  border: 2px solid #3a4a3a;
  border-radius: 6px;
  box-shadow: 0 0 30px rgba(0,0,0,.6);
  touch-action: none;
}
#hud {
  width: 100%;
  display: flex; justify-content: space-between; align-items: center;
  color: #cfe3cf; padding: 8px 4px; font-size: 14px;
  flex-wrap: wrap; gap: 4px;
}
#hud .l, #hud .r { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
#hud .bar { background: rgba(255,255,255,.06); padding: 4px 10px; border-radius: 12px; }
#btn-group { display: flex; gap: 8px; margin-top: 8px; }
#btn-group button {
  background: #26332b; color: #cfe3cf; border: 1px solid #4a5a4a;
  padding: 8px 22px; border-radius: 20px; font-size: 15px; cursor: pointer;
}
#btn-group button:active { background: #3a4a3a; }
#btn-group button.active { background: #4a7a4a; border-color: #6a9a6a; }
.ai-status { text-align: center; font-size: 13px; color: #9fb6a6; margin-top: 6px; }
/* 移动端控制 */
#controls { display: none; }
@media (pointer: coarse) {
  #controls { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; padding: 8px 14px; }
  .pad { display: grid; grid-template-columns: repeat(3, 52px); grid-template-rows: repeat(3, 52px); gap: 4px; }
  .pad button { width: 52px; height: 52px; font-size: 20px; border-radius: 10px;
    background: rgba(255,255,255,.1); color: #d7e6d7; border: 1px solid rgba(255,255,255,.2); cursor: pointer; }
  .pad button:active { background: rgba(255,255,255,.3); }
  .pad .up { grid-column: 2; grid-row: 1; }
  .pad .left { grid-column: 1; grid-row: 2; }
  .pad .right { grid-column: 3; grid-row: 2; }
  .pad .down { grid-column: 2; grid-row: 3; }
  .act { display: flex; gap: 10px; }
  .act button { width: 64px; height: 64px; font-size: 15px; border-radius: 50%;
    background: rgba(255,120,60,.25); color: #ffe; border: 2px solid rgba(255,150,90,.5); cursor: pointer; }
  .act button:active { background: rgba(255,120,60,.5); }
}
.overlay {
  position: absolute; inset: 0; border-radius: 6px;
  background: rgba(8,12,16,.86);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: #d7e6d7; text-align: center; padding: 20px; gap: 12px; z-index: 5;
}
.overlay h1 { font-size: 34px; letter-spacing: 6px; color: #ffd76e; text-shadow: 0 0 16px rgba(255,215,110,.5); }
.overlay h2 { font-size: 26px; color: #ff7b6e; }
.overlay p { font-size: 14px; color: #9fb6a6; line-height: 1.9; }
.overlay .items { font-size: 13px; color: #cfe3cf; line-height: 2; text-align: left; background: rgba(255,255,255,.05);
  padding: 10px 18px; border-radius: 10px; max-width: 90%; }
.overlay button {
  background: #e0a93a; color: #1c1408; border: none; padding: 12px 40px;
  font-size: 18px; font-weight: bold; border-radius: 24px; cursor: pointer; letter-spacing: 3px;
}
.overlay button:active { transform: scale(.96); }
.hidden { display: none !important; }

#btn-ai-log {
  background: #4a7a4a;
  color: #fff;
  border: 1px solid #6a9a6a;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 10px;
}
#btn-ai-log:hover { background: #5a8a5a; }

#ov-ai-log {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: rgba(8,12,16,.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #d7e6d7;
  text-align: left;
  padding: 20px;
  gap: 12px;
  z-index: 10;
  overflow-y: auto;
}
#ov-ai-log h2 {
  font-size: 22px;
  color: #ffd76e;
  margin-bottom: 10px;
}
#ai-log-content {
  width: 100%;
  max-width: 600px;
  max-height: 60vh;
  overflow-y: auto;
  background: rgba(0,0,0,.3);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
}
#ai-log-content .log-item {
  border-bottom: 1px solid rgba(255,255,255,.1);
  padding: 10px 0;
}
#ai-log-content .log-item:last-child { border-bottom: none; }
#ai-log-content .log-header {
  font-size: 14px;
  font-weight: bold;
  color: #ff7b6e;
  margin-bottom: 6px;
}
#ai-log-content .log-detail {
  color: #9fb6a6;
  margin: 2px 0;
}
#ai-log-content .log-detail span {
  color: #cfe3cf;
}
#ai-log-content .log-decisions {
  margin-top: 8px;
  padding: 8px;
  background: rgba(255,255,255,.05);
  border-radius: 6px;
  font-size: 11px;
  color: #8a9a8a;
}
#ov-ai-log button {
  background: #26332b;
  color: #cfe3cf;
  border: 1px solid #4a5a4a;
  padding: 8px 20px;
  border-radius: 16px;
  font-size: 14px;
  cursor: pointer;
}
#ov-ai-log button:hover { background: #3a4a3a; }

</style>
