<<<<<<< Updated upstream
import { useRef } from 'react';
import Editor from '@monaco-editor/react';
import styles from './index.module.less';
import { useState } from 'react';
import {
  FileOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme } from 'antd';

const { Header, Content, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const items: MenuItem[] = [
  {
    label: 'Files',
    key: '1',
    icon: <FileOutlined />,
  } as MenuItem,
];


export default function HomePage() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();


  const editorRef = useRef(null);

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
  }

  function showValue() {
    alert(editorRef.current.getValue());
  } 
  return (
    <>
      <Layout className={styles.layout}>
        <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" items={items} />
        </Sider>
        <Layout>
          <Header style={{ padding: 0, background: colorBgContainer }} />
          <Content style={{ margin: '0 16px' }}>
            <Breadcrumb style={{ margin: '16px 0' }}>
              <Breadcrumb.Item>User</Breadcrumb.Item>
              <Breadcrumb.Item>Bill</Breadcrumb.Item>
            </Breadcrumb>
            <div
              style={{
                padding: 24,
                minHeight: 360,
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
              }}
            >
            Bill is a cat.
            </div>
          </Content>
        </Layout>
      </Layout>
    </>
  );
}
=======
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

  function showValue() {
    alert(editorRef.current.getValue())
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
>>>>>>> Stashed changes
