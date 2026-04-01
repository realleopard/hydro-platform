import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Badge, Button, Avatar, Dropdown, Space, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
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
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Loading from './components/Common/Loading';
import './App.css';

// 懒加载页面组件
const Login = React.lazy(() => import('./pages/Auth/Login'));
const ModelList = React.lazy(() => import('./pages/Models/ModelList'));
const ModelDetail = React.lazy(() => import('./pages/Models/ModelDetail'));
const ModelCreate = React.lazy(() => import('./pages/Models/ModelCreate'));
const TaskList = React.lazy(() => import('./pages/Tasks/TaskList'));
const TaskDetail = React.lazy(() => import('./pages/Tasks/TaskDetail'));
const WorkflowList = React.lazy(() => import('./pages/Workflows/WorkflowList'));
const WorkflowDetail = React.lazy(() => import('./pages/Workflows/WorkflowDetail'));
const WorkflowEditorPage = React.lazy(() => import('./pages/Workflows/WorkflowEditorPage'));

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

// 路由守卫组件 - 需要登录
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading, fetchCurrentUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      fetchCurrentUser();
    }
  }, [isAuthenticated, isLoading, fetchCurrentUser]);

  if (isLoading) {
    return <Loading fullscreen tip="正在验证登录状态..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// 公开路由（已登录用户重定向到首页）
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// 导航菜单组件
const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '控制台' },
    { key: '/models', icon: <AppstoreOutlined />, label: '模型管理' },
    { key: '/tasks', icon: <NodeIndexOutlined />, label: '任务管理' },
    { key: '/workflows', icon: <NodeIndexOutlined />, label: '工作流编排' },
    { key: '/visualization', icon: <BarChartOutlined />, label: '可视化' },
    { key: '/teaching', icon: <ExperimentOutlined />, label: '教学工具' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  ];

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

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ borderRight: 0 }}
    />
  );
};

// 主布局组件
const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心', onClick: () => navigate('/profile') },
    { key: 'settings', icon: <SettingOutlined />, label: '账号设置', onClick: () => navigate('/settings') },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login'); } },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={220}>
        <div className="logo">
          <span className="logo-icon">🌊</span>
          {!collapsed && <span className="logo-text">Hydro Platform</span>}
        </div>
        <Navigation />
      </Sider>

      <Layout>
        <Header className="app-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-btn"
          />
          <div className="header-right">
            <Space size="large">
              <Badge count={2} size="small">
                <Button type="text" icon={<BellOutlined />} />
              </Badge>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar icon={<UserOutlined />} src={user?.avatar} />
                  {!collapsed && <Text>{user?.fullName || user?.username}</Text>}
                </Space>
              </Dropdown>
            </Space>
          </div>
        </Header>

        <Content className="app-content">
          {children}
        </Content>

        <Footer className="app-footer">
          <p>© 2024 Hydro Platform - 流域水系统模拟模型平台</p>
        </Footer>
      </Layout>
    </Layout>
  );
};

// 控制台首页
const Dashboard = () => (
  <div className="dashboard-container">
    <h1>控制台</h1>
    <p>欢迎使用流域水系统模拟模型平台</p>
    <div className="dashboard-stats">
      <div className="stat-card"><h3>模型数量</h3><div className="stat-value">24</div></div>
      <div className="stat-card"><h3>运行中任务</h3><div className="stat-value">3</div></div>
      <div className="stat-card"><h3>工作流</h3><div className="stat-value">12</div></div>
      <div className="stat-card"><h3>数据集</h3><div className="stat-value">156</div></div>
    </div>
  </div>
);

const Visualization = () => <div className="placeholder-page"><h1>可视化</h1><p>3D 数字孪生可视化</p></div>;
const Teaching = () => <div className="placeholder-page"><h1>教学工具</h1><p>虚拟实验室和演示</p></div>;
const Settings = () => <div className="placeholder-page"><h1>系统设置</h1><p>系统配置和管理</p></div>;

// 应用内容
const AppContent = () => {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><React.Suspense fallback={<Loading fullscreen />}><Login /></React.Suspense></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><Dashboard /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/models" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><ModelList /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/models/create" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><ModelCreate /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/models/:id" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><ModelDetail /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><TaskList /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/tasks/:id" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><TaskDetail /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/workflows" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><WorkflowList /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/workflows/create" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><WorkflowEditorPage /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/workflows/:id" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><WorkflowDetail /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/workflows/:id/edit" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><WorkflowEditorPage /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/visualization" element={<PrivateRoute><MainLayout><Visualization /></MainLayout></PrivateRoute>} />
      <Route path="/teaching" element={<PrivateRoute><MainLayout><Teaching /></MainLayout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><MainLayout><Settings /></MainLayout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <ErrorBoundary>
        <Router>
          <AppContent />
        </Router>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;
