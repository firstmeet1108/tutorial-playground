// 拦截所有请求并添加必要的头部
self.addEventListener('fetch', (event) => {
  const responsePromise = fetch(event.request).then((response) => {
    // 创建一个新的 Response 对象，添加所需的头部
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    })
  })

  event.respondWith(responsePromise)
})
