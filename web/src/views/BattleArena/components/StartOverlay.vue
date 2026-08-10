<template>
  <div class="overlay" id="ov-start">
    <h1>坦 克 大 战</h1>
    <p>导入多个 AI 脚本，让它们在战场上对决！最多支持 8 个 AI 同时战斗。</p>
    <div class="items">
      🚁 无人机 &nbsp;✨ 散弹 &nbsp;⚡ 射速 &nbsp;💨 移速<br />
      🛡️ 护盾 &nbsp;💣 地雷 &nbsp;❤️ 生命恢复
    </div>
    <p>
      ⬜ 银色砖墙：反弹一次子弹（不可摧毁）　🟨 黄色砖墙：可被子弹击碎<br />
      🌿 草丛：坦克可进入隐藏　🌀 蓝色传送门双向传送
    </p>
    <button id="btn-start" @click="$emit('start')">开 始 对 决</button>
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

.overlay .items {
  font-size: 13px;
  color: #cfe3cf;
  line-height: 2;
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px 18px;
  border-radius: 10px;
  max-width: 90%;
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
