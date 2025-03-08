import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef
} from 'react'
import { Tree, theme, Modal, Input, message, Form } from 'antd'
import type { TreeDataNode } from 'antd'
import {
  FileOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  FolderAddOutlined,
  FileAddOutlined,
  PlusOutlined,
  UploadOutlined
} from '@ant-design/icons'
import styles from './index.module.less'
import ContextMenu from '../ContextMenu'
import type { MenuProps } from 'antd'

interface FileExplorerProps {
  treeData: TreeDataNode[]
  onSelectFile: (key: string) => void
  collapsed?: boolean
  onRenameFile?: (key: string, newName: string) => void
  onDeleteFile?: (key: string) => void
  onCopyFile?: (key: string) => void
  clipboard?: {
    nodeKey: string
    isLeaf: boolean
    title: string
    isCut: boolean
  } | null
  onCopyToClipboard?: (key: string, isLeaf: boolean, title: string) => void
  onCutToClipboard?: (key: string, isLeaf: boolean, title: string) => void
  onPasteFromClipboard?: (targetKey: string) => void
  onCreateNewFolder?: (parentKey: string, folderName: string) => void
  onCreateNewFile?: (parentKey: string, fileName: string) => void
}

// 添加 ref 类型
export interface FileExplorerRef {
  showSiderContextMenu: (x: number, y: number) => void
}

const FileExplorer = forwardRef<FileExplorerRef, FileExplorerProps>(
  (
    {
      treeData,
      onSelectFile,
      collapsed = false,
      onRenameFile,
      onDeleteFile,
      onCopyFile,
      clipboard,
      onCopyToClipboard,
      onCutToClipboard,
      onPasteFromClipboard,
      onCreateNewFolder,
      onCreateNewFile
    },
    ref
  ) => {
    // 使用主题
    const { token } = theme.useToken()

    // 文件浏览器容器引用
    const explorerRef = useRef<HTMLDivElement>(null)

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{
      visible: boolean
      x: number
      y: number
      nodeKey: string
      isLeaf: boolean
      title: string
    }>({
      visible: false,
      x: 0,
      y: 0,
      nodeKey: '',
      isLeaf: false,
      title: ''
    })

    // 空白区域右键菜单状态
    const [blankContextMenu, setBlankContextMenu] = useState<{
      visible: boolean
      x: number
      y: number
    }>({
      visible: false,
      x: 0,
      y: 0
    })

    // 重命名对话框状态
    const [renameModal, setRenameModal] = useState<{
      visible: boolean
      nodeKey: string
      title: string
    }>({
      visible: false,
      nodeKey: '',
      title: ''
    })

    // 新名称状态
    const [newName, setNewName] = useState('')

    // 删除确认对话框状态
    const [deleteModal, setDeleteModal] = useState<{
      visible: boolean
      nodeKey: string
      title: string
    }>({
      visible: false,
      nodeKey: '',
      title: ''
    })

    // 新建文件夹对话框状态
    const [newFolderModal, setNewFolderModal] = useState<{
      visible: boolean
      parentKey: string
    }>({
      visible: false,
      parentKey: 'root'
    })

    // 新建文件对话框状态
    const [newFileModal, setNewFileModal] = useState<{
      visible: boolean
      parentKey: string
    }>({
      visible: false,
      parentKey: 'root'
    })

    // 新文件夹名称
    const [newFolderName, setNewFolderName] = useState('')

    // 新文件名称
    const [newFileName, setNewFileName] = useState('')

    // Sider 右键菜单状态
    const [siderContextMenu, setSiderContextMenu] = useState<{
      visible: boolean
      x: number
      y: number
    }>({
      visible: false,
      x: 0,
      y: 0
    })

    // 添加键盘事件处理
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // 检查是否有选中的节点
        const selectedElement = document.querySelector(
          '.ant-tree-node-selected'
        )
        if (!selectedElement) return

        // 获取选中节点的 key
        const key = selectedElement.getAttribute('data-key')
        if (!key) return

        // 查找节点
        const node = findNodeByKey(treeData, key)
        if (!node) return

        // Ctrl+C: 复制
        if (e.ctrlKey && e.key === 'c') {
          e.preventDefault()
          if (onCopyToClipboard) {
            onCopyToClipboard(key, !!node.isLeaf, node.title as string)
          }
        }

        // Ctrl+X: 剪切
        else if (e.ctrlKey && e.key === 'x') {
          e.preventDefault()
          if (onCutToClipboard) {
            onCutToClipboard(key, !!node.isLeaf, node.title as string)
          }
        }

        // Ctrl+V: 粘贴
        else if (e.ctrlKey && e.key === 'v') {
          e.preventDefault()
          // 只能粘贴到文件夹
          if (!node.isLeaf && clipboard && onPasteFromClipboard) {
            onPasteFromClipboard(key)
          }
        }

        // Delete: 删除
        else if (e.key === 'Delete') {
          e.preventDefault()
          if (onDeleteFile) {
            // 显示删除确认对话框
            setDeleteModal({
              visible: true,
              nodeKey: key,
              title: node.title as string
            })
          }
        }

        // F2: 重命名
        else if (e.key === 'F2') {
          e.preventDefault()
          if (onRenameFile) {
            // 显示重命名对话框
            setRenameModal({
              visible: true,
              nodeKey: key,
              title: node.title as string
            })
            setNewName(node.title as string)
          }
        }
      }

      // 添加键盘事件监听
      document.addEventListener('keydown', handleKeyDown)

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [
      treeData,
      clipboard,
      onCopyToClipboard,
      onCutToClipboard,
      onPasteFromClipboard,
      onDeleteFile,
      onRenameFile
    ])

    // 添加空白区域右键菜单
    useEffect(() => {
      const handleContextMenu = (e: MouseEvent) => {
        // 检查点击是否在文件浏览器内
        if (
          explorerRef.current &&
          explorerRef.current.contains(e.target as Node)
        ) {
          // 检查点击是否在树节点上
          const isOnTreeNode = (e.target as Element).closest(
            '.ant-tree-node-content-wrapper'
          )

          // 如果不是在树节点上，则显示空白区域右键菜单
          if (!isOnTreeNode) {
            e.preventDefault()
            setBlankContextMenu({
              visible: true,
              x: e.clientX,
              y: e.clientY
            })

            // 关闭节点右键菜单
            setContextMenu({
              ...contextMenu,
              visible: false
            })
          }
        }
      }

      // 添加右键菜单事件监听
      explorerRef.current?.addEventListener('contextmenu', handleContextMenu)

      return () => {
        explorerRef.current?.removeEventListener(
          'contextmenu',
          handleContextMenu
        )
      }
    }, [contextMenu])

    const handleSelect = (selectedKeys: React.Key[], info: any) => {
      if (selectedKeys.length > 0) {
        // 如果是叶子节点（文件），则调用文件选择回调
        if (info.node.isLeaf) {
          onSelectFile(selectedKeys[0] as string)
        }
        // 如果是非叶子节点（目录），则展开/收缩目录
        else {
          // 展开/收缩逻辑由 Tree 组件自动处理
        }
      }
    }

    // 自定义图标
    const customIcon = (props: any) => {
      if (props.isLeaf) {
        return <FileOutlined className={styles.fileIcon} />
      }
      return props.expanded ? (
        <FolderOpenOutlined className={styles.folderOpenIcon} />
      ) : (
        <FolderOutlined className={styles.folderIcon} />
      )
    }

    // 处理双击事件
    const handleDoubleClick = (
      nodeKey: string,
      isLeaf: boolean,
      title: string
    ) => {
      // 如果是文件，则打开文件
      if (isLeaf) {
        onSelectFile(nodeKey)
      } else {
        // 如果是文件夹，显示右键菜单
        // 计算菜单位置（居中显示）
        const explorerRect = explorerRef.current?.getBoundingClientRect()
        if (explorerRect) {
          setContextMenu({
            visible: true,
            x: explorerRect.left + explorerRect.width / 2,
            y: explorerRect.top + 100, // 在顶部附近显示
            nodeKey,
            isLeaf,
            title
          })
        }
      }
    }

    // 处理空白区域点击
    useEffect(() => {
      const handleExplorerClick = (e: MouseEvent) => {
        // 如果点击的是文件浏览器的空白区域
        if (
          (explorerRef.current && e.target === explorerRef.current) ||
          (e.target as HTMLElement).classList.contains(styles.fileTree)
        ) {
          // 显示空白区域右键菜单
          setBlankContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY
          })
        }
      }

      // 添加双击事件监听
      const explorerEl = explorerRef.current
      if (explorerEl) {
        explorerEl.addEventListener('dblclick', handleExplorerClick as any)
      }

      return () => {
        if (explorerEl) {
          explorerEl.removeEventListener('dblclick', handleExplorerClick as any)
        }
      }
    }, [explorerRef.current])

    // 处理空白区域右键点击
    const handleExplorerContextMenu = (e: React.MouseEvent) => {
      // 如果点击的是文件浏览器的空白区域
      if (
        e.target === explorerRef.current ||
        (e.target as HTMLElement).classList.contains(styles.fileTree)
      ) {
        e.preventDefault()
        e.stopPropagation()

        // 显示空白区域右键菜单
        setBlankContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY
        })
      }
    }

    // 自定义标题渲染
    const titleRender = (nodeData: any) => {
      // 检查节点是否在剪贴板中且是剪切状态
      const isCut =
        clipboard && clipboard.isCut && clipboard.nodeKey === nodeData.key

      return (
        <span
          className={`${styles.titleContainer} ${isCut ? styles.cut : ''}`}
          onContextMenu={(e) => {
            // 阻止默认右键菜单
            e.preventDefault()
            // 阻止事件冒泡，防止触发 Tree 组件的 onRightClick
            e.stopPropagation()

            // 设置右键菜单状态
            setContextMenu({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              nodeKey: nodeData.key,
              isLeaf: nodeData.isLeaf,
              title: nodeData.title
            })
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            handleDoubleClick(nodeData.key, nodeData.isLeaf, nodeData.title)
          }}
        >
          {nodeData.title}
        </span>
      )
    }

    // 处理右键点击
    const handleRightClick = (info: any) => {
      // 阻止默认右键菜单
      info.event.preventDefault()

      // 阻止事件冒泡
      info.event.stopPropagation()

      // 设置右键菜单状态
      setContextMenu({
        visible: true,
        x: info.event.clientX,
        y: info.event.clientY,
        nodeKey: info.node.key,
        isLeaf: info.node.isLeaf,
        title: info.node.title
      })

      // 关闭空白区域右键菜单
      setBlankContextMenu({
        ...blankContextMenu,
        visible: false
      })
    }

    // 关闭右键菜单
    const closeContextMenu = () => {
      setContextMenu({
        ...contextMenu,
        visible: false
      })
    }

    // 关闭空白区域右键菜单
    const closeBlankContextMenu = () => {
      setBlankContextMenu({
        ...blankContextMenu,
        visible: false
      })
    }

    // 处理重命名
    const handleRename = () => {
      // 关闭右键菜单
      closeContextMenu()

      // 设置重命名对话框状态
      setRenameModal({
        visible: true,
        nodeKey: contextMenu.nodeKey,
        title: contextMenu.title
      })

      // 设置初始名称
      setNewName(contextMenu.title)
    }

    // 确认重命名
    const confirmRename = () => {
      if (!newName.trim()) {
        message.error('名称不能为空')
        return
      }

      // 调用重命名回调
      if (onRenameFile) {
        onRenameFile(renameModal.nodeKey, newName)
      }

      // 关闭对话框
      setRenameModal({
        ...renameModal,
        visible: false
      })
    }

    // 处理删除
    const handleDelete = () => {
      // 关闭右键菜单
      closeContextMenu()

      // 设置删除确认对话框状态
      setDeleteModal({
        visible: true,
        nodeKey: contextMenu.nodeKey,
        title: contextMenu.title
      })
    }

    // 确认删除
    const confirmDelete = () => {
      // 调用删除回调
      if (onDeleteFile) {
        onDeleteFile(deleteModal.nodeKey)
      }

      // 关闭对话框
      setDeleteModal({
        ...deleteModal,
        visible: false
      })
    }

    // 处理复制
    const handleCopy = () => {
      // 关闭右键菜单
      closeContextMenu()

      // 调用复制回调
      if (onCopyFile) {
        onCopyFile(contextMenu.nodeKey)
      }
    }

    // 处理复制到剪贴板
    const handleCopyToClipboard = () => {
      // 关闭右键菜单
      closeContextMenu()

      // 调用复制到剪贴板回调
      if (onCopyToClipboard) {
        onCopyToClipboard(
          contextMenu.nodeKey,
          contextMenu.isLeaf,
          contextMenu.title
        )
      }
    }

    // 处理剪切到剪贴板
    const handleCutToClipboard = () => {
      // 关闭右键菜单
      closeContextMenu()

      // 调用剪切到剪贴板回调
      if (onCutToClipboard) {
        onCutToClipboard(
          contextMenu.nodeKey,
          contextMenu.isLeaf,
          contextMenu.title
        )
      }
    }

    // 处理从剪贴板粘贴
    const handlePasteFromClipboard = () => {
      // 关闭右键菜单
      closeContextMenu()

      // 调用从剪贴板粘贴回调
      if (onPasteFromClipboard) {
        onPasteFromClipboard(contextMenu.nodeKey)
      }
    }

    // 处理新建文件夹
    const handleNewFolder = (parentKey: string) => {
      // 关闭右键菜单
      closeContextMenu()
      closeBlankContextMenu()

      // 设置新建文件夹对话框状态
      setNewFolderModal({
        visible: true,
        parentKey
      })

      // 清空新文件夹名称
      setNewFolderName('')
    }

    // 处理新建文件
    const handleNewFile = (parentKey: string) => {
      // 关闭右键菜单
      closeContextMenu()
      closeBlankContextMenu()

      // 设置新建文件对话框状态
      setNewFileModal({
        visible: true,
        parentKey
      })

      // 清空新文件名称
      setNewFileName('')
    }

    // 确认新建文件夹
    const confirmNewFolder = () => {
      if (!newFolderName.trim()) {
        message.error('文件夹名称不能为空')
        return
      }

      // 调用新建文件夹回调
      if (onCreateNewFolder) {
        onCreateNewFolder(newFolderModal.parentKey, newFolderName)
      }

      // 关闭对话框
      setNewFolderModal({
        ...newFolderModal,
        visible: false
      })
    }

    // 确认新建文件
    const confirmNewFile = () => {
      if (!newFileName.trim()) {
        message.error('文件名称不能为空')
        return
      }

      // 调用新建文件回调
      if (onCreateNewFile) {
        onCreateNewFile(newFileModal.parentKey, newFileName)
      }

      // 关闭对话框
      setNewFileModal({
        ...newFileModal,
        visible: false
      })
    }

    // 获取右键菜单项
    const getContextMenuItems = (): MenuProps['items'] => {
      const items: MenuProps['items'] = [
        {
          key: 'rename',
          icon: <EditOutlined />,
          label: '重命名',
          onClick: handleRename
        },
        {
          key: 'copy',
          icon: <CopyOutlined />,
          label: '复制',
          onClick: handleCopy
        },
        {
          key: 'copyToClipboard',
          icon: <SnippetsOutlined />,
          label: '复制到剪贴板',
          onClick: handleCopyToClipboard
        },
        {
          key: 'cutToClipboard',
          icon: <ScissorOutlined />,
          label: '剪切',
          onClick: handleCutToClipboard
        }
      ]

      // 如果剪贴板有内容，添加粘贴选项
      if (clipboard) {
        items.push({
          key: 'paste',
          icon: clipboard.isCut ? <ScissorOutlined /> : <SnippetsOutlined />,
          label: `粘贴 "${clipboard.title}"`,
          onClick: handlePasteFromClipboard
        })
      }

      items.push(
        {
          type: 'divider'
        },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: '删除',
          danger: true,
          onClick: handleDelete
        }
      )

      // 如果是文件夹，添加新建文件/文件夹选项
      if (!contextMenu.isLeaf) {
        items.splice(
          items.length - 2,
          0,
          {
            key: 'export',
            icon: <ExportOutlined />,
            label: '导出',
            onClick: () => console.log('导出', contextMenu.nodeKey)
          },
          {
            key: 'import',
            icon: <ImportOutlined />,
            label: '导入',
            onClick: () => console.log('导入', contextMenu.nodeKey)
          },
          {
            type: 'divider'
          },
          {
            key: 'newFolder',
            icon: <FolderAddOutlined />,
            label: '新建文件夹',
            onClick: () => handleNewFolder(contextMenu.nodeKey)
          },
          {
            key: 'newFile',
            icon: <FileAddOutlined />,
            label: '新建文件',
            onClick: () => handleNewFile(contextMenu.nodeKey)
          }
        )
      }

      return items
    }

    // 获取空白区域右键菜单项
    const getBlankContextMenuItems = (): MenuProps['items'] => {
      const items: MenuProps['items'] = [
        {
          key: 'newFolder',
          icon: <FolderAddOutlined />,
          label: '新建文件夹',
          onClick: () => handleNewFolder('root')
        },
        {
          key: 'newFile',
          icon: <FileAddOutlined />,
          label: '新建文件',
          onClick: () => handleNewFile('root')
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
            onClick: () => handlePasteFromClipboard('root')
          }
        )
      }

      return items
    }

    // 查找节点
    const findNodeByKey = (
      nodes: TreeDataNode[],
      key: string
    ): TreeDataNode | null => {
      for (const node of nodes) {
        if (node.key === key) {
          return node
        }
        if (node.children) {
          const found = findNodeByKey(node.children, key)
          if (found) {
            return found
          }
        }
      }
      return null
    }

    // 处理 Sider 右键点击
    const handleSiderContextMenu = (e: React.MouseEvent) => {
      // 阻止默认右键菜单
      e.preventDefault()
      // 阻止事件冒泡
      e.stopPropagation()

      console.log('Sider 右键点击', e.clientX, e.clientY)

      // 显示 Sider 右键菜单
      setSiderContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY
      })
    }

    // 关闭 Sider 右键菜单
    const closeSiderContextMenu = () => {
      setSiderContextMenu({
        ...siderContextMenu,
        visible: false
      })
    }

    // 处理 Sider 右键菜单项
    const getSiderContextMenuItems = (): MenuProps['items'] => {
      const items: MenuProps['items'] = [
        {
          key: 'newFolder',
          icon: <FolderAddOutlined />,
          label: '新建文件夹',
          onClick: () => {
            closeSiderContextMenu()
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
            closeSiderContextMenu()
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
            closeSiderContextMenu()
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
              closeSiderContextMenu()
              if (onPasteFromClipboard) {
                onPasteFromClipboard('root')
              }
            }
          }
        )
      }

      return items
    }

    // 确保即使没有数据也能正确初始化
    useEffect(() => {
      console.log('FileExplorer 组件已初始化')
    }, [])

    // 暴露公共方法
    useImperativeHandle(
      ref,
      () => ({
        showSiderContextMenu: (x: number, y: number) => {
          console.log('显示 Sider 右键菜单', x, y)

          // 关闭其他可能打开的菜单
          closeContextMenu()
          closeBlankContextMenu()

          // 显示 Sider 右键菜单
          setSiderContextMenu({
            visible: true,
            x,
            y
          })
        }
      }),
      []
    ) // 空依赖数组，确保只创建一次

    return (
      <div
        ref={explorerRef}
        className={`${styles.fileExplorer} ${
          collapsed ? styles.collapsed : ''
        }`}
        style={{ backgroundColor: token.colorBgContainer }}
        onContextMenu={handleSiderContextMenu}
        onClick={(e) => e.stopPropagation()} // 阻止点击事件冒泡
      >
        <div
          className={styles.fileTree}
          style={{ backgroundColor: token.colorBgContainer }}
        >
          <Tree
            showLine={false}
            showIcon={true}
            defaultExpandAll={false}
            onSelect={handleSelect}
            treeData={treeData}
            className={styles.directoryTree}
            icon={customIcon}
            titleRender={titleRender}
            blockNode={true}
            expandAction="click" // 点击节点时展开/收缩
            switcherIcon={() => null} // 不显示展开/收缩图标
            onRightClick={handleRightClick} // 添加右键点击处理
          />

          {/* 节点右键菜单 */}
          <ContextMenu
            visible={contextMenu.visible}
            x={contextMenu.x}
            y={contextMenu.y}
            menuItems={getContextMenuItems()}
            onClose={closeContextMenu}
          />

          {/* 空白区域右键菜单 */}
          <ContextMenu
            visible={blankContextMenu.visible}
            x={blankContextMenu.x}
            y={blankContextMenu.y}
            menuItems={getBlankContextMenuItems()}
            onClose={closeBlankContextMenu}
          />

          {/* 重命名对话框 */}
          <Modal
            title="重命名"
            open={renameModal.visible}
            onOk={confirmRename}
            onCancel={() => setRenameModal({ ...renameModal, visible: false })}
            okText="确定"
            cancelText="取消"
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="请输入新名称"
              autoFocus
            />
          </Modal>

          {/* 删除确认对话框 */}
          <Modal
            title="确认删除"
            open={deleteModal.visible}
            onOk={confirmDelete}
            onCancel={() => setDeleteModal({ ...deleteModal, visible: false })}
            okText="确定"
            cancelText="取消"
          >
            <p>确定要删除 "{deleteModal.title}" 吗？此操作不可恢复。</p>
          </Modal>

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
            onCancel={() =>
              setNewFileModal({ ...newFileModal, visible: false })
            }
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

          {/* Sider 右键菜单 */}
          <ContextMenu
            visible={siderContextMenu.visible}
            x={siderContextMenu.x}
            y={siderContextMenu.y}
            menuItems={getSiderContextMenuItems()}
            onClose={closeSiderContextMenu}
          />
        </div>
      </div>
    )
  }
)

export default FileExplorer
