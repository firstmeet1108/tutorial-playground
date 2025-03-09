import React, { useEffect, useState } from 'react'
import { ConfigProvider, theme } from 'antd'
import HomePage from './pages/HomePage'
import './styles/darkTheme.less'
import { getWebContainer } from '@/utils/webContainerUtils'

const App: React.FC = () => {
  const [isCrossOriginIsolated, setIsCrossOriginIsolated] = useState(
    window.crossOriginIsolated
  )

  // 自定义暗色主题
  const darkTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
      colorBgBase: '#1e1e1e',
      colorBgContainer: '#1e1e1e',
      colorBgElevated: '#252526',
      colorBgLayout: '#1e1e1e',
      colorBorder: '#2d2d2d',
      colorPrimary: '#0078d4',
      colorText: '#cccccc',
      colorTextSecondary: '#9d9d9d',
      borderRadius: 2
    },
    components: {
      Tree: {
        colorBgContainer: '#1e1e1e',
        colorText: '#cccccc',
        paddingXS: 4, // 减少树节点的内边距
        controlItemBgActive: '#37373d', // 选中项的背景色
        controlItemBgHover: '#2a2d2e', // 悬停项的背景色
        directoryNodeSelectedBg: '#37373d', // 选中的目录节点背景色
        directoryNodeSelectedColor: '#ffffff', // 选中的目录节点文本颜色
        nodeSelectedBg: '#37373d', // 选中节点的背景色
        nodeHoverBg: '#2a2d2e' // 悬停节点的背景色
      },
      Layout: {
        colorBgHeader: '#1e1e1e',
        colorBgBody: '#1e1e1e',
        colorBgTrigger: '#1e1e1e'
      },
      Button: {
        colorBgContainer: '#3c3c3c',
        colorBorder: '#3c3c3c'
      },
      Empty: {
        colorText: '#cccccc'
      }
    }
  }

  // 添加全局右键菜单处理
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      // 检查是否需要阻止默认右键菜单
      const shouldPreventDefault = (e.target as HTMLElement).closest(
        '.prevent-context-menu'
      )
      if (shouldPreventDefault) {
        e.preventDefault()
      }
    }

    // 添加全局右键点击事件监听
    document.addEventListener('contextmenu', handleGlobalContextMenu)

    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu)
    }
  }, [])

  // 添加全局错误处理
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('全局错误:', event.error)

      // 如果是 DOM 操作错误，尝试清理菜单
      if (
        event.error &&
        event.error.message &&
        event.error.message.includes('removeChild')
      ) {
        console.warn('检测到 DOM 操作错误，尝试清理菜单')

        // 尝试清理可能存在的菜单
        const menu = document.getElementById('dom-context-menu')
        if (menu) {
          try {
            document.body.removeChild(menu)
          } catch (e) {
            console.warn('清理菜单失败:', e)
          }
        }

        // 尝试清理可能存在的原生菜单
        const nativeMenu = document.getElementById('native-context-menu')
        if (nativeMenu) {
          try {
            document.body.removeChild(nativeMenu)
          } catch (e) {
            console.warn('清理原生菜单失败:', e)
          }
        }
      }
    }

    // 添加全局错误事件监听
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('error', handleError)
    }
  }, [])

  // 在应用启动时预初始化 WebContainer
  useEffect(() => {
    const preInit = async () => {
      try {
        const webContainer = await getWebContainer()
        const fs = webContainer?.fs
        const dir = await fs?.readdir('/')
        console.log('dir', dir)
        console.log('WebContainer 预初始化成功', webContainer)
      } catch (error) {
        console.warn('WebContainer 预初始化失败:', error)
      }
    }

    preInit()
  }, [])

  useEffect(() => {
    if (!isCrossOriginIsolated) {
      console.warn(
        '应用未在跨源隔离环境中运行。WebContainer 功能可能受限。' +
          '请确保服务器设置了以下头部：\n' +
          'Cross-Origin-Embedder-Policy: require-corp\n' +
          'Cross-Origin-Opener-Policy: same-origin'
      )
    }
  }, [isCrossOriginIsolated])

  return <ConfigProvider theme={darkTheme}>{/* <HomePage /> */}</ConfigProvider>
}

export default App
