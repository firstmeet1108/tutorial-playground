import { useState, useEffect } from 'react'
import type { TreeDataNode } from 'antd'
import { message } from 'antd'
import { mountFilesToWebContainer } from './webContainerUtils'
import { initializeWebContainerFromFileSystem } from './webContainerUtils'

// 文件类型枚举
export enum FileType {
  MARKDOWN = 'markdown',
  TEXT = 'text',
  IMAGE = 'image',
  PDF = 'pdf',
  CODE = 'code',
  UNKNOWN = 'unknown'
}

// 文件信息接口
export interface FileInfo {
  name: string
  path: string
  type: FileType
  content?: string
  size?: number
  lastModified?: Date
}

// 根据文件扩展名获取文件类型
export function getFileType(fileName: string): FileType {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  switch (extension) {
    case 'md':
    case 'markdown':
      return FileType.MARKDOWN
    case 'txt':
      return FileType.TEXT
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      return FileType.IMAGE
    case 'pdf':
      return FileType.PDF
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'less':
    case 'json':
      return FileType.CODE
    default:
      return FileType.UNKNOWN
  }
}

// 获取文件的语言模式（用于编辑器语法高亮）
export function getLanguageMode(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  switch (extension) {
    case 'js':
      return 'javascript'
    case 'jsx':
      return 'javascript'
    case 'ts':
      return 'typescript'
    case 'tsx':
      return 'typescript'
    case 'html':
      return 'html'
    case 'css':
      return 'css'
    case 'less':
      return 'less'
    case 'json':
      return 'json'
    case 'md':
    case 'markdown':
      return 'markdown'
    default:
      return 'plaintext'
  }
}

// 将文件数组转换为树形结构
export function filesToTreeData(files: File[]): TreeDataNode[] {
  console.log(
    '开始转换文件为树形结构:',
    files.map((f) => `${f.name} (${f.size} bytes)`)
  )

  // 创建根节点
  const root: Record<string, any> = {}

  // 处理每个文件
  files.forEach((file) => {
    // 获取文件路径
    const path = file.webkitRelativePath || file.name
    console.log('处理文件路径:', path)

    // 如果是通过文件选择器上传的单个文件（没有相对路径）
    if (!file.webkitRelativePath) {
      // 直接添加到根节点
      const key = file.name
      root[key] = {
        isFile: true,
        file
      }
      return
    }

    // 处理文件夹上传的情况
    const parts = path.split('/')

    // 从根节点开始，逐级创建目录结构
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]

      // 如果是最后一部分，表示文件
      if (i === parts.length - 1) {
        current[part] = {
          isFile: true,
          file
        }
      } else {
        // 如果是目录
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }
    }
  })

  // 检查根节点是否为空
  if (Object.keys(root).length === 0) {
    console.warn('生成的目录结构为空')
    return []
  }

  console.log(
    '构建的目录结构对象:',
    JSON.stringify(
      root,
      (key, value) => {
        if (key === 'file') return '[File Object]'
        return value
      },
      2
    )
  )

  // 将对象结构转换为树形结构
  function buildTreeNodes(
    obj: Record<string, any>,
    parentPath: string = ''
  ): TreeDataNode[] {
    return Object.entries(obj)
      .map(([key, value]) => {
        const currentPath = parentPath ? `${parentPath}/${key}` : key
        const nodeKey = currentPath.replace(/\//g, '-')
        console.log('构建节点:', {
          key,
          nodeKey,
          isFile: !!(value as any).isFile
        })

        if ((value as any).isFile) {
          // 如果是文件
          const file = (value as any).file as File
          return {
            title: key,
            key: nodeKey,
            isLeaf: true,
            data: file
          }
        } else {
          // 如果是目录
          const children = buildTreeNodes(
            value as Record<string, any>,
            currentPath
          )
          return {
            title: key,
            key: nodeKey,
            children,
            selectable: false
          }
        }
      })
      .sort((a, b) => {
        // 目录在前，文件在后
        const aIsLeaf = a.isLeaf || false
        const bIsLeaf = b.isLeaf || false

        if (aIsLeaf !== bIsLeaf) {
          return aIsLeaf ? 1 : -1
        }

        // 同类型按名称排序
        return (a.title as string).localeCompare(b.title as string)
      })
  }

  const result = buildTreeNodes(root)
  console.log('最终生成的树形结构:', result)
  return result
}

// 默认文件内容
const DEFAULT_FILES = {
  'package.json': JSON.stringify(
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
  ),
  'index.js': `console.log('欢迎使用在线代码编辑器！');
console.log('您可以在这里编写和运行 Node.js 代码。');
console.log('尝试修改 index.js 文件并运行 npm start 来查看效果。');`,
  'README.md': `# 在线代码编辑器项目

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

// 文件系统钩子
export function useFileSystem() {
  // 状态管理
  const [files, setFiles] = useState<File[]>([])
  const [treeData, setTreeData] = useState<TreeDataNode[]>([])
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [clipboard, setClipboard] = useState<{
    node: TreeDataNode | null
    isCut: boolean
    title: string
  }>({
    node: null,
    isCut: false,
    title: ''
  })

  // 初始化默认文件
  useEffect(() => {
    // 只有在没有文件时才初始化默认文件
    if (treeData.length === 0) {
      const defaultTreeData: TreeDataNode[] = []
      const defaultContents: Record<string, string> = { ...DEFAULT_FILES }
      const defaultFiles: File[] = []

      // 为每个默认文件创建 File 对象
      Object.entries(DEFAULT_FILES).forEach(([filePath, content]) => {
        // 创建 File 对象
        const file = new File([content], filePath, { type: 'text/plain' })
        defaultFiles.push(file)

        // 构建树节点
        buildTreeFromPath(defaultTreeData, filePath, file)
      })

      // 设置默认文件
      setFiles(defaultFiles)
      setTreeData(defaultTreeData)
      setFileContents(defaultContents)

      // 初始化 WebContainer
      initializeWebContainerFromFileSystem(defaultTreeData, defaultContents)
        .then((success) => {
          if (success) {
            console.log('WebContainer 已使用默认文件初始化')
          } else {
            console.warn('WebContainer 默认初始化失败')
          }
        })
        .catch((error) => {
          console.error('初始化 WebContainer 失败:', error)
        })
    }
  }, [treeData.length])

  // 处理文件上传
  const handleFilesUploaded = async (uploadedFiles: File[]) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return

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
    setFiles((prev) => [...prev, ...uploadedFiles])
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
  }

  // 读取文件内容为文本
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (e) => {
        console.error('文件读取错误:', e)
        reject(new Error(`读取文件 ${file.name} 失败`))
      }
      reader.readAsText(file)
    })
  }

  // 根据key获取文件内容
  const getFileContentByKey = (key: string): FileInfo => {
    console.log('获取文件内容，key:', key)

    // 查找对应的节点
    const node = findNodeByKey(treeData, key)
    console.log('找到节点:', node)

    if (!node || !node.data) {
      console.warn(`未找到节点: ${key}`)
      return {
        name: key.split('-').pop() || key,
        path: key,
        type: FileType.UNKNOWN,
        content: '// 文件内容未找到'
      }
    }

    const file = node.data as File
    const path = file.webkitRelativePath || file.name
    console.log('文件路径:', path)

    // 检查是否有缓存的内容
    if (!fileContents[path]) {
      console.warn(`未找到文件内容: ${path}，尝试读取文件...`)
      // 尝试立即读取文件内容
      readFileAsText(file)
        .then((content) => {
          console.log(`动态读取文件内容成功: ${path}`)
          setFileContents((prev) => ({
            ...prev,
            [path]: content
          }))
        })
        .catch((error) => {
          console.error(`动态读取文件内容失败: ${path}`, error)
        })
    }

    const content = fileContents[path] || '// 正在加载文件内容...'

    return {
      name: file.name,
      path,
      type: getFileType(file.name),
      content,
      size: file.size,
      lastModified: new Date(file.lastModified)
    }
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

  // 重命名文件
  const renameFile = (key: string, newName: string) => {
    // 查找节点
    const node = findNodeByKey(treeData, key)
    if (!node) {
      console.warn(`未找到节点: ${key}`)
      return
    }

    // 更新节点标题
    node.title = newName

    // 如果是文件节点，更新文件对象
    if (node.isLeaf) {
      // 找到对应的文件
      const fileIndex = files.findIndex((file) => {
        const filePath = file.webkitRelativePath || file.name
        return key.includes(filePath)
      })

      if (fileIndex !== -1) {
        // 创建新的文件对象（因为 File 对象是只读的）
        const oldFile = files[fileIndex]
        const oldPath = oldFile.webkitRelativePath || oldFile.name
        const newPath = oldPath.replace(/[^/\\]*$/, newName)

        // 更新文件内容映射
        if (fileContents[oldPath]) {
          fileContents[newPath] = fileContents[oldPath]
          delete fileContents[oldPath]
        }

        // 更新树形结构
        setTreeData([...treeData])
      }
    } else {
      // 如果是目录节点，只需更新树形结构
      setTreeData([...treeData])
    }
  }

  // 删除文件
  const deleteFile = (key: string) => {
    // 查找节点的父节点
    const findParentNode = (
      nodes: TreeDataNode[],
      targetKey: string
    ): { parent: TreeDataNode | null; index: number } => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.children) {
          for (let j = 0; j < node.children.length; j++) {
            if (node.children[j].key === targetKey) {
              return { parent: node, index: j }
            }
          }
          const result = findParentNode(node.children, targetKey)
          if (result.parent) {
            return result
          }
        }
      }
      return { parent: null, index: -1 }
    }

    // 如果是根节点
    for (let i = 0; i < treeData.length; i++) {
      if (treeData[i].key === key) {
        // 删除根节点
        const newTreeData = [...treeData]
        newTreeData.splice(i, 1)
        setTreeData(newTreeData)

        // 如果是文件，从文件列表和内容映射中删除
        if (treeData[i].isLeaf) {
          const fileIndex = files.findIndex((file) => {
            const filePath = file.webkitRelativePath || file.name
            return key.includes(filePath)
          })

          if (fileIndex !== -1) {
            const file = files[fileIndex]
            const path = file.webkitRelativePath || file.name

            // 删除文件内容
            delete fileContents[path]

            // 更新文件列表
            const newFiles = [...files]
            newFiles.splice(fileIndex, 1)
            setFiles(newFiles)
          }
        }

        return
      }
    }

    // 查找父节点
    const { parent, index } = findParentNode(treeData, key)
    if (parent && parent.children && index !== -1) {
      // 获取要删除的节点
      const nodeToDelete = parent.children[index]

      // 从父节点的子节点列表中删除
      parent.children.splice(index, 1)

      // 如果父节点没有子节点了，删除 children 属性
      if (parent.children.length === 0) {
        delete parent.children
      }

      // 如果是文件，从文件列表和内容映射中删除
      if (nodeToDelete.isLeaf) {
        const fileIndex = files.findIndex((file) => {
          const filePath = file.webkitRelativePath || file.name
          return key.includes(filePath)
        })

        if (fileIndex !== -1) {
          const file = files[fileIndex]
          const path = file.webkitRelativePath || file.name

          // 删除文件内容
          delete fileContents[path]

          // 更新文件列表
          const newFiles = [...files]
          newFiles.splice(fileIndex, 1)
          setFiles(newFiles)
        }
      }

      // 更新树形结构
      setTreeData([...treeData])
    }
  }

  // 复制文件
  const copyFile = (key: string) => {
    // 查找节点
    const node = findNodeByKey(treeData, key)
    if (!node) {
      console.warn(`未找到节点: ${key}`)
      return
    }

    // 只支持复制文件，不支持复制目录
    if (!node.isLeaf) {
      message.info('暂不支持复制文件夹')
      return
    }

    // 找到对应的文件
    const fileIndex = files.findIndex((file) => {
      const filePath = file.webkitRelativePath || file.name
      return key.includes(filePath)
    })

    if (fileIndex !== -1) {
      const originalFile = files[fileIndex]
      const originalPath = originalFile.webkitRelativePath || originalFile.name

      // 生成新的文件名（添加 "副本" 后缀）
      const lastDotIndex = originalPath.lastIndexOf('.')
      const extension =
        lastDotIndex !== -1 ? originalPath.substring(lastDotIndex) : ''
      const nameWithoutExtension =
        lastDotIndex !== -1
          ? originalPath.substring(0, lastDotIndex)
          : originalPath
      const newPath = `${nameWithoutExtension} - 副本${extension}`

      // 复制文件内容
      if (fileContents[originalPath]) {
        fileContents[newPath] = fileContents[originalPath]
      }

      // 创建新的文件对象
      const newFile = new File([originalFile], newPath.split('/').pop() || '', {
        type: originalFile.type,
        lastModified: Date.now()
      })

      // 更新文件列表
      const newFiles = [...files, newFile]
      setFiles(newFiles)

      // 更新树形结构
      const newTreeData = filesToTreeData(newFiles)
      setTreeData(newTreeData)
    }
  }

  // 复制到剪贴板
  const copyToClipboard = (key: string, isLeaf: boolean, title: string) => {
    setClipboard({
      node: findNodeByKey(treeData, key),
      isCut: false,
      title
    })
    message.success(`已复制: ${title}`)
  }

  // 剪切到剪贴板
  const cutToClipboard = (key: string, isLeaf: boolean, title: string) => {
    setClipboard({
      node: findNodeByKey(treeData, key),
      isCut: true,
      title
    })
    message.success(`已剪切: ${title}`)
  }

  // 从剪贴板粘贴
  const pasteFromClipboard = (targetKey: string) => {
    if (!clipboard.node) {
      message.error('剪贴板为空')
      return
    }

    // 查找源节点和目标节点
    const sourceNode = clipboard.node
    const targetNode =
      targetKey === 'root'
        ? { key: 'root', title: 'root', isLeaf: false }
        : findNodeByKey(treeData, targetKey)

    if (!sourceNode) {
      message.error('源文件不存在')
      return
    }

    if (!targetNode) {
      message.error('目标位置不存在')
      return
    }

    // 不能粘贴到自身
    if (targetNode.key === sourceNode.key) {
      message.error('不能粘贴到自身')
      return
    }

    // 不能粘贴到自身的子节点
    if (isChildOf(targetNode, sourceNode.key)) {
      message.error('不能粘贴到自身的子节点')
      return
    }

    // 根据源节点类型执行不同的粘贴操作
    if (clipboard.isLeaf) {
      // 粘贴文件
      pasteFile(sourceNode, targetNode, clipboard.isCut)
    } else {
      // 粘贴文件夹
      pasteFolder(sourceNode, targetNode, clipboard.isCut)
    }

    // 如果是剪切操作，粘贴后清空剪贴板
    if (clipboard.isCut) {
      setClipboard({
        node: null,
        isCut: false,
        title: ''
      })
    }
  }

  // 检查节点是否是指定节点的子节点
  const isChildOf = (node: TreeDataNode, parentKey: string): boolean => {
    if (node.key === parentKey) {
      return true
    }

    if (node.children) {
      for (const child of node.children) {
        if (isChildOf(child, parentKey)) {
          return true
        }
      }
    }

    return false
  }

  // 粘贴文件
  const pasteFile = (
    sourceNode: TreeDataNode,
    targetNode: TreeDataNode,
    isCut: boolean
  ) => {
    // 查找源文件
    const sourceFileIndex = files.findIndex((file) => {
      const filePath = file.webkitRelativePath || file.name
      return sourceNode.key.includes(filePath)
    })

    if (sourceFileIndex === -1) {
      message.error('源文件不存在')
      return
    }

    const sourceFile = files[sourceFileIndex]
    const sourceFileName = sourceFile.name
    const sourcePath = sourceFile.webkitRelativePath || sourceFile.name

    // 构建目标路径
    let targetPath = ''
    if (targetNode.key === 'root') {
      targetPath = sourceFileName
    } else {
      // 从目标节点的 key 中提取路径
      const targetNodePath = getPathFromKey(targetNode.key)

      // 如果目标是文件夹，则放在文件夹内
      if (!targetNode.isLeaf) {
        targetPath = `${targetNodePath}/${sourceFileName}`
      } else {
        // 如果目标是文件，则放在同级目录
        const lastSlashIndex = targetNodePath.lastIndexOf('/')
        const targetDir =
          lastSlashIndex !== -1
            ? targetNodePath.substring(0, lastSlashIndex)
            : ''
        targetPath = targetDir
          ? `${targetDir}/${sourceFileName}`
          : sourceFileName
      }
    }

    // 检查目标路径是否已存在同名文件
    const existingFile = files.some((file) => {
      const filePath = file.webkitRelativePath || file.name
      return filePath === targetPath && filePath !== sourcePath
    })

    // 如果存在同名文件，添加后缀
    if (existingFile) {
      const lastDotIndex = sourceFileName.lastIndexOf('.')
      const extension =
        lastDotIndex !== -1 ? sourceFileName.substring(lastDotIndex) : ''
      const nameWithoutExtension =
        lastDotIndex !== -1
          ? sourceFileName.substring(0, lastDotIndex)
          : sourceFileName

      // 从目标节点的 key 中提取路径
      const targetNodePath =
        targetNode.key === 'root' ? '' : getPathFromKey(targetNode.key)

      // 如果目标是文件夹，则放在文件夹内
      if (targetNode.key === 'root' || !targetNode.isLeaf) {
        targetPath = targetNodePath
          ? `${targetNodePath}/${nameWithoutExtension} - 副本${extension}`
          : `${nameWithoutExtension} - 副本${extension}`
      } else {
        // 如果目标是文件，则放在同级目录
        const lastSlashIndex = targetNodePath.lastIndexOf('/')
        const targetDir =
          lastSlashIndex !== -1
            ? targetNodePath.substring(0, lastSlashIndex)
            : ''
        targetPath = targetDir
          ? `${targetDir}/${nameWithoutExtension} - 副本${extension}`
          : `${nameWithoutExtension} - 副本${extension}`
      }
    }

    // 复制文件内容
    if (fileContents[sourcePath]) {
      fileContents[targetPath] = fileContents[sourcePath]
    }

    // 创建新的文件对象
    const newFile = new File([sourceFile], targetPath.split('/').pop() || '', {
      type: sourceFile.type,
      lastModified: Date.now()
    })

    // 设置 webkitRelativePath 属性
    Object.defineProperty(newFile, 'webkitRelativePath', {
      value: targetPath,
      writable: false
    })

    // 更新文件列表
    let newFiles = [...files]

    // 如果是剪切操作，删除源文件
    if (isCut) {
      newFiles.splice(sourceFileIndex, 1)
      delete fileContents[sourcePath]
    }

    // 添加新文件
    newFiles.push(newFile)
    setFiles(newFiles)

    // 更新树形结构
    const newTreeData = filesToTreeData(newFiles)
    setTreeData(newTreeData)

    message.success(isCut ? '已移动文件' : '已复制文件')
  }

  // 粘贴文件夹
  const pasteFolder = (
    sourceNode: TreeDataNode,
    targetNode: TreeDataNode,
    isCut: boolean
  ) => {
    // 获取源文件夹路径
    const sourceFolderPath = getPathFromKey(sourceNode.key)
    const sourceFolderName = sourceFolderPath.split('/').pop() || ''

    // 构建目标基础路径
    let targetBasePath = ''
    if (targetNode.key === 'root') {
      targetBasePath = sourceFolderName
    } else {
      // 从目标节点的 key 中提取路径
      const targetNodePath = getPathFromKey(targetNode.key)

      // 如果目标是文件夹，则放在文件夹内
      if (!targetNode.isLeaf) {
        targetBasePath = `${targetNodePath}/${sourceFolderName}`
      } else {
        // 如果目标是文件，则放在同级目录
        const lastSlashIndex = targetNodePath.lastIndexOf('/')
        const targetDir =
          lastSlashIndex !== -1
            ? targetNodePath.substring(0, lastSlashIndex)
            : ''
        targetBasePath = targetDir
          ? `${targetDir}/${sourceFolderName}`
          : sourceFolderName
      }
    }

    // 检查目标路径是否已存在同名文件夹
    const existingFolder = treeData.some((node) => {
      if (!node.isLeaf && getPathFromKey(node.key) === targetBasePath) {
        return true
      }
      return false
    })

    // 如果存在同名文件夹，添加后缀
    if (existingFolder) {
      targetBasePath = `${targetBasePath} - 副本`
    }

    // 查找源文件夹下的所有文件
    const folderFiles = files.filter((file) => {
      const filePath = file.webkitRelativePath || file.name
      return filePath.startsWith(sourceFolderPath + '/')
    })

    if (folderFiles.length === 0) {
      // 如果是空文件夹，创建一个空的文件夹节点
      if (isCut) {
        // 如果是剪切操作，删除源文件夹
        const newTreeData = [...treeData]
        deleteNodeByKey(newTreeData, sourceNode.key)
        setTreeData(newTreeData)
      }

      // 创建新的空文件夹节点
      const emptyFolderNode: TreeDataNode = {
        key: `folder-${Date.now()}-${targetBasePath}`,
        title: targetBasePath.split('/').pop() || '',
        isLeaf: false,
        children: []
      }

      // 添加到目标位置
      if (targetNode.key === 'root') {
        setTreeData([...treeData, emptyFolderNode])
      } else {
        // 递归添加到目标节点
        const newTreeData = [...treeData]
        addChildToNode(newTreeData, targetNode.key, emptyFolderNode)
        setTreeData(newTreeData)
      }
    } else {
      // 复制文件夹下的所有文件
      let newFiles = [...files]

      // 如果是剪切操作，准备删除源文件
      const filesToRemove: number[] = []

      // 处理每个文件
      folderFiles.forEach((file) => {
        const sourcePath = file.webkitRelativePath || file.name
        const relativePath = sourcePath.substring(sourceFolderPath.length)
        const targetPath = targetBasePath + relativePath

        // 复制文件内容
        if (fileContents[sourcePath]) {
          fileContents[targetPath] = fileContents[sourcePath]
        }

        // 创建新的文件对象
        const newFile = new File([file], targetPath.split('/').pop() || '', {
          type: file.type,
          lastModified: Date.now()
        })

        // 设置 webkitRelativePath 属性
        Object.defineProperty(newFile, 'webkitRelativePath', {
          value: targetPath,
          writable: false
        })

        // 添加新文件
        newFiles.push(newFile)

        // 如果是剪切操作，记录要删除的源文件索引
        if (isCut) {
          const sourceIndex = files.findIndex(
            (f) => (f.webkitRelativePath || f.name) === sourcePath
          )
          if (sourceIndex !== -1) {
            filesToRemove.push(sourceIndex)
            delete fileContents[sourcePath]
          }
        }
      })

      // 如果是剪切操作，删除源文件
      if (isCut) {
        // 从大到小排序，以便正确删除
        filesToRemove.sort((a, b) => b - a)

        // 删除源文件
        filesToRemove.forEach((index) => {
          newFiles.splice(index, 1)
        })
      }

      // 更新文件列表
      setFiles(newFiles)

      // 更新树形结构
      const newTreeData = filesToTreeData(newFiles)
      setTreeData(newTreeData)
    }

    message.success(isCut ? '已移动文件夹' : '已复制文件夹')
  }

  // 从树形结构中删除节点
  const deleteNodeByKey = (nodes: TreeDataNode[], key: string): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].key === key) {
        nodes.splice(i, 1)
        return true
      }
      if (nodes[i].children) {
        if (deleteNodeByKey(nodes[i].children, key)) {
          return true
        }
      }
    }
    return false
  }

  // 从节点 key 中提取路径
  const getPathFromKey = (key: string): string => {
    // 尝试从 key 中提取路径
    // 通常 key 的格式是 "folder-{timestamp}-{path}" 或 "file-{timestamp}-{path}"
    const parts = key.split('-')
    if (parts.length >= 3) {
      return parts.slice(2).join('-')
    }
    return key
  }

  // 递归添加子节点
  const addChildToNode = (
    nodes: TreeDataNode[],
    targetKey: string,
    childNode: TreeDataNode
  ): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].key === targetKey) {
        if (!nodes[i].children) {
          nodes[i].children = []
        }
        nodes[i].children.push(childNode)
        return true
      }
      if (nodes[i].children) {
        if (addChildToNode(nodes[i].children, targetKey, childNode)) {
          return true
        }
      }
    }
    return false
  }

  // 创建新文件夹
  const createNewFolder = (parentKey: string, folderName: string) => {
    // 构建文件夹路径
    let folderPath = ''
    if (parentKey === 'root') {
      folderPath = folderName
    } else {
      // 从父节点的 key 中提取路径
      const parentPath = getPathFromKey(parentKey)
      folderPath = `${parentPath}/${folderName}`
    }

    // 检查是否已存在同名文件夹
    const existingFolder = treeData.some((node) => {
      if (!node.isLeaf && getPathFromKey(node.key) === folderPath) {
        return true
      }
      return false
    })

    if (existingFolder) {
      message.error(`文件夹 "${folderName}" 已存在`)
      return
    }

    // 创建新的文件夹节点
    const newFolderNode: TreeDataNode = {
      key: `folder-${Date.now()}-${folderPath}`,
      title: folderName,
      isLeaf: false,
      children: []
    }

    // 将新文件夹添加到树形结构
    if (parentKey === 'root') {
      setTreeData([...treeData, newFolderNode])
    } else {
      // 递归添加到父节点
      const newTreeData = [...treeData]
      addChildToNode(newTreeData, parentKey, newFolderNode)
      setTreeData(newTreeData)
    }

    message.success(`已创建文件夹 "${folderName}"`)
  }

  // 创建新文件
  const createNewFile = (parentKey: string, fileName: string) => {
    // 构建文件路径
    let filePath = ''
    if (parentKey === 'root') {
      filePath = fileName
    } else {
      // 从父节点的 key 中提取路径
      const parentPath = getPathFromKey(parentKey)
      filePath = `${parentPath}/${fileName}`
    }

    // 检查是否已存在同名文件
    const existingFile = files.some((file) => {
      const path = file.webkitRelativePath || file.name
      return path === filePath
    })

    if (existingFile) {
      message.error(`文件 "${fileName}" 已存在`)
      return
    }

    // 创建新的文件对象
    const newFile = new File([''], fileName, {
      type: 'text/plain',
      lastModified: Date.now()
    })

    // 设置 webkitRelativePath 属性
    Object.defineProperty(newFile, 'webkitRelativePath', {
      value: filePath,
      writable: false
    })

    // 更新文件列表
    const newFiles = [...files, newFile]
    setFiles(newFiles)

    // 更新文件内容映射
    fileContents[filePath] = ''

    // 更新树形结构
    const newTreeData = filesToTreeData(newFiles)
    setTreeData(newTreeData)

    message.success(`已创建文件 "${fileName}"`)
  }

  // 保存文件内容
  const saveFile = (key: string, content: string): boolean => {
    try {
      // 查找文件节点
      const node = findNodeByKey(treeData, key)

      if (!node || !node.data) {
        console.warn(`未找到节点: ${key}`)
        return false
      }

      // 获取文件对象
      const file = node.data as File

      // 获取文件路径
      const filePath = file.webkitRelativePath || file.name

      // 更新文件内容
      const updatedFile = new File([content], file.name, {
        type: file.type,
        lastModified: new Date().getTime()
      })

      // 更新文件对象
      node.data = updatedFile

      // 更新文件内容缓存 - 使用对象赋值而不是 Map 的 set 方法
      fileContents[filePath] = content

      // 更新文件列表中的文件
      const fileIndex = files.findIndex(
        (f) => (f.webkitRelativePath || f.name) === filePath
      )

      if (fileIndex !== -1) {
        const newFiles = [...files]
        newFiles[fileIndex] = updatedFile
        setFiles(newFiles)
      }

      return true
    } catch (error) {
      console.error('保存文件时出错:', error)
      return false
    }
  }

  return {
    files,
    treeData,
    handleFilesUploaded,
    getFileContentByKey,
    findNodeByKey,
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
  }
}

// 从文件路径构建树节点
export function buildTreeFromPath(
  treeData: TreeDataNode[],
  filePath: string,
  file?: File
) {
  // 分割路径
  const parts = filePath.split('/')
  const fileName = parts.pop() || ''

  // 递归构建目录结构
  let currentLevel = treeData
  let currentPath = ''

  for (const part of parts) {
    if (!part) continue

    currentPath = currentPath ? `${currentPath}/${part}` : part
    const nodeKey = currentPath.replace(/\//g, '-')

    // 查找当前层级是否已存在该目录
    let found = false
    for (const node of currentLevel) {
      if (node.title === part) {
        // 目录已存在，进入下一级
        if (!node.children) {
          node.children = []
        }
        currentLevel = node.children
        found = true
        break
      }
    }

    // 如果目录不存在，创建新目录
    if (!found) {
      const newNode: TreeDataNode = {
        title: part,
        key: nodeKey,
        children: [],
        isLeaf: false
      }
      currentLevel.push(newNode)
      currentLevel = newNode.children!
    }
  }

  // 添加文件节点
  if (fileName) {
    const fullPath =
      parts.length > 0 ? `${parts.join('/')}/${fileName}` : fileName
    const nodeKey = fullPath.replace(/\//g, '-')

    // 检查文件是否已存在
    const existingFile = currentLevel.find((node) => node.title === fileName)
    if (!existingFile) {
      currentLevel.push({
        title: fileName,
        key: nodeKey,
        isLeaf: true,
        data: file
      })
    }
  }

  // 对树节点进行排序：目录在前，文件在后
  sortTreeNodes(treeData)

  return treeData
}

// 对树节点进行排序
function sortTreeNodes(nodes: TreeDataNode[]) {
  nodes.sort((a, b) => {
    // 目录在前，文件在后
    const aIsLeaf = a.isLeaf || false
    const bIsLeaf = b.isLeaf || false

    if (aIsLeaf !== bIsLeaf) {
      return aIsLeaf ? 1 : -1
    }

    // 同类型按名称排序
    return (a.title as string).localeCompare(b.title as string)
  })

  // 递归排序子节点
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      sortTreeNodes(node.children)
    }
  }
}

// 处理文件上传 - 确保参数类型正确
export const handleFileUpload = async (
  files: FileList,
  currentTreeData: TreeDataNode[],
  currentContents: Record<string, string>,
  setTreeData: React.Dispatch<React.SetStateAction<TreeDataNode[]>>,
  setFileContents: React.Dispatch<React.SetStateAction<Record<string, string>>>
) => {
  // 导入 buildTreeFromPath 函数
  const { buildTreeFromPath } = require('./fileSystemUtils')

  if (!files || files.length === 0) {
    message.warning('未选择任何文件')
    return
  }

  // 检查参数类型
  if (typeof setTreeData !== 'function') {
    console.error('setTreeData 不是函数', setTreeData)
    throw new Error('setTreeData 必须是一个函数')
  }

  if (typeof setFileContents !== 'function') {
    console.error('setFileContents 不是函数', setFileContents)
    throw new Error('setFileContents 必须是一个函数')
  }

  // 转换 FileList 为数组
  const uploadedFiles = Array.from(files)
  console.log('上传的文件:', uploadedFiles)

  // 确保 currentTreeData 是数组
  const newTreeData = Array.isArray(currentTreeData) ? [...currentTreeData] : []
  const newContents = { ...currentContents }

  // 处理文件
  for (const file of uploadedFiles) {
    // 获取文件路径
    const filePath = file.webkitRelativePath || file.name
    console.log('文件路径:', filePath)

    // 读取文件内容
    try {
      const content = await file.text()
      newContents[filePath] = content
    } catch (error) {
      console.error(`读取文件 ${filePath} 内容失败:`, error)
    }

    // 构建树节点（合并到现有树中）
    buildTreeFromPath(newTreeData, filePath, file)
  }

  // 更新状态
  setTreeData(newTreeData)
  setFileContents(newContents)

  // 将文件挂载到 WebContainer
  try {
    // 使用新的函数初始化 WebContainer
    const success = await initializeWebContainerFromFileSystem(
      newTreeData,
      newContents
    )
    if (success) {
      message.success('文件已挂载到终端环境')
    } else {
      message.warning('文件已上传，但无法挂载到终端环境')
    }
  } catch (error) {
    console.error('挂载文件到 WebContainer 失败:', error)
    message.warning('文件已上传，但无法挂载到终端环境')
  }
}
