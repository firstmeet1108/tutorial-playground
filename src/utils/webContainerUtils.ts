import { WebContainer } from '@webcontainer/api'

// 存储 WebContainer 实例（全局单例）
let webcontainerInstance: WebContainer | null = null
let isWebContainerSupported = true
let isInitializing = false // 添加初始化锁，防止并发初始化
let initPromise: Promise<WebContainer | null> | null = null // 存储初始化 Promise

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
export async function initWebContainer() {
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

      // 设置默认工作目录
      await setupDefaultWorkspace(webcontainerInstance)

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

// 设置默认工作空间
async function setupDefaultWorkspace(webcontainer: WebContainer) {
  try {
    // 检查是否已经有文件
    const files = await webcontainer.fs.readdir('/')

    // 如果已经有文件，不创建默认工作空间
    if (files.length > 0 && files.some((file) => file !== '.jsh_history')) {
      console.log('使用现有文件作为工作空间')
      return
    }
  } catch (error) {
    // 目录读取失败，继续创建默认工作空间
    console.warn('读取目录失败，创建默认工作空间:', error)
  }

  // 创建基本的项目结构
  await webcontainer.mount({
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
  })

  console.log('创建了默认工作空间')
}

// 获取 WebContainer 实例
export function getWebContainer() {
  return webcontainerInstance
}

// 从文件系统创建 WebContainer 文件结构
export async function mountFilesToWebContainer(files: File[]) {
  const webcontainer = await initWebContainer()

  // 如果 WebContainer 不可用，返回 false
  if (!webcontainer) {
    return false
  }

  try {
    // 创建文件结构对象
    const fileEntries: Record<string, any> = {}

    // 检查是否有文件
    if (files.length === 0) {
      console.warn('没有文件可挂载到 WebContainer')
      return false
    }

    // 处理文件
    for (const file of files) {
      const path = file.webkitRelativePath || file.name

      try {
        // 读取文件内容
        const content = await file.text()

        // 将路径分割为目录和文件名
        const parts = path.split('/')
        const fileName = parts.pop() || ''
        let currentLevel = fileEntries

        // 创建嵌套目录结构
        for (const part of parts) {
          if (!part) continue

          if (!currentLevel[part]) {
            currentLevel[part] = { directory: {} }
          }

          currentLevel = currentLevel[part].directory
        }

        // 添加文件
        currentLevel[fileName] = {
          file: { contents: content }
        }
      } catch (error) {
        console.error(`处理文件 ${path} 失败:`, error)
        // 继续处理其他文件
      }
    }

    // 挂载文件系统
    await webcontainer.mount(fileEntries)
    console.log('文件已挂载到 WebContainer')

    // 如果没有 package.json，创建一个基本的
    try {
      await webcontainer.fs.stat('/package.json')
    } catch (error) {
      // 文件不存在，创建一个基本的 package.json
      await webcontainer.fs.writeFile(
        '/package.json',
        JSON.stringify(
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
      )
      console.log('创建了基本的 package.json')
    }

    return true
  } catch (error) {
    console.error('挂载文件到 WebContainer 失败:', error)
    return false
  }
}

// 进程管理相关功能

// 存储运行中的进程
const runningProcesses = new Map()

// 执行命令并获取结果（添加导出）
export async function executeCommandAndGetResult(
  command: string,
  args: string[] = []
) {
  const webcontainer = await initWebContainer()
  if (!webcontainer) {
    throw new Error('WebContainer 不可用')
  }

  try {
    // 启动进程
    const process = await webcontainer.spawn(command, args)

    // 确保进程对象存在
    if (!process) {
      throw new Error(`无法启动命令: ${command}`)
    }

    // 收集输出
    let output = ''
    let error = ''

    // 创建输出流处理
    const outputStream = new WritableStream({
      write(data) {
        output += data
      }
    })

    // 创建错误流处理
    const errorStream = new WritableStream({
      write(data) {
        error += data
      }
    })

    // 管道连接
    process.output.pipeTo(outputStream).catch((e) => {
      console.error('处理输出流失败:', e)
    })

    process.stderr.pipeTo(errorStream).catch((e) => {
      console.error('处理错误流失败:', e)
    })

    // 等待进程结束
    const exitCode = await process.exit

    // 返回结果
    return {
      exitCode,
      output,
      error
    }
  } catch (error) {
    console.error(`执行命令失败 (${command} ${args.join(' ')}):`, error)
    return {
      exitCode: -1,
      output: '',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 启动长时间运行的进程
export async function startProcess(
  id: string,
  command: string,
  args: string[] = []
) {
  const webcontainer = await initWebContainer()
  if (!webcontainer) {
    throw new Error('WebContainer 不可用')
  }

  try {
    // 如果已有同名进程在运行，先停止它
    if (runningProcesses.has(id)) {
      await stopProcess(id)
    }

    // 启动新进程
    const process = await webcontainer.spawn(command, args)

    // 存储进程信息
    runningProcesses.set(id, {
      process,
      command,
      args,
      startTime: new Date()
    })

    return {
      id,
      process,
      output: process.output,
      input: process.input
    }
  } catch (error) {
    console.error(`启动进程 ${command} 失败:`, error)
    throw error
  }
}

// 停止进程
export async function stopProcess(id: string) {
  const processInfo = runningProcesses.get(id)
  if (!processInfo) {
    return false
  }

  try {
    // 发送 SIGTERM 信号
    await processInfo.process.kill()

    // 从运行列表中移除
    runningProcesses.delete(id)

    return true
  } catch (error) {
    console.error(`停止进程 ${id} 失败:`, error)
    return false
  }
}

// 获取所有运行中的进程
export function getRunningProcesses() {
  return Array.from(runningProcesses.entries()).map(([id, info]) => ({
    id,
    command: info.command,
    args: info.args,
    startTime: info.startTime,
    runningTime: Date.now() - info.startTime.getTime()
  }))
}

// npm 包管理功能

// 安装 npm 包
export async function installPackage(packageName: string, isDev = false) {
  try {
    const args = ['install', packageName]
    if (isDev) {
      args.push('--save-dev')
    }

    const result = await executeCommandAndGetResult('npm', args)

    if (result.exitCode !== 0) {
      throw new Error(`安装包 ${packageName} 失败: ${result.error}`)
    }

    return {
      success: true,
      output: result.output
    }
  } catch (error) {
    console.error(`安装包 ${packageName} 失败:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 卸载 npm 包
export async function uninstallPackage(packageName: string) {
  try {
    const result = await executeCommandAndGetResult('npm', [
      'uninstall',
      packageName
    ])

    if (result.exitCode !== 0) {
      throw new Error(`卸载包 ${packageName} 失败: ${result.error}`)
    }

    return {
      success: true,
      output: result.output
    }
  } catch (error) {
    console.error(`卸载包 ${packageName} 失败:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 获取已安装的包列表
export async function listPackages() {
  try {
    const result = await executeCommandAndGetResult('npm', [
      'list',
      '--json',
      '--depth=0'
    ])

    if (result.exitCode !== 0) {
      throw new Error(`获取包列表失败: ${result.error}`)
    }

    const packageInfo = JSON.parse(result.output)

    return {
      success: true,
      dependencies: packageInfo.dependencies || {},
      devDependencies: packageInfo.devDependencies || {}
    }
  } catch (error) {
    console.error('获取包列表失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      dependencies: {},
      devDependencies: {}
    }
  }
}

// WebContainer 状态监控

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

// 获取当前状态
export function getWebContainerStatus(): WebContainerStatus {
  const isAvailable = isWebContainerSupported
  const isInitialized = !!webcontainerInstance

  // 计算运行时间
  const startTime = webcontainerInstance ? new Date() : null
  const runningTime = startTime ? Date.now() - startTime.getTime() : 0

  // 进程数量
  const processCount = runningProcesses.size

  return {
    isAvailable,
    isInitialized,
    startTime,
    runningTime,
    memoryUsage: null, // WebContainer API 目前不提供内存使用信息
    processCount,
    lastError: null
  }
}

// 在 WebContainer 中执行命令
export async function executeCommand(command: string, args: string[] = []) {
  const webcontainer = await initWebContainer()

  // 如果 WebContainer 不可用，抛出错误
  if (!webcontainer) {
    throw new Error('WebContainer 不可用')
  }

  try {
    // 检查命令是否存在
    if (command === 'jsh') {
      // jsh 不存在，使用 bash 或 sh 代替
      try {
        // 尝试使用 bash
        const process = await webcontainer.spawn('bash', [])
        return {
          process,
          exit: process.exit,
          output: process.output,
          input: process.input
        }
      } catch (error) {
        console.warn('bash 不可用，尝试使用 sh')
        try {
          // 尝试使用 sh
          const process = await webcontainer.spawn('sh', [])
          return {
            process,
            exit: process.exit,
            output: process.output,
            input: process.input
          }
        } catch (innerError) {
          console.error('无法启动 shell:', innerError)
          throw new Error('无法启动 shell 环境')
        }
      }
    }

    // 启动进程
    const process = await webcontainer.spawn(command, args)

    // 确保进程对象存在
    if (!process) {
      throw new Error(`无法启动命令: ${command}`)
    }

    return {
      process,
      exit: process.exit,
      output: process.output,
      input: process.input
    }
  } catch (error) {
    console.error(`执行命令失败 (${command} ${args.join(' ')}):`, error)
    throw error
  }
}

// 启动开发服务器
export async function startDevServer() {
  try {
    const result = await executeCommand('npm', ['run', 'dev'])

    // 确保返回值中包含 process
    if (!result || !result.process) {
      throw new Error('启动开发服务器失败: 无法获取进程')
    }

    // 返回进程，以便可以监听输出
    return result.process
  } catch (error) {
    console.error('启动开发服务器失败:', error)
    throw error
  }
}

// 从文件系统获取文件内容并初始化 WebContainer
export async function initializeWebContainerFromFileSystem(
  treeData: TreeDataNode[],
  fileContents: Record<string, string>
) {
  const webcontainer = await initWebContainer()

  if (!webcontainer) {
    console.warn('WebContainer 不可用，无法初始化文件系统')
    return false
  }

  try {
    // 创建文件结构对象
    const fileEntries: Record<string, any> = {}

    // 递归构建文件结构
    const buildFileEntries = (
      nodes: TreeDataNode[],
      currentPath: string = '',
      entries: Record<string, any> = fileEntries
    ) => {
      for (const node of nodes) {
        const nodeName = node.title as string
        const fullPath = currentPath ? `${currentPath}/${nodeName}` : nodeName

        if (node.isLeaf) {
          // 文件节点
          const content = fileContents[fullPath] || ''

          // 将路径分割为目录和文件名
          const parts = fullPath.split('/')
          const fileName = parts.pop() || ''
          let currentLevel = entries

          // 创建嵌套目录结构
          for (const part of parts) {
            if (!part) continue

            if (!currentLevel[part]) {
              currentLevel[part] = { directory: {} }
            }

            currentLevel = currentLevel[part].directory
          }

          // 添加文件
          currentLevel[fileName] = {
            file: { contents: content }
          }
        } else if (node.children && node.children.length > 0) {
          // 目录节点，递归处理子节点
          buildFileEntries(node.children, fullPath, entries)
        }
      }
    }

    // 构建文件结构
    buildFileEntries(treeData)

    // 挂载文件系统
    await webcontainer.mount(fileEntries)
    console.log('文件系统已挂载到 WebContainer')

    // 确保有 package.json，如果没有则创建一个基本的
    try {
      await webcontainer.fs.stat('/package.json')
    } catch (error) {
      // 文件不存在，创建一个基本的 package.json
      await webcontainer.fs.writeFile(
        '/package.json',
        JSON.stringify(
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
      )
      console.log('创建了基本的 package.json')
    }

    return true
  } catch (error) {
    console.error('初始化 WebContainer 文件系统失败:', error)
    return false
  }
}
