<template>
  <div class="game-intro-overlay" v-if="visible">
    <div class="game-intro-content">
      <h1>坦 克 训 练 师</h1>
      <p>
        方向键 / WASD 移动，空格 / J 射击，K 放置地雷<br />
        敌人从左上、右上角不断进攻，击杀敌人
      </p>
      <div class="items">
        🚁 无人机 &nbsp;✨ 散弹 &nbsp;⚡ 射速 &nbsp;💨 移速<br />
        🛡️ 护盾 &nbsp;💣 地雷 &nbsp;❤️ 生命恢复 &nbsp;🔄 反弹子弹
      </div>
      <p>
        ⬜ 银色砖墙：不可摧毁　🟨 黄色砖墙：可被子弹击碎<br />
        🌿 草丛：坦克可进入隐藏　🌀 蓝色传送门双向传送　🗺️ 每局障碍随机生成<br />
        可通过导入AI脚本自动运行坦克，<a
          style="color: green"
          :href="aiGuideUrl"
          download
          >下载提示词</a
        >，定制化你的AI坦克吧！
      </p>
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import aiGuideUrl from "@/assets/ai-script-guide.txt?url";

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.game-intro-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.game-intro-content {
  background: #1a1a2e;
  border: 2px solid #16213e;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  color: white;
}

.game-intro-content h1 {
  color: #4ade80;
  margin-bottom: 20px;
}

.game-intro-content p {
  margin: 15px 0;
  line-height: 1.6;
}

.game-intro-content .items {
  background: #16213e;
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
}
</style>
