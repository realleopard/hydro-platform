import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Button, Avatar, Dropdown, Space, Typography, Spin, Card, Row, Col, Statistic, Alert } from 'antd';
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
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Loading from './components/Common/Loading';
import { taskService } from './services/taskService';
import { modelService } from './services/modelService';
import { workflowService } from './services/workflowService';
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
const VisualizationPage = React.lazy(() => import('./pages/Visualization/VisualizationPage'));
const SceneList = React.lazy(() => import('./pages/Visualization/SceneList'));
const DatasetList = React.lazy(() => import('./pages/Datasets/DatasetList'));
const DatasetDetail = React.lazy(() => import('./pages/Datasets/DatasetDetail'));
const UserList = React.lazy(() => import('./pages/Users/UserList'));
const Profile = React.lazy(() => import('./pages/Auth/Profile'));
const Register = React.lazy(() => import('./pages/Auth/Register'));
const SettingsPage = React.lazy(() => import('./pages/Settings/SettingsPage'));

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

// 管理员路由守卫
const AdminRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
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
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const allMenuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '控制台' },
    { key: '/models', icon: <AppstoreOutlined />, label: '模型管理' },
    { key: '/tasks', icon: <NodeIndexOutlined />, label: '任务管理' },
    { key: '/workflows', icon: <NodeIndexOutlined />, label: '工作流编排' },
    { key: '/visualization', icon: <BarChartOutlined />, label: '可视化' },
    { key: '/scenes', icon: <GlobalOutlined />, label: '场景管理' },
    { key: '/datasets', icon: <DatabaseOutlined />, label: '数据集管理' },
    { key: '/users', icon: <TeamOutlined />, label: '用户管理', adminOnly: true },
    { key: '/teaching', icon: <ExperimentOutlined />, label: '教学工具' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置', adminOnly: true },
  ];

  const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/models')) return '/models';
    if (path.startsWith('/tasks')) return '/tasks';
    if (path.startsWith('/workflows')) return '/workflows';
    if (path.startsWith('/visualization')) return '/visualization';
    if (path.startsWith('/scenes')) return '/scenes';
    if (path.startsWith('/datasets')) return '/datasets';
    if (path.startsWith('/users')) return '/users';
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
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={220}
        breakpoint="lg"
        collapsedWidth={window.innerWidth < 768 ? 0 : 80}
        onBreakpoint={(broken) => { if (broken && !collapsed) setCollapsed(true); }}
      >
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
              <Button type="text" icon={<BellOutlined />} />
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
const Dashboard = () => {
  const [stats, setStats] = useState({
    modelTotal: 0,
    runningTasks: 0,
    totalTasks: 0,
    workflowTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [taskStats, modelResult, workflowResult] = await Promise.all([
          taskService.getTaskStatistics(),
          modelService.getModels({ page: 1, pageSize: 1 }),
          workflowService.getWorkflows({ page: 1, pageSize: 1 }),
        ]);
        setStats({
          modelTotal: modelResult.total || 0,
          runningTasks: taskStats.running || 0,
          totalTasks: taskStats.total || 0,
          workflowTotal: workflowResult.total || 0,
        });
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard-container">
      <h1>控制台</h1>
      <p>欢迎使用流域水系统模拟模型平台</p>
      {loadError && (
        <Alert
          type="warning"
          message="部分数据加载失败"
          description="无法获取最新统计数据，请稍后刷新重试"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="模型数量"
                value={stats.modelTotal}
                prefix={<AppstoreOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="运行中任务"
                value={stats.runningTasks}
                prefix={<PlayCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="工作流"
                value={stats.workflowTotal}
                prefix={<NodeIndexOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总任务数"
                value={stats.totalTasks}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

const Teaching = () => <div className="placeholder-page"><h1>教学工具</h1><p>虚拟实验室和演示</p></div>;

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
      <Route path="/visualization" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><VisualizationPage /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/scenes" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><SceneList /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/datasets" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><DatasetList /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/datasets/:id" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><DatasetDetail /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><AdminRoute><MainLayout><React.Suspense fallback={<Loading />}><UserList /></React.Suspense></MainLayout></AdminRoute></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><Profile /></React.Suspense></MainLayout></PrivateRoute>} />
      <Route path="/register" element={<PublicRoute><React.Suspense fallback={<Loading fullscreen />}><Register /></React.Suspense></PublicRoute>} />
      <Route path="/teaching" element={<PrivateRoute><MainLayout><Teaching /></MainLayout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><MainLayout><React.Suspense fallback={<Loading />}><SettingsPage /></React.Suspense></MainLayout></PrivateRoute>} />
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
