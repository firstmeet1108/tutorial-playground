import React, { useState, useRef, useEffect } from 'react'
import { Input, Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import styles from './index.module.less'
import {
  initWebContainer,
  executeCommand,
  getWebContainer,
  getWebContainerStatus,
  executeCommandAndGetResult
} from '@/utils/webContainerUtils'

interface TerminalProps {
  height?: string | number
  terminalId: string
}

interface CommandHistory {
  command: string
  output: string
  isError?: boolean
}

const Terminal: React.FC<TerminalProps> = ({
  height = '200px',
  terminalId
}) => {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<CommandHistory[]>([
    {
      command: '',
      output: '正在初始化终端环境...',
      isError: false
    }
  ])
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isReady, setIsReady] = useState(false)
  const [currentDir, setCurrentDir] = useState('/app')

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<Input>(null)
  const shellProcessRef = useRef<any>(null)

  // 初始化 WebContainer
  useEffect(() => {
    const initTerminal = async () => {
      try {
        const webcontainer = await initWebContainer()

        if (!webcontainer) {
          // WebContainer 不可用，使用模拟终端
          setHistory([
            {
              command: '',
              output:
                '终端以模拟模式运行。某些功能可能不可用。输入 help 查看可用命令。',
              isError: false
            }
          ])
          setIsReady(true)
          return
        }

        // WebContainer 可用，但不使用 jsh，而是直接使用命令执行功能
        try {
          // 检查 Node.js 版本，确认环境正常
          const nodeVersionResult = await executeCommandAndGetResult('node', [
            '-v'
          ])

          if (nodeVersionResult.exitCode === 0) {
            console.log('Node.js 版本:', nodeVersionResult.output.trim())

            // 列出当前目录文件
            const lsResult = await executeCommandAndGetResult('ls', ['-la'])

            // 创建一个简单的欢迎消息
            setHistory([
              {
                command: '',
                output: `WebContainer 终端已准备就绪。
Node.js ${nodeVersionResult.output.trim()} 
当前目录: ${currentDir}

目录内容:
${lsResult.output}

输入 help 查看可用命令。`,
                isError: false
              }
            ])
            setIsReady(true)
          } else {
            throw new Error('无法获取 Node.js 版本')
          }
        } catch (error) {
          console.error('初始化终端环境失败:', error)
          setHistory([
            {
              command: '',
              output: `初始化终端环境失败: ${error}。使用模拟终端代替。`,
              isError: true
            }
          ])
          setIsReady(true)
        }
      } catch (error) {
        console.error('初始化终端失败:', error)
        setHistory([
          {
            command: '',
            output: `初始化终端失败: ${error}。使用模拟终端代替。`,
            isError: true
          }
        ])
        setIsReady(true)
      }
    }

    initTerminal()
  }, [terminalId, currentDir])

  // 自动滚动到底部
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  // 处理命令执行
  const handleCommand = async (cmd: string) => {
    if (!cmd.trim()) return

    // 添加到命令历史
    setCommandHistory((prev) => [cmd, ...prev.slice(0, 19)])
    setHistoryIndex(-1)

    // 添加命令到历史记录
    setHistory((prev) => [
      ...prev,
      {
        command: cmd,
        output: '',
        isError: false
      }
    ])

    try {
      // 检查是否是内置命令
      const args = cmd.trim().split(' ')
      const command = args[0].toLowerCase()

      // 处理内置命令
      if (command === 'clear') {
        setHistory([])
        return
      } else if (command === 'cd') {
        // 处理 cd 命令
        const path = args[1] || '/app'
        try {
          const webcontainer = getWebContainer()
          if (webcontainer) {
            // 检查目录是否存在
            await webcontainer.fs.stat(path)
            setCurrentDir(path)
            setHistory((prev) => [
              ...prev,
              {
                command: '',
                output: `当前目录: ${path}`,
                isError: false
              }
            ])
          } else {
            simulateCommand(cmd)
          }
        } catch (error) {
          setHistory((prev) => [
            ...prev,
            {
              command: '',
              output: `目录不存在: ${path}`,
              isError: true
            }
          ])
        }
        return
      }

      // 尝试执行文件系统命令
      const result = await executeFileSystemCommand(command, args.slice(1))

      if (result) {
        // 是文件系统命令，显示结果
        setHistory((prev) => [
          ...prev,
          {
            command: '',
            output: result.output,
            isError: result.isError
          }
        ])
      } else {
        // 不是文件系统命令，尝试直接执行
        const webcontainer = getWebContainer()

        if (webcontainer) {
          try {
            // 直接执行命令
            const cmdResult = await executeCommandAndGetResult(
              command,
              args.slice(1)
            )

            setHistory((prev) => [
              ...prev,
              {
                command: '',
                output:
                  cmdResult.output +
                  (cmdResult.error ? '\n' + cmdResult.error : ''),
                isError: cmdResult.exitCode !== 0
              }
            ])
          } catch (error) {
            console.error('执行命令失败:', error)
            // 命令执行失败，使用模拟命令
            simulateCommand(cmd)
          }
        } else {
          // WebContainer 不可用，使用模拟命令
          simulateCommand(cmd)
        }
      }
    } catch (error) {
      console.error('处理命令失败:', error)
      setHistory((prev) => [
        ...prev,
        {
          command: '',
          output: `执行失败: ${error}`,
          isError: true
        }
      ])
    }

    // 清空输入
    setInput('')
  }

  // 模拟命令执行（当 WebContainer 不可用时）
  const simulateCommand = (cmd: string) => {
    const args = cmd.trim().split(' ')
    const command = args[0].toLowerCase()
    let output = ''
    let isError = false

    switch (command) {
      case 'help':
        output = `可用命令:
  help          - 显示帮助信息
  clear         - 清空终端
  echo [text]   - 显示文本
  ls [path]     - 列出目录内容
  cd [path]     - 切换目录
  cat [file]    - 显示文件内容
  mkdir [dir]   - 创建目录
  rm [-r] [path]- 删除文件或目录
  pwd           - 显示当前目录
  date          - 显示当前日期和时间
  npm [args]    - 执行 npm 命令
  node [file]   - 执行 Node.js 脚本
  version       - 显示版本信息
  whoami        - 显示当前用户
  uname         - 显示系统信息
  status        - 显示 WebContainer 状态`
        break
      case 'clear':
        setHistory([])
        return
      case 'echo':
        output = args.slice(1).join(' ')
        break
      case 'pwd':
        output = currentDir
        break
      case 'cd':
        if (args[1]) {
          let newDir = args[1]

          // 处理相对路径
          if (newDir.startsWith('./')) {
            newDir = `${currentDir}/${newDir.substring(2)}`
          } else if (newDir.startsWith('/')) {
            // 绝对路径，保持不变
          } else if (newDir === '..') {
            // 上一级目录
            const parts = currentDir.split('/')
            parts.pop()
            newDir = parts.join('/') || '/'
          } else {
            // 相对于当前目录
            newDir = `${currentDir}/${newDir}`
          }

          // 规范化路径
          newDir = newDir.replace(/\/+/g, '/').replace(/\/$/, '') || '/'

          setCurrentDir(newDir)
          output = `切换到 ${newDir}`
        } else {
          setCurrentDir('/app')
          output = '切换到 /app'
        }
        break
      case 'whoami':
        output = 'guest-user'
        break
      case 'uname':
        output = 'WebContainer-JS v1.0.0'
        break
      case 'npm':
        if (args.length > 1) {
          output = `正在执行 npm ${args.slice(1).join(' ')}...\n`
          output += '注意: 在模拟模式下，npm 命令不会实际执行。'
        } else {
          output =
            'npm <command>\n\n用法: npm <command>\n\n其中 <command> 是 install, uninstall 等'
        }
        break
      case 'node':
        if (args.length > 1) {
          output = `正在执行 node ${args[1]}...\n`
          output += '注意: 在模拟模式下，node 命令不会实际执行。'
        } else {
          output = 'node <file>\n\n用法: node <file>\n\n执行 JavaScript 文件'
        }
        break
      case 'cat':
        if (args[1]) {
          output = `模拟文件内容: ${args[1]}`
        } else {
          output = '错误: 请指定文件名'
          isError = true
        }
        break
      case 'date':
        output = new Date().toString()
        break
      case 'version':
        output = 'Terminal v1.0.0'
        break
      case 'status':
        const status = getWebContainerStatus()
        output = `WebContainer 状态:
        可用性: ${status.isAvailable ? '可用' : '不可用'}
        初始化: ${status.isInitialized ? '已初始化' : '未初始化'}
        运行时间: ${
          status.runningTime > 0
            ? Math.floor(status.runningTime / 1000) + ' 秒'
            : 'N/A'
        }
        进程数量: ${status.processCount}
        `
        break
      default:
        output = `命令未找到: ${command}. 输入 'help' 查看可用命令。`
        isError = true
    }

    // 更新历史记录
    setHistory((prev) => [
      ...prev,
      {
        command: '',
        output,
        isError
      }
    ])
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  // 聚焦输入框
  const focusInput = () => {
    inputRef.current?.focus()
  }

  // 添加文件系统操作命令
  const executeFileSystemCommand = async (cmd: string, args: string[]) => {
    const webcontainer = getWebContainer()

    // 如果 WebContainer 不可用，返回 null
    if (!webcontainer) {
      return null
    }

    switch (cmd) {
      case 'ls':
        try {
          const path = args[0] || '.'
          const entries = await webcontainer.fs.readdir(path, {
            withFileTypes: true
          })

          let output = ''
          for (const entry of entries) {
            const isDir = entry.isDirectory()
            output += `${isDir ? 'd ' : '- '} ${entry.name}${
              isDir ? '/' : ''
            }\n`
          }

          return { output, isError: false }
        } catch (error) {
          return {
            output: `ls: 无法访问 '${args[0] || '.'}': ${error}`,
            isError: true
          }
        }

      case 'cat':
        try {
          if (!args[0]) {
            return { output: 'cat: 缺少文件操作数', isError: true }
          }

          const content = await webcontainer.fs.readFile(args[0], 'utf-8')
          return { output: content, isError: false }
        } catch (error) {
          return {
            output: `cat: ${args[0]}: ${error}`,
            isError: true
          }
        }

      case 'mkdir':
        try {
          if (!args[0]) {
            return { output: 'mkdir: 缺少操作数', isError: true }
          }

          await webcontainer.fs.mkdir(args[0])
          return { output: '', isError: false }
        } catch (error) {
          return {
            output: `mkdir: 无法创建目录 '${args[0]}': ${error}`,
            isError: true
          }
        }

      case 'rm':
        try {
          if (!args[0]) {
            return { output: 'rm: 缺少操作数', isError: true }
          }

          const isRecursive = args.includes('-r') || args.includes('-rf')

          if (isRecursive) {
            // 过滤掉选项参数
            const paths = args.filter((arg) => !arg.startsWith('-'))
            for (const path of paths) {
              await webcontainer.fs.rm(path, { recursive: true })
            }
          } else {
            await webcontainer.fs.rm(args[0])
          }

          return { output: '', isError: false }
        } catch (error) {
          return {
            output: `rm: 无法删除 '${args[0]}': ${error}`,
            isError: true
          }
        }

      default:
        return null // 不是文件系统命令
    }
  }

  return (
    <div className={styles.terminal} style={{ height }} onClick={focusInput}>
      <div className={styles.terminalOutput} ref={terminalRef}>
        {history.map((item, index) => (
          <div key={index}>
            {item.command && (
              <div className={styles.commandLine}>
                <span className={styles.prompt}>{currentDir} $ </span>
                <span className={styles.command}>{item.command}</span>
              </div>
            )}
            <div className={item.isError ? styles.errorOutput : styles.output}>
              {item.output}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.inputLine}>
        {!isReady ? (
          <Spin
            indicator={
              <LoadingOutlined
                style={{ fontSize: 16, color: '#0078d4' }}
                spin
              />
            }
            className={styles.terminalSpinner}
          />
        ) : (
          <>
            <span className={styles.prompt}>{currentDir} $ </span>
            <Input
              ref={inputRef}
              className={styles.terminalInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              bordered={false}
              autoFocus
              disabled={!isReady}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default Terminal
