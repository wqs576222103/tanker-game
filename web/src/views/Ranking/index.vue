<template>
  <div class="ranking-wrap">
    <div class="ranking-header">
      <div class="title">⏱️ 时间坦克击杀排名</div>
      <div class="subtitle">TIME TANK KILL RANKING</div>
    </div>

    <div class="ranking-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="rankings.length === 0" class="empty">暂无排名数据</div>
      <div v-else class="list">
        <div
          v-for="(item, index) in rankings"
          :key="item.id || index"
          class="rank-item"
          :class="getRankClass(index)"
        >
          <div class="rank-num">{{ getMedal(index) }}</div>
          <div class="rank-avatar">{{ item.avatar || item.name?.[0] || '?' }}</div>
          <div class="rank-info">
            <div class="rank-name">{{ item.name || '匿名玩家' }}</div>
            <div class="rank-stats">
              <span>击杀: {{ item.kills || 0 }}</span>
              <span>死亡: {{ item.deaths || 0 }}</span>
              <span>K/D: {{ getKD(item.kills, item.deaths) }}</span>
            </div>
          </div>
          <div class="rank-score">
            <div class="score-val">{{ item.score || item.kills || 0 }}</div>
            <div class="score-label">得分</div>
          </div>
        </div>
      </div>
    </div>

    <div class="back-btn" @click="$router.push('/tank-game')">返回游戏</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const rankings = ref([])
const loading = ref(false)
const error = ref('')

function getMedal(index) {
  if (index === 0) return '👑'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return `#${index + 1}`
}

function getRankClass(index) {
  if (index === 0) return 'rank-first'
  if (index === 1) return 'rank-second'
  if (index === 2) return 'rank-third'
  return ''
}

function getKD(kills, deaths) {
  if (!deaths) return kills?.toFixed(1) || '0.0'
  return (kills / deaths).toFixed(2)
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await fetch('/tank-game-api/score/page')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('响应不是有效的JSON')
    }
    if (data.code === 200) {
      const list = Array.isArray(data.data)
        ? data.data
        : data.data?.list || []
      rankings.value = list.map((row) => ({
        id: row.employee_id,
        name: row.employee_id || '匿名玩家',
        avatar: '',
        kills: row.high_score || 0,
        deaths: 0,
        score: row.high_score || 0,
      }))
    } else {
      throw new Error(data.message || '获取排名失败')
    }
  } catch (e) {
    console.warn('[Ranking] API failed, using mock data:', e.message)
    error.value = ''
    rankings.value = generateMockData()
  } finally {
    loading.value = false
  }
})

function generateMockData() {
  return [
    { id: 1, name: 'TankMaster', avatar: '🎖️', kills: 128, deaths: 12, score: 1280 },
    { id: 2, name: 'SteelWolf', avatar: '🐺', kills: 105, deaths: 18, score: 1050 },
    { id: 3, name: 'IronBear', avatar: '🐻', kills: 92, deaths: 25, score: 920 },
    { id: 4, name: 'Thunder', avatar: '⚡', kills: 78, deaths: 22, score: 780 },
    { id: 5, name: 'Phantom', avatar: '👻', kills: 65, deaths: 30, score: 650 },
    { id: 6, name: 'Viper', avatar: '🐍', kills: 54, deaths: 28, score: 540 },
    { id: 7, name: 'Falcon', avatar: '🦅', kills: 48, deaths: 35, score: 480 },
    { id: 8, name: 'Shadow', avatar: '🌑', kills: 42, deaths: 40, score: 420 },
    { id: 9, name: 'Raven', avatar: '🐦‍⬛', kills: 35, deaths: 38, score: 350 },
    { id: 10, name: 'Eagle', avatar: '🦅', kills: 28, deaths: 42, score: 280 },
  ]
}
</script>

<style scoped>
.ranking-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #0a0f08 0%, #1a2118 50%, #0d120a 100%);
  overflow: hidden;
}

.ranking-header {
  text-align: center;
  margin-bottom: 24px;
}

.ranking-header .title {
  font-size: 28px;
  font-weight: bold;
  color: #c8a84e;
  text-shadow: 0 0 20px rgba(200, 168, 78, 0.5);
  letter-spacing: 2px;
}

.ranking-header .subtitle {
  font-size: 12px;
  color: #5a7a4a;
  letter-spacing: 4px;
  margin-top: 4px;
}

.ranking-list {
  width: 100%;
  max-width: 500px;
  flex: 1;
  overflow-y: auto;
}

.loading, .error, .empty {
  text-align: center;
  padding: 40px;
  color: #5a7a4a;
  font-size: 14px;
}

.error {
  color: #c0392b;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(30, 45, 25, 0.8);
  border: 1px solid #2a3a2a;
  border-radius: 8px;
  transition: all 0.3s;
}

.rank-item:hover {
  background: rgba(40, 60, 30, 0.9);
  border-color: #3a5a3a;
  transform: translateX(4px);
}

.rank-first {
  background: linear-gradient(90deg, rgba(200, 168, 78, 0.2), rgba(30, 45, 25, 0.8));
  border-color: #c8a84e;
  box-shadow: 0 0 15px rgba(200, 168, 78, 0.3);
}

.rank-second {
  background: linear-gradient(90deg, rgba(192, 192, 192, 0.15), rgba(30, 45, 25, 0.8));
  border-color: #a0a0a0;
}

.rank-third {
  background: linear-gradient(90deg, rgba(205, 127, 50, 0.15), rgba(30, 45, 25, 0.8));
  border-color: #cd7f32;
}

.rank-num {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #c8a84e;
  flex-shrink: 0;
}

.rank-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: rgba(200, 168, 78, 0.1);
  border: 1px solid #3a4a3a;
  border-radius: 50%;
  flex-shrink: 0;
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-size: 16px;
  font-weight: bold;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #7a9a6a;
  margin-top: 4px;
}

.rank-stats span {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
}

.rank-score {
  text-align: right;
  flex-shrink: 0;
}

.score-val {
  font-size: 20px;
  font-weight: bold;
  color: #c8a84e;
}

.score-label {
  font-size: 10px;
  color: #5a7a4a;
  text-transform: uppercase;
}

.back-btn {
  margin-top: 20px;
  padding: 10px 32px;
  background: linear-gradient(90deg, #2a4a2a, #3a5a3a);
  border: 1px solid #4a6a4a;
  border-radius: 6px;
  color: #a0c090;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: linear-gradient(90deg, #3a5a3a, #4a6a4a);
  color: #c0e0b0;
  box-shadow: 0 0 15px rgba(74, 106, 74, 0.5);
}
</style>
