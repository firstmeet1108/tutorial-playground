import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { TreeView, TreeDataItem } from './tree-view';
import { Folder, File, Code } from 'lucide-react';
import Term from './term';

// 添加深色主题样式
const darkThemeStyles = `
  .code-editor-container {
    background-color: #1e1e1e;
    color: #d4d4d4;
  }
  
  .sidebar {
    background-color: #252526;
    color: #cccccc;
    border-color: #3e3e42;
  }
  
  .editor-header {
    background-color: #333333;
    color: #cccccc;
    border-color: #3e3e42;
  }
  
  .terminal-container {
    background-color: #1e1e1e;
    border-top: 1px solid #3e3e42;
  }
  
  .terminal-header {
    background-color: #333333;
    color: #cccccc;
    border-color: #3e3e42;
  }
  
  .xterm .xterm-viewport {
    background-color: #1e1e1e !important;
  }
`;

// 示例文件结构数据
const fileStructure: TreeDataItem[] = [
  {
    id: 'src',
    name: 'src',
    icon: () => <Folder className="h-4 w-4 text-blue-300" />,
    openIcon: () => <Folder className="h-4 w-4 text-blue-300" />,
    children: [
      {
        id: 'components',
        name: 'components',
        icon: () => <Folder className="h-4 w-4 text-blue-300" />,
        openIcon: () => <Folder className="h-4 w-4 text-blue-300" />,
        children: [
          {
            id: 'tree-view.tsx',
            name: 'tree-view.tsx',
            icon: () => <File className="h-4 w-4 text-green-300" />,
          },
          {
            id: 'CodeEditor.tsx',
            name: 'CodeEditor.tsx',
            icon: () => <File className="h-4 w-4 text-green-300" />,
          },
          {
            id: 'term.tsx',
            name: 'term.tsx',
            icon: () => <File className="h-4 w-4 text-green-300" />,
          }
        ]
      },
      {
        id: 'App.tsx',
        name: 'App.tsx',
        icon: () => <File className="h-4 w-4 text-green-300" />,
      },
      {
        id: 'main.tsx',
        name: 'main.tsx',
        icon: () => <File className="h-4 w-4 text-green-300" />,
      },
      {
        id: 'index.css',
        name: 'index.css',
        icon: () => <File className="h-4 w-4 text-purple-300" />,
      }
    ]
  },
  {
    id: 'public',
    name: 'public',
    icon: () => <Folder className="h-4 w-4 text-blue-300" />,
    openIcon: () => <Folder className="h-4 w-4 text-blue-300" />,
    children: [
      {
        id: 'index.html',
        name: 'index.html',
        icon: () => <File className="h-4 w-4 text-orange-300" />,
      }
    ]
  },
  {
    id: 'package.json',
    name: 'package.json',
    icon: () => <File className="h-4 w-4 text-yellow-300" />,
  },
  {
    id: 'tsconfig.json',
    name: 'tsconfig.json',
    icon: () => <File className="h-4 w-4 text-yellow-300" />,
  }
];

// 示例文件内容
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
  'main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  'index.css': `@import "tailwindcss";

/* 深色主题样式 */
:root {
  --background: #1e1e1e;
  --foreground: #d4d4d4;
  --sidebar-bg: #252526;
  --sidebar-fg: #cccccc;
  --header-bg: #333333;
}`,
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

const CodeEditor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('// 选择一个文件开始编辑');
  const [showTerminal, setShowTerminal] = useState<boolean>(true);

  // 添加样式到文档
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = darkThemeStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleFileSelect = (item: TreeDataItem | undefined) => {
    if (item && !item.children) {
      const fileId = item.id;
      setSelectedFile(fileId);
      setFileContent(fileContents[fileId] || `// ${fileId} 的内容未定义`);
    }
  };

  const toggleTerminal = () => {
    setShowTerminal(!showTerminal);
  };

  return (
    <div className="flex h-full code-editor-container">
      {/* 侧边栏文件树 */}
      <div className="w-64 h-full sidebar p-2 border-r overflow-auto">
        <div className="mb-2 flex items-center gap-2">
          <Code className="h-5 w-5 text-blue-400" />
          <h2 className="font-semibold text-blue-100">文件浏览器</h2>
        </div>
        <TreeView 
          data={fileStructure} 
          onSelectChange={handleFileSelect}
          defaultLeafIcon={() => <File className="h-4 w-4 text-gray-300" />}
          defaultNodeIcon={() => <Folder className="h-4 w-4 text-gray-300" />}
        />
      </div>
      
      {/* 主内容区域 */}
      <div className="flex-1 h-full flex flex-col">
        {/* 编辑器区域 */}
        <div className="flex-1 flex flex-col">
          <div className="h-8 editor-header flex items-center px-4 border-b">
            {selectedFile ? (
              <span className="text-sm font-medium">
                {selectedFile}
              </span>
            ) : (
              <span className="text-sm text-gray-400">未选择文件</span>
            )}
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={selectedFile?.endsWith('.tsx') || selectedFile?.endsWith('.ts') ? 'typescript' : 
                      selectedFile?.endsWith('.json') ? 'json' : 
                      selectedFile?.endsWith('.css') ? 'css' : 'javascript'}
              theme="vs-dark"
              value={fileContent}
              onChange={(value) => setFileContent(value || '')}
              options={{
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontSize: 14,
                tabSize: 2,
                fontFamily: "'Fira Code', 'Consolas', monospace",
                fontLigatures: true,
                renderLineHighlight: 'all',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                contextmenu: true,
                formatOnPaste: true,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
        
        {/* 使用封装的 Term 组件 */}
        <Term show={showTerminal} onToggle={toggleTerminal} />
      </div>
    </div>
  );
};

export default CodeEditor; 