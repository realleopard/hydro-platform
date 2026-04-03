import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text } = Typography;

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await register({
        username: values.username,
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        organization: values.organization,
      });
      message.success('注册成功，请登录');
      navigate('/login');
    } catch (error) {
      message.error('注册失败: ' + (error.message || '请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: 0 }}>创建账户</Title>
          <Text type="secondary">流域水系统模拟模型平台</Text>
        </div>

        <Form form={form} onFinish={handleSubmit} layout="vertical" size="large">
          <Form.Item name="username" rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: '只允许字母、数字和下划线' },
          ]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item name="email" rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱" />
          </Form.Item>

          <Form.Item name="fullName">
            <Input prefix={<UserOutlined />} placeholder="姓名（可选）" />
          </Form.Item>

          <Form.Item name="organization">
            <Input prefix={<BankOutlined />} placeholder="所属组织（可选）" />
          </Form.Item>

          <Form.Item name="password" rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6位' },
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item name="confirmPassword" dependencies={['password']} rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('两次密码不一致'));
              },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">已有账户？ <Link to="/login">立即登录</Link></Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
