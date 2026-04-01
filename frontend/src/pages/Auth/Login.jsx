import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Checkbox,
  message,
  Typography,
  Space,
  Divider,
  Alert,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import styles from './Login.module.css';

const { Title, Text } = Typography;

/**
 * 登录页面
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isAuthenticated, error, clearError } = useAuthStore();

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // 加载记住的用户名
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      form.setFieldsValue({ username: savedUsername });
      setRememberMe(true);
    }
  }, [form]);

  // 处理登录
  const handleSubmit = async (values) => {
    setLoading(true);
    clearError();

    try {
      const success = await login(values.username, values.password);

      if (success) {
        message.success('登录成功');

        // 记住用户名
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', values.username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }

        // 重定向到原页面或首页
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        message.error(error || '登录失败');
      }
    } catch (err) {
      message.error(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <div className={styles.wave}></div>
        <div className={styles.wave}></div>
        <div className={styles.wave}></div>
      </div>

      <Card className={styles.loginCard} bordered={false}>
        <div className={styles.header}>
          <div className={styles.logo}>🌊</div>
          <Title level={3} className={styles.title}>
            流域水系统模拟模型平台
          </Title>
          <Text type="secondary">Hydro Platform</Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={clearError}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined className={styles.inputIcon} />}
              placeholder="用户名"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className={styles.inputIcon} />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <div className={styles.options}>
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              >
                记住我
              </Checkbox>
              <Link to="/forgot-password" className={styles.forgotLink}>
                忘记密码？
              </Link>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              className={styles.loginBtn}
            >
              登录
            </Button>
          </Form.Item>

          <Divider plain>或</Divider>

          <div className={styles.register}>
            <Text type="secondary">还没有账号？</Text>
            <Link to="/register" className={styles.registerLink}>
              立即注册
            </Link>
          </div>
        </Form>

        <div className={styles.footer}>
          <Space direction="vertical" size="small" align="center">
            <Text type="secondary" className={styles.footerText}>
              © 2024 Hydro Platform
            </Text>
            <Space size="large">
              <Link to="/help" className={styles.footerLink}>帮助中心</Link>
              <Link to="/privacy" className={styles.footerLink}>隐私政策</Link>
              <Link to="/terms" className={styles.footerLink}>服务条款</Link>
            </Space>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Login;
