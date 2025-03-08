// 注册 Service Worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('Service Worker 注册成功:', registration.scope)
        },
        (error) => {
          console.log('Service Worker 注册失败:', error)
        }
      )
    })
  }
}
