import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { TerminalIcon } from 'lucide-react';

// 终端主题配置
const terminalTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#aeafad',
  cursorAccent: '#1e1e1e',
  selection: 'rgba(255, 255, 255, 0.3)',
  black: '#000000',
  red: '#e06c75',
  green: '#98c379',
  yellow: '#e5c07b',
  blue: '#61afef',
  magenta: '#c678dd',
  cyan: '#56b6c2',
  white: '#d4d4d4',
  brightBlack: '#808080',
  brightRed: '#f44747',
  brightGreen: '#b5cea8',
  brightYellow: '#dcdcaa',
  brightBlue: '#569cd6',
  brightMagenta: '#c586c0',
  brightCyan: '#9cdcfe',
  brightWhite: '#ffffff'
};

// 示例文件内容，用于 cat 命令
const fileContents: Record<string, string> = {
  'App.tsx': `import React from 'react';
import CodeEditor from './components/CodeEditor';

function App() {
  return (
    <div className="h-screen">
      <CodeEditor />
    </div>
  );
}

export default App;`,
  'package.json': `{
  "name": "code-editor-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}`
};

interface TermProps {
  show: boolean;
  onToggle: () => void;
}

const Term: React.FC<TermProps> = ({ show, onToggle }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);

  // 处理终端命令
  const handleCommand = (command: string, term: Terminal) => {
    const cmd = command.trim();
    
    if (!cmd) return;
    
    switch (cmd) {
      case 'help':
        term.writeln('可用命令:');
        term.writeln('  help - 显示帮助信息');
        term.writeln('  clear - 清空终端');
        term.writeln('  ls - 列出文件');
        term.writeln('  cat [文件名] - 显示文件内容');
        term.writeln('  echo [文本] - 输出文本');
        term.writeln('  date - 显示当前日期');
        break;
      case 'clear':
        term.clear();
        break;
      case 'ls':
        term.writeln('src/');
        term.writeln('public/');
        term.writeln('package.json');
        term.writeln('tsconfig.json');
        break;
      case 'date':
        term.writeln(new Date().toLocaleString());
        break;
      default:
        if (cmd.startsWith('echo ')) {
          term.writeln(cmd.substring(5));
        } else if (cmd.startsWith('cat ')) {
          const fileName = cmd.substring(4).trim();
          if (fileContents[fileName]) {
            term.writeln(fileContents[fileName]);
          } else {
            term.writeln(`错误: 文件 '${fileName}' 不存在`);
          }
        } else {
          term.writeln(`命令未找到: ${cmd}`);
          term.writeln('输入 "help" 获取可用命令列表');
        }
    }
  };

  // 初始化终端
  useEffect(() => {
    if (terminalRef.current && !terminalInstance.current && show) {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "'Fira Code', 'Consolas', monospace",
        theme: terminalTheme
      });
      
      term.open(terminalRef.current);
      term.writeln('欢迎使用终端控制台！');
      term.writeln('输入 "help" 获取可用命令列表');
      term.writeln('');
      term.write('$ ');
      
      // 处理用户输入
      let commandBuffer = '';
      term.onData(data => {
        switch (data) {
          case '\r': // 回车键
            term.writeln('');
            handleCommand(commandBuffer, term);
            commandBuffer = '';
            term.write('$ ');
            break;
          case '\u007F': // 退格键
            if (commandBuffer.length > 0) {
              commandBuffer = commandBuffer.substring(0, commandBuffer.length - 1);
              term.write('\b \b');
            }
            break;
          default:
            commandBuffer += data;
            term.write(data);
        }
      });
      
      terminalInstance.current = term;
    }
    
    return () => {
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
        terminalInstance.current = null;
      }
    };
  }, [show]);

  return (
    <div className="terminal-container">
      <div className="h-8 terminal-header flex items-center justify-between px-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium">终端</span>
        </div>
        <span className="text-xs text-gray-400">
          {show ? '点击收起' : '点击展开'}
        </span>
      </div>
      {show && (
        <div className="h-64 overflow-hidden" ref={terminalRef}></div>
      )}
    </div>
  );
};

export default Term; 