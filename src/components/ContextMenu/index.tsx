import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import styles from './index.module.less'

interface ContextMenuProps {
  visible: boolean
  x: number
  y: number
  menuItems: MenuProps['items']
  onClose: () => void
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  menuItems,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  // 添加状态跟踪菜单是否已经渲染
  const [isRendered, setIsRendered] = useState(false)

  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 如果点击的不是菜单内部元素，则关闭菜单
      if (
        visible &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    // 添加全局点击事件监听
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [visible, onClose])

  // 添加全局右键点击和双击事件处理
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // 如果菜单已经显示，且点击的不是菜单内部元素，则关闭菜单
      if (
        visible &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    const handleDblClick = (e: MouseEvent) => {
      // 如果菜单已经显示，且双击的不是菜单内部元素，则关闭菜单
      if (
        visible &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    // 添加全局右键点击事件监听
    document.addEventListener('contextmenu', handleContextMenu)

    // 添加双击事件监听
    document.addEventListener('dblclick', handleDblClick)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('dblclick', handleDblClick)
    }
  }, [visible, onClose])

  // 添加调试日志
  useEffect(() => {
    if (visible) {
      console.log('显示菜单', x, y)
      console.log('菜单项:', menuItems)

      // 确保菜单项是有效的
      if (!menuItems || menuItems.length === 0) {
        console.warn('菜单项为空或无效')
      }

      // 标记菜单已渲染
      setIsRendered(true)
    } else {
      setIsRendered(false)
    }
  }, [visible, x, y, menuItems])

  // 调整菜单位置，确保不超出屏幕边界
  const adjustPosition = () => {
    if (!menuRef.current) return { x, y }

    console.log('调整菜单位置', x, y)

    const menuRect = menuRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    // 检查右边界
    if (x + menuRect.width > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 5
    }

    // 检查左边界
    if (adjustedX < 5) {
      adjustedX = 5
    }

    // 检查下边界
    if (y + menuRect.height > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 5
    }

    // 检查上边界
    if (adjustedY < 5) {
      adjustedY = 5
    }

    console.log('调整后的菜单位置', adjustedX, adjustedY)

    return { x: adjustedX, y: adjustedY }
  }

  // 添加菜单动画效果
  useEffect(() => {
    if (visible && menuRef.current) {
      // 添加显示动画
      menuRef.current.style.opacity = '0'
      menuRef.current.style.transform = 'scale(0.95)'

      // 触发重绘以应用初始样式
      menuRef.current.getBoundingClientRect()

      // 应用过渡效果
      menuRef.current.style.opacity = '1'
      menuRef.current.style.transform = 'scale(1)'
    }
  }, [visible])

  // 使用 Portal 渲染菜单
  const renderMenu = () => {
    const position = adjustPosition()

    const menuContent = (
      <div
        ref={menuRef}
        className={styles.contextMenu}
        style={{
          left: position.x,
          top: position.y,
          zIndex: 9999 // 使用非常高的 z-index
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Menu
          items={menuItems}
          className={styles.menu}
          onClick={({ domEvent }) => {
            domEvent.stopPropagation()
          }}
        />
        {/* 调试信息 */}
        {process.env.NODE_ENV === 'development' && (
          <div
            style={{
              position: 'absolute',
              bottom: '-20px',
              left: 0,
              color: 'white',
              fontSize: '10px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '2px 5px',
              borderRadius: '3px'
            }}
          >
            已渲染: {isRendered ? '是' : '否'}, 项目数: {menuItems?.length || 0}
          </div>
        )}
      </div>
    )

    // 使用 Portal 渲染到 body
    return ReactDOM.createPortal(menuContent, document.body)
  }

  // 如果不可见，不渲染任何内容
  if (!visible) return null

  // 确保菜单项是有效的
  if (!menuItems || menuItems.length === 0) {
    console.warn('菜单项为空或无效，不显示菜单')
    return null
  }

  return renderMenu()
}

export default ContextMenu
