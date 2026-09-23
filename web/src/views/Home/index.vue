<template>
  <div class="home-wrap">
    <div class="home-content">
      <div class="logo-section">
        <div class="tank-icon"></div>
        <h1 class="game-title">坦克训练师</h1>
        <p class="game-desc">选择你的战场，开始坦克对决！</p>
      </div>
      <div class="mode-list">
        <router-link
          :to="{ path: '/tank-game', query: { token } }"
          class="mode-card kill-mode"
        >
          <div class="mode-icon">💥</div>
          <div class="mode-name">基础模式</div>
          <div class="mode-desc">
            击败敌人，提升你的击杀数。训练你的AI坦克战斗技巧
          </div>
        </router-link>
        <!-- <router-link :to="{ path: '/ranking', query: { token } }" class="mode-card rank-mode">
          <div class="mode-icon">🏆</div>
          <div class="mode-name">击杀排名</div>
          <div class="mode-desc">查看你的排名，争夺榜首</div>
        </router-link> -->
        <router-link
          :to="{ path: '/battle-arena', query: { token } }"
          class="mode-card battle-mode"
        >
          <div class="mode-icon">🤖</div>
          <div class="mode-name">AI坦克对决</div>
          <div class="mode-desc">让AI之间展开激烈对决</div>
        </router-link>
        <router-link
          :to="{ path: '/levels', query: { token } }"
          class="mode-card levels-mode"
        >
          <div class="mode-icon">🎯</div>
          <div class="mode-name">关卡模式</div>
          <div class="mode-desc">挑战关卡，体验不同的战斗场景</div>
        </router-link>
        <!-- <router-link
          :to="{ path: '/online-battle', query: { token } }"
          class="mode-card online-mode"
        >
          <div class="mode-icon">⚔️</div>
          <div class="mode-name">在线对战</div>
          <div class="mode-desc">匹配对手，实时在线坦克对决</div>
        </router-link> -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const token = computed(() => route.query.token || "");
</script>

<style scoped>
.home-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  overflow: hidden;
}
.home-content {
  text-align: center;
  z-index: 1;
}
.logo-section {
  margin-bottom: 60px;
}
.tank-icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
.game-title {
  font-size: 48px;
  font-weight: 900;
  color: #fff;
  margin: 0 0 12px;
  text-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
  letter-spacing: 6px;
}
.game-desc {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  letter-spacing: 2px;
}
.mode-list {
  display: flex;
  gap: 30px;
  justify-content: center;
}
.mode-card {
  width: 240px;
  padding: 36px 24px;
  border-radius: 16px;
  text-decoration: none;
  color: #fff;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}
.mode-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}
.kill-mode {
  background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
}
.kill-mode:hover {
  box-shadow: 0 12px 40px rgba(249, 115, 22, 0.4);
}
.rank-mode {
  background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%);
}
.rank-mode:hover {
  box-shadow: 0 12px 40px rgba(245, 158, 11, 0.4);
}
.levels-mode {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}
.levels-mode:hover {
  box-shadow: 0 12px 40px rgba(16, 185, 129, 0.4);
}
.battle-mode {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.battle-mode:hover {
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
}
.online-mode {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}
.online-mode:hover {
  box-shadow: 0 12px 40px rgba(231, 76, 60, 0.4);
}
.mode-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.mode-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}
.mode-desc {
  font-size: 14px;
  opacity: 0.85;
  line-height: 1.5;
}
</style>
