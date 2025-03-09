import { useRef, useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import styles from './index.module.less'
import {
  Layout,
  Empty,
  message,
  theme,
  Modal,
  Form,
  Input,
  Button,
  Tooltip
} from 'antd'
import type { MenuProps } from 'antd'
import FileExplorer, { FileExplorerRef } from '@/components/FileExplorer'
import FileUploader from '@/components/FileUploader'
import { useFileSystem, getLanguageMode } from '@/utils/fileSystemUtils'
import {
  ScissorOutlined,
  SnippetsOutlined,
  FolderAddOutlined,
  FileAddOutlined,
  UploadOutlined,
  SaveOutlined,
  CloseOutlined,
  CodeOutlined,
  PlusOutlined
} from '@ant-design/icons'
import ContextMenu from '@/components/ContextMenu'
import Terminal from '@/components/Terminal'
import TopBar from '@/components/TopBar'
import { initializeWebContainerFromFileSystem } from '@/utils/webContainerUtils'

const { Sider, Content } = Layout

interface FileNode {
  key: string
  title: string
  isLeaf?: boolean
  children?: FileNode[]
}

// 添加多终端支持
interface TerminalTab {
  id: string
  title: string
}

export default function HomePage() {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedFileContent, setSelectedFileContent] = useState<string>('')
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('plaintext')

  // 将终端状态移到组件内部
  const [terminals, setTerminals] = useState<TerminalTab[]>([
    { id: 'terminal-1', title: '终端 1' }
  ])
  const [activeTerminal, setActiveTerminal] = useState<string>('terminal-1')
  const [terminalHeight, setTerminalHeight] = useState(200)
  const [showTerminal, setShowTerminal] = useState(true)

  const {
    treeData,
    handleFilesUploaded,
    getFileContentByKey,
    renameFile,
    deleteFile,
    copyFile,
    clipboard,
    copyToClipboard,
    cutToClipboard,
    pasteFromClipboard,
    createNewFolder,
    createNewFile,
    saveFile,
    fileContents,
    setTreeData,
    setFileContents
  } = useFileSystem()

  const editorRef = useRef(null)
  const explorerRef = useRef<FileExplorerRef>(null)

  // 使用主题
  const { token } = theme.useToken()

  // 添加调试日志
  useEffect(() => {
    console.log('树形数据更新:', treeData)
  }, [treeData])

  // 添加调试日志，检查 explorerRef 是否初始化
  useEffect(() => {
    console.log('explorerRef 初始化状态:', explorerRef.current)
  }, [])

  // 创建一个备用的右键菜单状态
  const [backupContextMenu, setBackupContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0
  })

  // 新建文件夹对话框状态
  const [newFolderModal, setNewFolderModal] = useState({
    visible: false,
    parentKey: 'root'
  })

  // 新建文件对话框状态
  const [newFileModal, setNewFileModal] = useState({
    visible: false,
    parentKey: 'root'
  })

  // 新文件夹名称
  const [newFolderName, setNewFolderName] = useState('')

  // 新文件名称
  const [newFileName, setNewFileName] = useState('')

  // 添加原生菜单状态
  const [nativeMenu, setNativeMenu] = useState({
    visible: false,
    x: 0,
    y: 0
  })

  // 添加编辑器修改和保存功能
  const [isFileModified, setIsFileModified] = useState(false)

  // 添加新终端
  const addNewTerminal = () => {
    const newId = `terminal-${terminals.length + 1}`
    const newTerminal = {
      id: newId,
      title: `终端 ${terminals.length + 1}`
    }

    setTerminals([...terminals, newTerminal])
    setActiveTerminal(newId)
    setShowTerminal(true)
  }

  // 关闭终端
  const closeTerminal = (id: string) => {
    if (terminals.length === 1) {
      // 如果只有一个终端，则隐藏终端区域
      setShowTerminal(false)
      return
    }

    // 移除指定终端
    const newTerminals = terminals.filter((t) => t.id !== id)
    setTerminals(newTerminals)

    // 如果关闭的是当前活动终端，则激活第一个终端
    if (activeTerminal === id) {
      setActiveTerminal(newTerminals[0].id)
    }
  }

  // 切换终端显示
  const toggleTerminal = () => {
    setShowTerminal((prev) => !prev)
  }

  // 调整终端高度的处理函数
  const handleResizeTerminal = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault() // 阻止默认行为
    const startY = e.clientY
    const startHeight = terminalHeight

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault() // 阻止默认行为
      const deltaY = startY - moveEvent.clientY
      const newHeight = Math.max(100, Math.min(500, startHeight + deltaY))
      setTerminalHeight(newHeight)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default' // 恢复默认光标
      document.body.style.userSelect = '' // 恢复文本选择
    }

    // 设置拖拽时的光标样式
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none' // 防止拖拽时选中文本

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor

    // 设置编辑器主题
    monaco.editor.defineTheme('vs-dark-custom', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': token.colorBgContainer
      }
    })

    monaco.editor.setTheme('vs-dark-custom')
  }

  const handleSelectFile = (key: string) => {
    console.log('选择文件:', key)

    try {
      // 获取文件信息
      const fileInfo = getFileContentByKey(key)
      console.log('获取到文件信息:', fileInfo)

      // 设置文件内容
      setSelectedFileContent(fileInfo.content || '')

      // 设置文件名
      setSelectedFileName(fileInfo.name)

      // 设置语言模式
      setSelectedLanguage(getLanguageMode(fileInfo.name))

      // 如果编辑器已经加载，设置内容
      if (editorRef.current) {
        editorRef.current.setValue(fileInfo.content || '')
      }
    } catch (error) {
      console.error('处理文件选择时出错:', error)
      message.error('读取文件内容失败')
    }
  }

  const handleFilesUpload = async (uploadedFiles: File[]) => {
    try {
      // 创建新的状态（复制当前的）
      const newTreeData = [...treeData]
      const newContents = { ...fileContents }

      // 处理文件
      for (const file of uploadedFiles) {
        // 获取文件路径
        const filePath = file.webkitRelativePath || file.name

        // 读取文件内容
        try {
          const content = await file.text()
          newContents[filePath] = content
        } catch (error) {
          console.error(`读取文件 ${filePath} 内容失败:`, error)
        }

        // 构建树节点
        buildTreeFromPath(newTreeData, filePath, file)
      }

      // 更新状态
      setTreeData(newTreeData)
      setFileContents(newContents)

      // 初始化 WebContainer
      try {
        const success = await initializeWebContainerFromFileSystem(
          newTreeData,
          newContents
        )
        if (success) {
          console.log('WebContainer 已使用上传文件初始化')
        } else {
          console.warn('WebContainer 初始化失败')
        }
      } catch (error) {
        console.error('初始化 WebContainer 失败:', error)
      }
    } catch (error) {
      console.error('处理上传文件时出错:', error)
      message.error('处理上传文件失败，请重试')
    }
  }

  // 处理文件重命名
  const handleRenameFile = (key: string, newName: string) => {
    try {
      renameFile(key, newName)
      message.success(`已将文件重命名为 "${newName}"`)
    } catch (error) {
      console.error('重命名文件时出错:', error)
      message.error('重命名文件失败')
    }
  }

  // 处理文件删除
  const handleDeleteFile = (key: string) => {
    try {
      deleteFile(key)
      message.success('文件已删除')

      // 如果当前选中的文件被删除，清空编辑器
      if (selectedFileName && key.includes(selectedFileName)) {
        setSelectedFileContent('')
        setSelectedFileName('')
      }
    } catch (error) {
      console.error('删除文件时出错:', error)
      message.error('删除文件失败')
    }
  }

  // 处理文件复制
  const handleCopyFile = (key: string) => {
    try {
      copyFile(key)
      message.success('文件已复制')
    } catch (error) {
      console.error('复制文件时出错:', error)
      message.error('复制文件失败')
    }
  }

  // 处理复制到剪贴板
  const handleCopyToClipboard = (
    key: string,
    isLeaf: boolean,
    title: string
  ) => {
    try {
      copyToClipboard(key, isLeaf, title)
    } catch (error) {
      console.error('复制到剪贴板时出错:', error)
      message.error('复制到剪贴板失败')
    }
  }

  // 处理剪切到剪贴板
  const handleCutToClipboard = (
    key: string,
    isLeaf: boolean,
    title: string
  ) => {
    try {
      cutToClipboard(key, isLeaf, title)
    } catch (error) {
      console.error('剪切到剪贴板时出错:', error)
      message.error('剪切到剪贴板失败')
    }
  }

  // 处理从剪贴板粘贴
  const handlePasteFromClipboard = (targetKey: string) => {
    try {
      pasteFromClipboard(targetKey)
    } catch (error) {
      console.error('从剪贴板粘贴时出错:', error)
      message.error('从剪贴板粘贴失败')
    }
  }

  // 处理新建文件夹
  const handleCreateNewFolder = (parentKey: string, folderName: string) => {
    try {
      createNewFolder(parentKey, folderName)
      message.success(`已创建文件夹: ${folderName}`)
    } catch (error) {
      console.error('新建文件夹时出错:', error)
      message.error('新建文件夹失败')
    }
  }

  // 处理新建文件
  const handleCreateNewFile = (parentKey: string, fileName: string) => {
    try {
      createNewFile(parentKey, fileName)
      message.success(`已创建文件: ${fileName}`)
    } catch (error) {
      console.error('新建文件时出错:', error)
      message.error('新建文件失败')
    }
  }

  // 处理 Sider 点击事件
  const handleSiderClick = (e: React.MouseEvent) => {
    // 阻止事件冒泡，防止点击事件传递到文档
    e.stopPropagation()
  }

  // 处理 Sider 右键点击事件
  const handleSiderContextMenu = (e: React.MouseEvent) => {
    // 阻止默认右键菜单
    e.preventDefault()
    // 阻止事件冒泡
    e.stopPropagation()

    console.log('Sider 右键点击', e.clientX, e.clientY)

    // 显示右键菜单
    if (explorerRef.current) {
      explorerRef.current.showSiderContextMenu(e.clientX, e.clientY)
    } else {
      console.warn('explorerRef 未初始化，使用备用菜单')
      // 使用直接 DOM 操作创建菜单
      createDOMMenu(e.clientX, e.clientY)
    }
  }

  // 使用直接 DOM 操作创建菜单
  const createDOMMenu = (x: number, y: number) => {
    // 移除可能存在的旧菜单
    const oldMenu = document.getElementById('dom-context-menu')
    if (oldMenu && oldMenu.parentNode) {
      oldMenu.parentNode.removeChild(oldMenu)
    }

    // 创建菜单容器
    const menuDiv = document.createElement('div')
    menuDiv.id = 'dom-context-menu'
    menuDiv.style.position = 'fixed'
    menuDiv.style.left = `${x}px`
    menuDiv.style.top = `${y}px`
    menuDiv.style.backgroundColor = '#252526'
    menuDiv.style.border = '1px solid #3c3c3c'
    menuDiv.style.borderRadius = '4px'
    menuDiv.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.5)'
    menuDiv.style.zIndex = '9999'
    menuDiv.style.padding = '4px 0'
    menuDiv.style.minWidth = '160px'

    // 添加菜单项
    const createMenuItem = (
      label: string,
      icon: string,
      onClick: () => void
    ) => {
      const itemDiv = document.createElement('div')
      itemDiv.style.padding = '8px 12px'
      itemDiv.style.cursor = 'pointer'
      itemDiv.style.color = '#cccccc'
      itemDiv.style.display = 'flex'
      itemDiv.style.alignItems = 'center'
      itemDiv.style.fontSize = '14px'

      itemDiv.innerHTML = `<span style="margin-right: 8px">${icon}</span> ${label}`

      itemDiv.addEventListener('mouseover', () => {
        itemDiv.style.backgroundColor = '#2a2d2e'
      })

      itemDiv.addEventListener('mouseout', () => {
        itemDiv.style.backgroundColor = 'transparent'
      })

      itemDiv.addEventListener('click', () => {
        // 安全地移除菜单
        removeMenu()
        onClick()
      })

      return itemDiv
    }

    // 添加菜单项
    menuDiv.appendChild(
      createMenuItem('新建文件夹', '📁', () => {
        setNewFolderModal({
          visible: true,
          parentKey: 'root'
        })
      })
    )

    menuDiv.appendChild(
      createMenuItem('新建文件', '📄', () => {
        setNewFileModal({
          visible: true,
          parentKey: 'root'
        })
      })
    )

    menuDiv.appendChild(
      createMenuItem('上传文件', '📤', () => {
        const uploadInput = document.getElementById('file-uploader-input')
        if (uploadInput) {
          uploadInput.click()
        }
      })
    )

    // 如果剪贴板有内容，添加粘贴选项
    if (clipboard) {
      // 添加分隔线
      const divider = document.createElement('div')
      divider.style.height = '1px'
      divider.style.backgroundColor = '#3c3c3c'
      divider.style.margin = '4px 0'
      menuDiv.appendChild(divider)

      menuDiv.appendChild(
        createMenuItem(
          `粘贴 "${clipboard.title}"`,
          clipboard.isCut ? '✂️' : '📋',
          () => {
            handlePasteFromClipboard('root')
          }
        )
      )
    }

    // 安全地移除菜单的函数
    const removeMenu = () => {
      const menu = document.getElementById('dom-context-menu')
      if (menu && menu.parentNode) {
        menu.parentNode.removeChild(menu)
      }
    }

    // 添加点击外部关闭菜单
    const handleClickOutside = (event: MouseEvent) => {
      const menu = document.getElementById('dom-context-menu')
      if (menu && !menu.contains(event.target as Node)) {
        // 安全地移除菜单
        removeMenu()
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    // 添加到文档
    document.body.appendChild(menuDiv)
  }

  // 处理 Empty 组件右键点击
  const handleEmptyContextMenu = (e: React.MouseEvent) => {
    // 阻止默认右键菜单
    e.preventDefault()
    // 阻止事件冒泡
    e.stopPropagation()

    console.log('Empty 组件右键点击', e.clientX, e.clientY)

    // 使用直接 DOM 操作创建菜单
    createDOMMenu(e.clientX, e.clientY)
  }

  // 关闭备用菜单
  const closeBackupContextMenu = () => {
    setBackupContextMenu({
      ...backupContextMenu,
      visible: false
    })
  }

  // 获取备用菜单项
  const getBackupContextMenuItems = (): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'newFolder',
        icon: <FolderAddOutlined />,
        label: '新建文件夹',
        onClick: () => {
          closeBackupContextMenu()
          // 显示新建文件夹对话框
          setNewFolderModal({
            visible: true,
            parentKey: 'root'
          })
        }
      },
      {
        key: 'newFile',
        icon: <FileAddOutlined />,
        label: '新建文件',
        onClick: () => {
          closeBackupContextMenu()
          // 显示新建文件对话框
          setNewFileModal({
            visible: true,
            parentKey: 'root'
          })
        }
      },
      {
        key: 'uploadFiles',
        icon: <UploadOutlined />,
        label: '上传文件',
        onClick: () => {
          closeBackupContextMenu()
          // 触发文件上传器的点击事件
          const uploadInput = document.getElementById('file-uploader-input')
          if (uploadInput) {
            uploadInput.click()
          }
        }
      }
    ]

    // 如果剪贴板有内容，添加粘贴选项
    if (clipboard) {
      items.push(
        {
          type: 'divider'
        },
        {
          key: 'paste',
          icon: clipboard.isCut ? <ScissorOutlined /> : <SnippetsOutlined />,
          label: `粘贴 "${clipboard.title}"`,
          onClick: () => {
            closeBackupContextMenu()
            handlePasteFromClipboard('root')
          }
        }
      )
    }

    return items
  }

  // 添加全局事件处理，确保 Sider 区域的右键点击能够被捕获

  // 添加全局右键菜单处理
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      // 检查点击的元素是否在 Sider 容器内
      const siderContainer = document.querySelector(`.${styles.fileSider}`)
      if (siderContainer && siderContainer.contains(e.target as Node)) {
        // 阻止默认右键菜单
        e.preventDefault()

        console.log('全局右键点击 - Sider 容器内', e.clientX, e.clientY)

        // 显示右键菜单
        if (explorerRef.current) {
          explorerRef.current.showSiderContextMenu(e.clientX, e.clientY)
        } else {
          console.warn('explorerRef 未初始化，使用备用菜单')
          // 使用直接 DOM 操作创建菜单
          createDOMMenu(e.clientX, e.clientY)
        }
      }

      // 检查点击的元素是否在 Empty 容器内
      const emptyContainer = document.querySelector(`.${styles.emptyContainer}`)
      if (emptyContainer && emptyContainer.contains(e.target as Node)) {
        // 阻止默认右键菜单
        e.preventDefault()

        console.log('全局右键点击 - Empty 容器内', e.clientX, e.clientY)

        // 使用直接 DOM 操作创建菜单
        createDOMMenu(e.clientX, e.clientY)
      }
    }

    // 添加全局右键点击事件监听
    document.addEventListener('contextmenu', handleGlobalContextMenu)

    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu)

      // 确保在组件卸载时移除菜单
      const menu = document.getElementById('dom-context-menu')
      if (menu && menu.parentNode) {
        menu.parentNode.removeChild(menu)
      }
    }
  }, [])

  // 确认新建文件夹
  const confirmNewFolder = () => {
    if (!newFolderName.trim()) {
      message.error('文件夹名称不能为空')
      return
    }

    if (createNewFolder) {
      createNewFolder(newFolderModal.parentKey, newFolderName)
    }

    setNewFolderModal({
      ...newFolderModal,
      visible: false
    })
    setNewFolderName('')
  }

  // 确认新建文件
  const confirmNewFile = () => {
    if (!newFileName.trim()) {
      message.error('文件名称不能为空')
      return
    }

    if (createNewFile) {
      createNewFile(newFileModal.parentKey, newFileName)
    }

    setNewFileModal({
      ...newFileModal,
      visible: false
    })
    setNewFileName('')
  }

  // 添加安全的菜单移除函数

  // 安全地移除菜单
  const safeRemoveMenu = (menuId: string) => {
    try {
      const menu = document.getElementById(menuId)
      if (menu) {
        if (menu.parentNode) {
          menu.parentNode.removeChild(menu)
        } else {
          // 如果没有父节点，尝试从 document.body 移除
          try {
            document.body.removeChild(menu)
          } catch (e) {
            console.warn(`从 document.body 移除菜单 ${menuId} 失败:`, e)

            // 最后的尝试：从所有可能的父节点移除
            document.querySelectorAll('div').forEach((div) => {
              try {
                if (div.contains(menu)) {
                  div.removeChild(menu)
                }
              } catch (e) {
                // 忽略错误
              }
            })
          }
        }
      }
    } catch (e) {
      console.warn(`移除菜单 ${menuId} 失败:`, e)
    }
  }

  // 在组件卸载时清理所有菜单
  useEffect(() => {
    return () => {
      safeRemoveMenu('dom-context-menu')
      safeRemoveMenu('native-context-menu')
    }
  }, [])

  // 处理编辑器内容变化
  function handleEditorChange(value: string | undefined) {
    if (value !== undefined && value !== selectedFileContent) {
      setIsFileModified(true)
    }
  }

  // 保存文件内容
  const saveFileContent = () => {
    if (!selectedFileName || !editorRef.current) return

    try {
      const currentContent = editorRef.current.getValue()

      // 调用文件系统工具保存内容
      const success = saveFile(selectedFileName, currentContent)

      if (success) {
        setSelectedFileContent(currentContent)
        setIsFileModified(false)
        message.success('文件保存成功')
      } else {
        message.error('文件保存失败')
      }
    } catch (error) {
      console.error('保存文件时出错:', error)
      message.error('保存文件时出错')
    }
  }

  // 添加键盘快捷键支持

  // 添加键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存文件
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault() // 阻止浏览器默认保存行为
        if (isFileModified && selectedFileName) {
          saveFileContent()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFileModified, selectedFileName])

  // 在 HomePage 组件中添加 WebContainer 初始化
  useEffect(() => {
    // 当文件系统准备好后，初始化 WebContainer
    if (treeData.length > 0) {
      const initWebContainerWithFiles = async () => {
        try {
          // 从文件系统初始化 WebContainer
          const success = await initializeWebContainerFromFileSystem(
            treeData,
            {}
          )
          if (success) {
            console.log('WebContainer 已使用文件系统初始化')
          } else {
            console.warn('WebContainer 初始化失败，将使用默认工作空间')
          }
        } catch (error) {
          console.error('初始化 WebContainer 失败:', error)
        }
      }

      initWebContainerWithFiles()
    }
  }, [treeData])

  return (
    <>
      <Layout className={styles.layout}>
        <TopBar
          onNewTerminal={addNewTerminal}
          onNewFile={() =>
            setNewFileModal({ visible: true, parentKey: 'root' })
          }
          onNewFolder={() =>
            setNewFolderModal({ visible: true, parentKey: 'root' })
          }
          onUploadFile={() => {
            const uploadInput = document.getElementById('file-uploader-input')
            if (uploadInput) {
              uploadInput.click()
            }
          }}
        />
        <Layout className={styles.contentLayout}>
          <Sider
            width={250}
            className={`${styles.fileSider} prevent-context-menu`}
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            theme="dark"
            style={{
              backgroundColor: '#252526',
              borderRight: '1px solid #333333'
            }}
            onClick={handleSiderClick}
            onContextMenu={handleSiderContextMenu}
          >
            <FileUploader
              onFilesUploaded={handleFilesUpload}
              collapsed={collapsed}
              treeData={treeData}
              fileContents={fileContents}
              setTreeData={setTreeData}
              setFileContents={setFileContents}
            />

            {/* 始终渲染 FileExplorer，但在没有文件时隐藏它 */}
            <div style={{ display: treeData.length > 0 ? 'block' : 'none' }}>
              <FileExplorer
                ref={explorerRef}
                treeData={treeData}
                onSelectFile={handleSelectFile}
                collapsed={collapsed}
                onRenameFile={handleRenameFile}
                onDeleteFile={handleDeleteFile}
                onCopyFile={handleCopyFile}
                clipboard={clipboard}
                onCopyToClipboard={handleCopyToClipboard}
                onCutToClipboard={handleCutToClipboard}
                onPasteFromClipboard={handlePasteFromClipboard}
                onCreateNewFolder={handleCreateNewFolder}
                onCreateNewFile={handleCreateNewFile}
              />
            </div>

            {/* 当没有文件时显示 Empty 组件 */}
            {treeData.length === 0 && (
              <div
                className={styles.emptyContainer}
                style={{
                  backgroundColor: token.colorBgContainer,
                  position: 'relative'
                }}
                onContextMenu={handleEmptyContextMenu}
              >
                <div
                  className={styles.emptyWrapper}
                  onContextMenu={handleEmptyContextMenu}
                >
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={collapsed ? '' : '请上传文件或文件夹'}
                    className={styles.emptyComponent}
                  />
                  {/* 添加一个明显的提示元素 */}
                  <div className={styles.menuHint}>右键点击可显示菜单</div>
                </div>
              </div>
            )}
          </Sider>
          <Content
            style={{
              backgroundColor: '#1e1e1e',
              height: 'calc(100vh - 40px)', // 减去 TopBar 高度
              overflow: 'hidden',
              position: 'relative' // 添加相对定位
            }}
          >
            {/* 如果没有选择文件，显示空状态 */}
            {!selectedFileName && (
              <div className={styles.emptyContainer}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="请从左侧选择一个文件"
                />
                <FileUploader
                  onFilesUploaded={handleFilesUpload}
                  treeData={treeData}
                  fileContents={fileContents}
                  setTreeData={setTreeData}
                  setFileContents={setFileContents}
                />
              </div>
            )}

            {/* 如果选择了文件，显示编辑器 */}
            {selectedFileName && (
              <div className={styles.editorContainer}>
                <div className={styles.fileNameBar}>
                  <span>{selectedFileName}</span>
                  {isFileModified && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        color: '#e69138'
                      }}
                    >
                      (已修改)
                    </span>
                  )}
                  <div style={{ marginLeft: 'auto' }}>
                    <Tooltip title="保存文件 (Ctrl+S)">
                      <Button
                        type="text"
                        icon={<SaveOutlined />}
                        size="small"
                        onClick={saveFileContent}
                        disabled={!isFileModified}
                        style={{
                          color: isFileModified ? '#0078d4' : '#6c6c6c',
                          padding: '4px 8px'
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
                <div className={styles.editorWrapper}>
                  <Editor
                    height={`calc(100% - ${
                      showTerminal ? terminalHeight + 34 : 0
                    }px)`}
                    language={selectedLanguage}
                    value={selectedFileContent}
                    theme="vs-dark-custom"
                    options={{
                      minimap: { enabled: true },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      wordWrap: 'on',
                      automaticLayout: true,
                      tabSize: 2
                    }}
                    onMount={handleEditorDidMount}
                    onChange={handleEditorChange}
                  />
                </div>
              </div>
            )}

            {/* 终端区域 - 独立于编辑器 */}
            {showTerminal && (
              <div
                className={styles.terminalContainer}
                style={{ height: terminalHeight + 34 }} // 34px = 拖拽条高度 + 终端标题栏高度
              >
                <div
                  className={styles.terminalResizeHandle}
                  onMouseDown={handleResizeTerminal}
                />
                <div className={styles.terminalHeader}>
                  <div className={styles.terminalTabs}>
                    {terminals.map((terminal) => (
                      <div
                        key={terminal.id}
                        className={`${styles.terminalTab} ${
                          activeTerminal === terminal.id ? styles.activeTab : ''
                        }`}
                        onClick={() => setActiveTerminal(terminal.id)}
                      >
                        <CodeOutlined
                          style={{ fontSize: '12px', marginRight: '4px' }}
                        />
                        {terminal.title}
                        <CloseOutlined
                          className={styles.closeTabIcon}
                          onClick={(e) => {
                            e.stopPropagation()
                            closeTerminal(terminal.id)
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      type="text"
                      className={styles.addTerminalButton}
                      icon={<PlusOutlined />}
                      size="small"
                      onClick={addNewTerminal}
                    />
                  </div>
                  <Button
                    type="text"
                    size="small"
                    onClick={() => setShowTerminal(false)}
                    icon={<CloseOutlined />}
                    className={styles.terminalCloseButton}
                  />
                </div>
                {terminals.map((terminal) => (
                  <div
                    key={terminal.id}
                    style={{
                      display:
                        activeTerminal === terminal.id ? 'block' : 'none',
                      height: 'calc(100% - 34px)' // 减去拖拽条和标题栏高度
                    }}
                  >
                    <Terminal height="100%" terminalId={terminal.id} />
                  </div>
                ))}
              </div>
            )}

            {/* 显示终端按钮 */}
            {!showTerminal && (
              <Button
                type="text"
                icon={<CodeOutlined />}
                className={styles.showTerminalButton}
                onClick={toggleTerminal}
              >
                显示终端
              </Button>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* 备用右键菜单 */}
      <ContextMenu
        visible={backupContextMenu.visible}
        x={backupContextMenu.x}
        y={backupContextMenu.y}
        menuItems={getBackupContextMenuItems()}
        onClose={closeBackupContextMenu}
      />

      {/* 新建文件夹对话框 */}
      <Modal
        title="新建文件夹"
        open={newFolderModal.visible}
        onOk={confirmNewFolder}
        onCancel={() =>
          setNewFolderModal({ ...newFolderModal, visible: false })
        }
        okText="确定"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="文件夹名称">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="请输入文件夹名称"
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建文件对话框 */}
      <Modal
        title="新建文件"
        open={newFileModal.visible}
        onOk={confirmNewFile}
        onCancel={() => setNewFileModal({ ...newFileModal, visible: false })}
        okText="确定"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="文件名称">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="请输入文件名称"
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 在 JSX 中添加原生菜单 */}
      {nativeMenu.visible && (
        <div
          id="native-context-menu"
          style={{
            position: 'fixed',
            left: nativeMenu.x,
            top: nativeMenu.y,
            backgroundColor: '#252526',
            border: '1px solid #3c3c3c',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            padding: '4px 0',
            minWidth: '160px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#cccccc',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px'
            }}
            onClick={() => {
              setNativeMenu({ ...nativeMenu, visible: false })
              setNewFolderModal({
                visible: true,
                parentKey: 'root'
              })
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2d2e'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <FolderAddOutlined style={{ marginRight: '8px' }} /> 新建文件夹
          </div>
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#cccccc',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px'
            }}
            onClick={() => {
              setNativeMenu({ ...nativeMenu, visible: false })
              setNewFileModal({
                visible: true,
                parentKey: 'root'
              })
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2d2e'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <FileAddOutlined style={{ marginRight: '8px' }} /> 新建文件
          </div>
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#cccccc',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px'
            }}
            onClick={() => {
              setNativeMenu({ ...nativeMenu, visible: false })
              const uploadInput = document.getElementById('file-uploader-input')
              if (uploadInput) {
                uploadInput.click()
              }
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2d2e'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <UploadOutlined style={{ marginRight: '8px' }} /> 上传文件
          </div>
        </div>
      )}
    </>
  )
}
