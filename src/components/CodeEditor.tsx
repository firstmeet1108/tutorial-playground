import React, { useState, useEffect, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Monaco } from '@monaco-editor/react';
import { TreeView, TreeDataItem } from './tree-view';
import { FolderOpen, File, Code, Play, MonitorUp } from 'lucide-react';
import Term from './term';
import useFileSystem, { readFile, transFilesToState, writeFile } from '@/hooks/filesystem';
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
  
  .preview-container {
    background-color: #1e1e1e;
    border-left: 1px solid #3e3e42;
  }
  
  .preview-header {
    background-color: #333333;
    color: #cccccc;
    border-color: #3e3e42;
  }
`;

const CodeEditor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('// 选择一个文件开始编辑');
  const [showTerminal, setShowTerminal] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>('about:blank');
  const { files, currentPath } = useFileSystem({
    beforeServerReady: (port, url) => {
      setPreviewUrl(url);
      togglePreview();
    }
  });
  const editorRef = useRef<Monaco | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleEditorDidMount = (editor: Monaco) => {
    editorRef.current = editor;
  };

  const fileStructure = useMemo(() => {
    return transFilesToState(files);
  }, [files]);

  // 添加样式到文档
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = darkThemeStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // 根据文件变化更新预览
  useEffect(() => {
    // 可以在这里根据需要更新预览URL
    // 例如，如果编辑的是HTML文件，可以将内容转为blob URL
    if (selectedFile?.endsWith('.html')) {
      const blob = new Blob([fileContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [selectedFile, fileContent]);

  const handleFileSelect = (item: TreeDataItem | undefined) => {
    if (item && !item.children) {
      const fileId = item.id;
      setSelectedFile(fileId);
      readFile(fileId).then((content) => {
        setFileContent(content);
      });
    }
  };

  const toggleTerminal = () => {
    setShowTerminal(!showTerminal);
    editorRef.current?.layout({});
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
    editorRef.current?.layout({});
  };

  const refreshPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <div className="flex h-full code-editor-container">
      {/* 侧边栏文件树 */}
      <div className="w-64 h-full sidebar p-2 border-r overflow-auto">
        <div className="mb-2 flex items-center gap-2">
          <Code className="h-5 w-5 text-blue-400" />
          <h2 className="font-semibold text-blue-100">目录</h2>
        </div>
        <TreeView
          data={fileStructure}
          onSelectChange={handleFileSelect}
          defaultLeafIcon={() => <File className="h-4 w-4 text-gray-300" />}
          defaultNodeIcon={() => <FolderOpen className="h-4 w-4 text-gray-300" />}
        />
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 h-screen flex flex-col justify-between">
        {/* 编辑器区域 */}
        <div className="flex flex-1">
          {/* 编辑器 */}
          <div className="flex flex-col flex-1">
            <div className="h-8 editor-header flex items-center justify-between px-4 border-b">
              {selectedFile ? <span className="text-sm font-medium">{selectedFile}</span> : <span className="text-sm text-gray-400">未选择文件</span>}
              <div className="flex items-center gap-2">
                <div title="刷新预览">
                  <Play className="h-4 w-4 text-green-400 cursor-pointer" onClick={refreshPreview} />
                </div>
                <div title={showPreview ? '隐藏预览' : '显示预览'}>
                  <MonitorUp className="h-4 w-4 text-blue-400 cursor-pointer" onClick={togglePreview} />
                </div>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                onMount={handleEditorDidMount}
                language={
                  selectedFile?.endsWith('.tsx') || selectedFile?.endsWith('.ts') ? 'typescript' : selectedFile?.endsWith('.json') ? 'json' : selectedFile?.endsWith('.css') ? 'css' : 'javascript'
                }
                theme="vs-dark"
                value={fileContent}
                onChange={(value) => {
                  setFileContent(value || '');
                  if (selectedFile) {
                    const newPath = `${currentPath}/${selectedFile}`;
                    writeFile(newPath, value || '');
                  }
                }}
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
                  automaticLayout: true
                }}
              />
            </div>
          </div>

          {/* 预览区域 */}
          {showPreview && (
            <div className="flex flex-col w-1/2 preview-container">
              <div className="h-8 preview-header flex items-center justify-between px-4 border-b">
                <span className="text-sm font-medium">预览</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe ref={iframeRef} src={previewUrl} className="w-full h-full border-none" title="预览" sandbox="allow-same-origin allow-scripts allow-forms" />
              </div>
            </div>
          )}
        </div>

        {/* 使用封装的 Term 组件 */}
        <div>
          <Term show={showTerminal} onToggle={toggleTerminal} />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
