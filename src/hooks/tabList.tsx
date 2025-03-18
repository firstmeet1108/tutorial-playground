import { WebContainerProcess } from '@webcontainer/api';
import webcontainerInstance from '@/lib/webcontainer';
import { useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { v4 as uuidv4 } from 'uuid';

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

interface TerminalTab {
  id: string;
  name: string;
  process: WebContainerProcess;
  terminal: Terminal;
  commandBuffer: string;
  fitAddon: FitAddon;
}

export default function useTabList() {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);

  const generateShell = async (name: string = `终端`) => {
    const id = uuidv4();
    const terminal = new Terminal({
      convertEol: true,
      fontSize: 14,
      fontFamily: 'Fira Code, Consolas, monospace',
      theme: terminalTheme,
      allowTransparency: true,
      rows: 15
    });
    const process = await webcontainerInstance.spawn('jsh', {
      terminal: {
        cols: terminal.cols,
        rows: terminal.rows
      }
    });
    const fitAddon = new FitAddon();

    const internal = {
      id,
      name,
      process,
      terminal,
      commandBuffer: '',
      fitAddon
    };
    // 绑定 shell 进程的输出
    try {
      const shellProcess = internal.process;
      if (!shellProcess) return;

      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            internal.terminal?.write(data);
            internal.fitAddon?.fit();
          }
        })
      );

      const input = shellProcess.input.getWriter();
      internal.terminal.onData((data) => {
        input.write(data);
        internal.fitAddon?.fit();
      });
    } catch (error) {
      console.error('Terminal process error:', error);
    }

    setTabs((prev) => [...prev, internal]);

    return internal;
  };

  const closeTab = (index: number) => {
    setTabs((prev) => prev.filter((_, i) => i !== index));
  };

  const changeTab = (index: number) => {
    if (index < 0 || index >= tabs.length) throw new Error('Invalid tab index');
    if (index === activeTabIndex) return;
    setActiveTabIndex(index);
  };

  return {
    tabs,
    setTabs,
    generateShell,
    activeTabIndex,
    setActiveTabIndex,
    closeTab,
    changeTab
  };
}
