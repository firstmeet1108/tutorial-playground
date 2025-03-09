import { WebContainer } from '@webcontainer/api'

// 存储 WebContainer 实例（全局单例）
let webcontainerInstance: WebContainer | null = null
let isWebContainerSupported = true
let isInitializing = false // 添加初始化锁，防止并发初始化
let initPromise: Promise<WebContainer | null> | null = null // 存储初始化 Promise

export const defaultFiles = {
  'package.json': {
    file: {
      contents: JSON.stringify(
        {
          name: 'code-editor-project',
          version: '1.0.0',
          description: '在线代码编辑器项目',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            dev: 'nodemon index.js'
          },
          dependencies: {},
          devDependencies: {
            nodemon: '^2.0.22'
          }
        },
        null,
        2
      )
    }
  },
  'index.js': {
    file: {
      contents: `console.log('欢迎使用在线代码编辑器！');
console.log('您可以在这里编写和运行 Node.js 代码。');
console.log('尝试修改 index.js 文件并运行 npm start 来查看效果。');`
    }
  },
  'README.md': {
    file: {
      contents: `# 在线代码编辑器项目

这是一个使用 WebContainer 技术的在线代码编辑器项目。

## 快速开始

1. 在终端中运行 \`npm install\` 安装依赖
2. 运行 \`npm start\` 启动项目
3. 或者运行 \`npm run dev\` 以开发模式启动（自动重启）

## 文件结构

- \`index.js\`: 主程序入口
- \`package.json\`: 项目配置文件
- \`README.md\`: 项目说明文档

祝您编码愉快！`
    }
  }
}

// 检查浏览器是否支持 WebContainer
export function checkWebContainerSupport() {
  // 检查是否在安全上下文中运行（HTTPS 或 localhost）
  const isSecureContext = window.isSecureContext

  // 检查是否支持 Service Worker API（WebContainer 需要）
  const hasServiceWorker = 'serviceWorker' in navigator

  return {
    isSupported: isSecureContext && hasServiceWorker,
    reasons: {
      isSecureContext,
      hasServiceWorker
    }
  }
}

// 初始化 WebContainer（确保单例模式）
export async function getWebContainer() {
  // 如果已经确定不支持，直接返回 null
  if (!isWebContainerSupported) {
    console.warn('WebContainer 不受支持，使用模拟模式')
    return null
  }

  // 如果已经初始化，返回现有实例
  if (webcontainerInstance) {
    return webcontainerInstance
  }

  // 如果正在初始化，返回初始化 Promise
  if (isInitializing && initPromise) {
    return initPromise
  }

  // 创建初始化锁和 Promise
  isInitializing = true
  initPromise = (async () => {
    try {
      // 检查浏览器支持
      const { isSupported, reasons } = checkWebContainerSupport()

      if (!isSupported) {
        console.warn('浏览器不支持 WebContainer:', reasons)
        isWebContainerSupported = false
        return null
      }

      // 检查是否有必要的头部
      const isCrossOriginIsolated = window.crossOriginIsolated
      if (!isCrossOriginIsolated) {
        console.warn('缺少必要的跨源隔离头部，WebContainer 可能无法正常工作')
        // 我们仍然尝试启动，但可能会失败
      }

      // 启动 WebContainer 并配置
      console.log('正在启动 WebContainer...')
      webcontainerInstance = await WebContainer.boot()
      webcontainerInstance.mount(defaultFiles)
      console.log('WebContainer 启动成功')
      return webcontainerInstance
    } catch (error) {
      console.error('WebContainer 启动失败:', error)
      // 标记为不支持，避免重复尝试
      isWebContainerSupported = false
      // 返回 null 而不是抛出错误，允许应用降级到模拟模式
      return null
    } finally {
      // 无论成功或失败，都释放初始化锁
      isInitializing = false
    }
  })()

  return initPromise
}

// 状态类型
export type WebContainerStatus = {
  isAvailable: boolean
  isInitialized: boolean
  startTime: Date | null
  runningTime: number
  memoryUsage: number | null
  processCount: number
  lastError: string | null
}
