import { useRef } from 'react'
import Editor from '@monaco-editor/react'
import styles from './index.module.less'
import { useState } from 'react'
import type { MenuProps } from 'antd'
import { Layout, Tree } from 'antd'
import { treeData } from '@/data/index.tsx'

const { Sider } = Layout

type MenuItem = Required<MenuProps>['items'][number]

export default function HomePage() {
  const [collapsed, setCollapsed] = useState(false)

  const editorRef = useRef(null)

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor
  }

  const onSelect = (selectedKeys: React.Key[], info: any) => {
    console.log('selected', selectedKeys, info)
  }
  return (
    <>
      <Layout className={styles.layout}>
        <Sider>
          <Tree
            showLine
            showIcon
            defaultExpandedKeys={['0-0-0']}
            onSelect={onSelect}
            treeData={treeData}
          />
        </Sider>
        <Layout>
          <Editor></Editor>
        </Layout>
      </Layout>
    </>
  )
}
