import React from 'react';
import { Layout, Menu, Button, Badge, Avatar, Dropdown, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import styles from './AppLayout.module.css';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

/**
 * 应用布局组件
 * 提供统一的侧边栏导航和顶部头部
 */
const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const { user, logout, isAuthenticated } = useAuthStore();

  // 菜单项配置
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '控制台',
      path: '/',
    },
    {
      key: '/models',
      icon: <AppstoreOutlined />,
      label: '模型管理',
      path: '/models',
    },
    {
      key: '/tasks',
      icon: <NodeIndexOutlined />,
      label: '任务管理',
      path: '/tasks',
    },
    {
      key: '/workflows',
      icon: <NodeIndexOutlined />,
      label: '工作流编排',
      path: '/workflows',
    },
    {
      key: '/visualization',
      icon: <BarChartOutlined />,
      label: '可视化',
      path: '/visualization',
    },
    {
      key: '/teaching',
      icon: <ExperimentOutlined />,
      label: '教学工具',
      path: '/teaching',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      path: '/settings',
    },
  ];

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/models')) return '/models';
    if (path.startsWith('/tasks')) return '/tasks';
    if (path.startsWith('/workflows')) return '/workflows';
    if (path.startsWith('/visualization')) return '/visualization';
    if (path.startsWith('/teaching')) return '/teaching';
    if (path.startsWith('/settings')) return '/settings';
    return '/';
  };

  // 处理菜单点击
  const handleMenuClick = ({ key }) => {
    const menuItem = menuItems.find(item => item.key === key);
    if (menuItem) {
      navigate(menuItem.path);
    }
  };

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账号设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 左侧导航 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={220}
        className={styles.sider}
      >
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🌊</span>
          {!collapsed && <span className={styles.logoText}>Hydro Platform</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout>
        {/* 顶部导航栏 */}
        <Header className={styles.header}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={styles.collapseBtn}
          />
          <div className={styles.headerRight}>
            <Space size="large">
              {/* 通知图标 */}
              <Badge count={2} size="small">
                <Button type="text" icon={<BellOutlined />} />
              </Badge>

              {/* 用户信息 */}
              {isAuthenticated && user ? (
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                  <Space className={styles.userInfo}>
                    <Avatar icon={<UserOutlined />} src={user.avatar} />
                    {!collapsed && (
                      <Text className={styles.userName}>{user.fullName || user.username}</Text>
                    )}
                  </Space>
                </Dropdown>
              ) : (
                <Button type="primary" onClick={() => navigate('/login')}>
                  登录
                </Button>
              )}
            </Space>
          </div>
        </Header>

        {/* 主内容区 */}
        <Content className={styles.content}>
          {children}
        </Content>

        {/* 页脚 */}
        <Footer className={styles.footer}>
          <p>© 2024 Hydro Platform - 流域水系统模拟模型平台</p>
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
