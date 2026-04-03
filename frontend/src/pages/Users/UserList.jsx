import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
  Typography,
  Modal,
  Form,
  Switch,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { userService } from '../../services/userService';
import { ROLE_OPTIONS, ROLE_MAP } from '../../types';

const { Title } = Typography;

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({ page: 1, pageSize: 10, search: '', role: undefined });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: query.page, size: query.pageSize };
      if (query.search) params.search = query.search;
      if (query.role) params.role = query.role;
      const response = await userService.getUsers(params);
      const records = response.records || response || [];
      setUsers(Array.isArray(records) ? records : []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [query.page, query.pageSize, query.search, query.role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = (user) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      role: user.role,
      isActive: user.isActive !== false,
      fullName: user.fullName || '',
      email: user.email || '',
      organization: user.organization || '',
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await userService.updateUser(editingUser.id, values);
      message.success('用户信息已更新');
      setEditModalVisible(false);
      fetchUsers();
    } catch (error) {
      if (error.message) message.error('更新失败: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await userService.deleteUser(id);
      message.success('用户已删除');
      fetchUsers();
    } catch (error) {
      message.error('删除失败: ' + (error.message || ''));
    }
  };

  const toggleActive = async (user) => {
    try {
      await userService.updateUser(user.id, { isActive: !user.isActive });
      message.success(user.isActive ? '已停用' : '已激活');
      fetchUsers();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <span><UserOutlined style={{ marginRight: 8 }} />{text}</span>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text) => text || '--',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text) => text || '--',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => {
        const info = ROLE_MAP[role];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>{role}</Tag>;
      },
    },
    {
      title: '组织',
      dataIndex: 'organization',
      key: 'organization',
      width: 150,
      render: (text) => text || '--',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (active) => (
        <Tag color={active !== false ? 'success' : 'error'}>
          {active !== false ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 180,
      render: (t) => (t ? new Date(t).toLocaleString('zh-CN') : '--'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small">
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => toggleActive(record)}
          >
            {record.isActive !== false ? '停用' : '激活'}
          </Button>
          <Popconfirm title="确定删除该用户？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <TeamOutlined /> 用户管理
        </Title>
        <Space>
          <Input
            placeholder="搜索用户名/邮箱"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 200 }}
            value={query.search}
            onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })}
          />
          <Select
            allowClear
            placeholder="角色筛选"
            style={{ width: 120 }}
            value={query.role}
            onChange={(val) => setQuery({ ...query, role: val, page: 1 })}
          >
            {ROLE_OPTIONS.map(({ value, label }) => (
              <Select.Option key={value} value={value}>{label}</Select.Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>刷新</Button>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            onChange: (page, pageSize) => setQuery({ ...query, page, pageSize }),
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>

      <Modal
        title={`编辑用户 - ${editingUser?.username || ''}`}
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="fullName" label="姓名">
            <Input placeholder="用户姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="邮箱地址" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              {ROLE_OPTIONS.map(({ value, label }) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="organization" label="组织">
            <Input placeholder="所属组织" />
          </Form.Item>
          <Form.Item name="isActive" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserList;
