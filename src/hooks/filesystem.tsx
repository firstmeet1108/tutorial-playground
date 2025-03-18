import { useState, useEffect, useRef, JSX } from 'react';
import { initFiles } from '@/constant/initFiles';
import type { FileSystemTree, DirEnt, FileSystemAPI } from '@webcontainer/api';
import webcontainerInstance from '@/lib/webcontainer';
import { File, FolderClosed, FolderOpen } from 'lucide-react';

const ignoreFiles = ['node_modules', 'dist'];

interface UseFileSystemProps {
  beforeFilesChange?: (entries: DirEnt<string>[], fs: FileSystemAPI) => void;
  beforeServerReady?: (port: number, url: string) => void;
}

function useFileSystem({ beforeFilesChange, beforeServerReady }: UseFileSystemProps = {}) {
  const isInit = useRef(false);
  const [files, setFiles] = useState<FileSystemTree>(initFiles);
  const [currentPath, setCurrentPath] = useState<string>('/');

  useEffect(() => {
    if (isInit.current) {
      return;
    }
    webcontainerInstance.fs.watch('/', { recursive: true }, async () => {
      try {
        const newFiles = await readDirectoryRecursive('/');
        setFiles(newFiles);
      } catch (error) {
        console.error('Failed to update files:', error);
      }
    });

    webcontainerInstance.on('server-ready', (port, url) => {
      beforeServerReady?.(port, url);
    });

    isInit.current = true;
  }, []);

  async function readDirectoryRecursive(path: string): Promise<FileSystemTree> {
    const entries = await webcontainerInstance.fs.readdir(path, { withFileTypes: true });
    const result: FileSystemTree = {};
    beforeFilesChange?.(entries, webcontainerInstance.fs);

    for (const entry of entries) {
      const fullPath = `${path}/${entry.name}`.replace(/\/+/g, '/');
      if (ignoreFiles.includes(entry.name)) {
        continue;
      }
      if (entry.isDirectory()) {
        const res = await readDirectoryRecursive(fullPath);
        result[entry.name] = { directory: res };
      } else {
        const content = await webcontainerInstance.fs.readFile(fullPath, 'utf-8');
        result[entry.name] = { file: { contents: content } };
      }
    }

    return result;
  }

  return { files, setFiles, currentPath, setCurrentPath, readFile };
}

export async function readFile(path: string) {
  try {
    const content = await webcontainerInstance.fs.readFile(path, 'utf-8');
    return content;
  } catch (error) {
    console.error('读取文件失败:', error);
    throw error;
  }
}

export async function writeFile(path: string, content: string) {
  await webcontainerInstance.fs.writeFile(path, content);
}

interface TreeDataItem {
  id: string;
  name: string;
  icon: () => JSX.Element;
  openIcon?: () => JSX.Element;
  children?: TreeDataItem[];
  isDirectory?: boolean;
}

export function transFilesToState(files: FileSystemTree, parentPath: string = ''): TreeDataItem[] {
  return Object.entries(files)
    .map(([name, value]): TreeDataItem => {
      const currentPath = `${parentPath}/${name}`.replace(/^\//, '');
      const isDirectory = !('file' in value);

      // 根据文件扩展名选择图标颜色
      const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
          case 'tsx':
          case 'ts':
            return () => <File className="h-4 w-4 text-green-300 mr-2" />;
          case 'css':
            return () => <File className="h-4 w-4 text-purple-300 mr-2" />;
          case 'html':
            return () => <File className="h-4 w-4 text-orange-300 mr-2" />;
          case 'json':
            return () => <File className="h-4 w-4 text-yellow-300 mr-2" />;
          default:
            return () => <File className="h-4 w-4 text-gray-300 mr-2" />;
        }
      };

      if (isDirectory) {
        return {
          id: currentPath,
          name: name,
          icon: () => <FolderClosed className="h-4 w-4 text-blue-300 mr-2" />,
          openIcon: () => <FolderOpen className="h-4 w-4 text-blue-300 mr-2" />,
          children: transFilesToState(value.directory as unknown as FileSystemTree, currentPath),
          isDirectory: true
        };
      } else {
        return {
          id: currentPath,
          name: name,
          icon: getFileIcon(name),
          isDirectory: false
        };
      }
    })
    .sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
}

export default useFileSystem;
