import React, { useEffect } from 'react'
import { Button, message, Tooltip, theme } from 'antd'
import { UploadOutlined, FolderOpenOutlined } from '@ant-design/icons'
import styles from './index.module.less'
import { handleFileUpload as uploadFiles } from '../../utils/fileSystemUtils'

interface FileUploaderProps {
  onFilesUploaded: (files: File[]) => void
  collapsed?: boolean
  treeData: any[]
  fileContents: Record<string, string>
  setTreeData: React.Dispatch<React.SetStateAction<any[]>>
  setFileContents: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesUploaded,
  collapsed = false,
  treeData = [],
  fileContents = {},
  setTreeData,
  setFileContents
}) => {
  // 使用主题
  const { token } = theme.useToken()

  // 检查必要的属性是否存在
  useEffect(() => {
    if (
      typeof setTreeData !== 'function' ||
      typeof setFileContents !== 'function'
    ) {
      console.warn('FileUploader: setTreeData 或 setFileContents 不是函数', {
        setTreeData,
        setFileContents
      })
    }
  }, [setTreeData, setFileContents])

  // 处理单个文件上传
  const processFileUpload = async (files: FileList) => {
    try {
      // 确保 treeData 是数组
      const currentTreeData = Array.isArray(treeData) ? treeData : []

      // 确保 setTreeData 和 setFileContents 是函数
      if (
        typeof setTreeData !== 'function' ||
        typeof setFileContents !== 'function'
      ) {
        console.error('setTreeData 或 setFileContents 不是函数', {
          setTreeData,
          setFileContents
        })
        message.error('上传文件失败：内部错误')
        return
      }

      await uploadFiles(
        files,
        currentTreeData,
        fileContents || {},
        setTreeData,
        setFileContents
      )
      onFilesUploaded(Array.from(files))
      message.success(`成功上传 ${files.length} 个文件`)
    } catch (error) {
      console.error('上传文件时出错:', error)
      message.error('上传文件失败，请重试')
    }
  }

  // 处理文件夹上传
  const handleFolderUpload = () => {
    try {
      // 创建一个隐藏的文件输入元素
      const input = document.createElement('input')
      input.type = 'file'
      input.webkitdirectory = true // 非标准属性，允许选择文件夹
      input.directory = true // 非标准属性，允许选择文件夹
      input.id = 'file-uploader-input-folder' // 添加 ID 以便于访问
      input.multiple = true

      // 监听文件选择事件
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement
        if (target.files && target.files.length > 0) {
          await processFileUpload(target.files)
        }
      }

      // 触发文件选择对话框
      input.click()
    } catch (error) {
      console.error('上传文件夹时出错:', error)
      message.error('上传文件夹失败，请重试')
    }
  }

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processFileUpload(files)
      // 清空文件输入，以便可以再次选择相同的文件
      e.target.value = ''
    }
  }

  return (
    <div
      className={`${styles.uploaderContainer} ${
        collapsed ? styles.collapsed : ''
      }`}
      style={{
        backgroundColor: token.colorBgContainer,
        borderBottomColor: token.colorBorder
      }}
    >
      {collapsed ? (
        // 收缩状态下显示图标按钮
        <>
          <Tooltip title="上传文件" placement="right">
            <Button
              type="text"
              icon={<UploadOutlined />}
              onClick={handleFilesSelected}
              className={styles.iconButton}
            />
          </Tooltip>
          <Tooltip title="上传文件夹" placement="right">
            <Button
              type="text"
              icon={<FolderOpenOutlined />}
              onClick={handleFolderUpload}
              className={styles.iconButton}
            />
          </Tooltip>
        </>
      ) : (
        // 展开状态下显示完整按钮
        <>
          <Button
            icon={<UploadOutlined />}
            onClick={handleFilesSelected}
            className={styles.darkButton}
          >
            上传文件
          </Button>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={handleFolderUpload}
            className={styles.darkButton}
          >
            上传文件夹
          </Button>
        </>
      )}

      {/* 创建一个隐藏的文件输入元素，用于右键菜单触发 */}
      <input
        type="file"
        id="file-uploader-input"
        style={{ display: 'none' }}
        multiple
        onChange={handleFilesSelected}
      />
    </div>
  )
}

export default FileUploader
