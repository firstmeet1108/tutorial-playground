import React from 'react'
import { Button, Dropdown, Space, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import {
  PlusOutlined,
  SettingOutlined,
  CodeOutlined,
  FileOutlined,
  FolderOutlined,
  UploadOutlined
} from '@ant-design/icons'
import styles from './index.module.less'

interface TopBarProps {
  onNewTerminal: () => void
  onNewFile: () => void
  onNewFolder: () => void
  onUploadFile: () => void
}

const TopBar: React.FC<TopBarProps> = ({
  onNewTerminal,
  onNewFile,
  onNewFolder,
  onUploadFile
}) => {
  // 新建菜单项
  const newItems: MenuProps['items'] = [
    {
      key: 'file',
      label: '文件',
      icon: <FileOutlined />,
      onClick: onNewFile
    },
    {
      key: 'folder',
      label: '文件夹',
      icon: <FolderOutlined />,
      onClick: onNewFolder
    },
    {
      key: 'terminal',
      label: '终端',
      icon: <CodeOutlined />,
      onClick: onNewTerminal
    },
    {
      type: 'divider'
    },
    {
      key: 'upload',
      label: '上传文件',
      icon: <UploadOutlined />,
      onClick: onUploadFile
    }
  ]

  return (
    <div className={styles.topBar}>
      <div className={styles.logo}>
        <CodeOutlined /> 代码编辑器
      </div>
      <div className={styles.actions}>
        <Dropdown menu={{ items: newItems }} placement="bottomRight">
          <Button type="text" icon={<PlusOutlined />}>
            新建
          </Button>
        </Dropdown>
        <Tooltip title="设置">
          <Button type="text" icon={<SettingOutlined />} />
        </Tooltip>
      </div>
    </div>
  )
}

export default TopBar
