import React, { useEffect, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { TerminalIcon, XIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import useTabList from '@/hooks/tabList';

interface TermProps {
  show: boolean;
  className?: string;
  onToggle: () => void;
  style?: React.CSSProperties;
}

const Term: React.FC<TermProps> = ({ show, onToggle, className, style }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const { tabs, activeTabIndex, closeTab, generateShell, setActiveTabIndex } = useTabList();

  // 初始化终端标签页
  useEffect(() => {
    if (!show) return;

    // 如果没有标签页，创建一个
    if (tabs.length === 0) {
      generateShell();
      return;
    }

    const activeTab = tabs[activeTabIndex];
    if (!activeTab || !activeTab.terminal) return;

    const term = activeTab.terminal;
    const terminalRef = document.getElementById(activeTab.id);

    if (!terminalRef) return;

    term.open(terminalRef);

    // 窗口大小变化时调整终端大小
    const resizeListener = () => {
      activeTab?.fitAddon?.fit();
    };
    resizeListener();
    window.addEventListener('resize', resizeListener);

    return () => {
      window.removeEventListener('resize', resizeListener);
    };
  }, [show, tabs, activeTabIndex]);

  // 清理不再使用的终端
  useEffect(() => {
    return () => {
      tabs.forEach((tab) => {
        if (tab.terminal) {
          tab.terminal.dispose();
        }
      });
    };
  }, []);

  if (!show) {
    return (
      <div className={cn('terminal-container', className)} style={style}>
        <div className="h-8 terminal-header flex items-center justify-between px-4 cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium">终端</span>
          </div>
          <span className="text-xs text-gray-400">点击展开</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('terminal-container', className)} style={style} ref={terminalContainerRef}>
      <div className="h-8 terminal-header flex items-center justify-between px-4">
        <div className="flex items-center gap-2 flex-grow overflow-x-auto">
          {tabs.map((tab, index) => (
            <div
              key={index}
              className={cn('flex items-center gap-1 px-3 py-1 text-xs rounded cursor-pointer hover:bg-gray-700', activeTabIndex === index ? 'bg-gray-700' : '')}
              onClick={() => setActiveTabIndex(index)}
            >
              <span>{tab.name}</span>
              <XIcon className="h-3 w-3 text-gray-400 hover:text-white" onClick={() => closeTab(index)} />
            </div>
          ))}
          <div className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-gray-700 cursor-pointer" onClick={() => generateShell()}>
            <Plus className="h-3 w-3" />
          </div>
        </div>
        <span className="text-xs text-gray-400 cursor-pointer" onClick={onToggle}>
          点击收起
        </span>
      </div>
      <div className="relative h-64">
        {tabs.map((tab, index) => (
          <div id={tab.id} key={tab.id} className={`w-full h-full ${index === activeTabIndex ? '' : 'hidden'}`}></div>
        ))}
      </div>
    </div>
  );
};

export default Term;
