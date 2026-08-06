import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'TankGame',
    component: () => import('../views/TankGame/index.vue'),
  },
  {
    path: '/tank-game',
    name: 'TankGame',
    component: () => import('../views/TankGame/index.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
