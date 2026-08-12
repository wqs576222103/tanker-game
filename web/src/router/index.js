import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/tank-game',
  },
  {
    path: '/tank-game',
    name: 'TankGame',
    component: () => import('../views/TankGame/index.vue'),
  },
  {
    path: '/tank-game-mobile',
    name: 'TankGameMobile',
    component: () => import('../views/TankGame/mobile.vue'),
  },
  {
    path: '/battle-arena',
    name: 'BattleArena',
    component: () => import('../views/BattleArena/index.vue'),
  },
  {
    path: '/ranking',
    name: 'Ranking',
    component: () => import('../views/Ranking/index.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
