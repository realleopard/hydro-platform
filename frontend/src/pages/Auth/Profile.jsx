import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Modal, Form, Input, Avatar, message, Upload, Row, Col } from 'antd';
import { UserOutlined, EditOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { ROLE_MAP } from '../../types';

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await userService.updateUser(user.id, values);
      updateUser({ ...user, ...values });
      message.success('资料已更新');
      setEditModalVisible(false);
    } catch (error) {
      if (error.message) message.error('更新失败: ' + error.message);
    }
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的密码不一致');
        return;
      }
      await userService.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success('密码已修改');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      if (error.message) message.error('修改失败: ' + error.message);
    }
  };

  const openEditModal = () => {
    editForm.setFieldsValue({
      fullName: user.fullName || user.realName || '',
      email: user.email || '',
      organization: user.organization || '',
    });
    setEditModalVisible(true);
  };

  const roleInfo = ROLE_MAP[user.role];

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
          <Avatar size={80} icon={<UserOutlined />} src={user.avatarUrl || user.avatar} />
          <div>
            <h2 style={{ margin: 0 }}>{user.fullName || user.realName || user.username}</h2>
            <p style={{ margin: '4px 0 0', color: '#888' }}>
              @{user.username}
              {roleInfo && <span> · {roleInfo.label}</span>}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Space>
              <Button icon={<EditOutlined />} onClick={openEditModal}>编辑资料</Button>
              <Button icon={<LockOutlined />} onClick={() => setPasswordModalVisible(true)}>修改密码</Button>
            </Space>
          </div>
        </div>

        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user.email || '--'}</Descriptions.Item>
          <Descriptions.Item label="姓名">{user.fullName || user.realName || '--'}</Descriptions.Item>
          <Descriptions.Item label="角色">
            {roleInfo ? <span style={{ color: roleInfo.color }}>{roleInfo.label}</span> : user.role}
          </Descriptions.Item>
          <Descriptions.Item label="组织">{user.organization || '--'}</Descriptions.Item>
          <Descriptions.Item label="注册时间">
            {user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '--'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 编辑资料弹窗 */}
      <Modal
        title="编辑个人资料"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="fullName" label="姓名">
            <Input placeholder="您的姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="邮箱地址" />
          </Form.Item>
          <Form.Item name="organization" label="组织">
            <Input placeholder="所属组织" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onOk={handleChangePassword}
        onCancel={() => { setPasswordModalVisible(false); passwordForm.resetFields(); }}
        okText="确认修改"
        cancelText="取消"
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password placeholder="输入当前密码" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少6位' },
          ]}>
            <Input.Password placeholder="输入新密码" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认新密码" rules={[{ required: true, message: '请确认密码' }]}>
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
