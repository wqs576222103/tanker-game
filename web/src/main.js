import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App).use(router)

app.config.errorHandler = (err, instance, info) => {
  alert('脚本报错, 请查看控制台: ' + (err instanceof Error ? err.message : String(err)))
}

// window.onerror = function (msg, url, line, col, err) {
//   alert('脚本报错: ' + msg + (line ? ' (行' + line + ')' : ''))
//   return true
// }

window.addEventListener('unhandledrejection', (e) => {

  alert('Promise 错误: ' + (e.reason?.message || e.reason))
  console.error(e.reason)
})

app.mount('#app')
