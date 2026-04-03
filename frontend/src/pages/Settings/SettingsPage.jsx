import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Tag, Typography, Button, message } from 'antd';
import {
  SafetyCertificateOutlined,
  AuditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ROLE_OPTIONS } from '../../types';
import PageHeader from '../../components/Common/PageHeader';

const { TabPane } = Tabs;

const PERMISSION_GROUPS = [
  {
    group: '用户管理',
    permissions: [
      { code: 'user:create', name: '创建用户', action: 'CREATE' },
      { code: 'user:read', name: '查看用户', action: 'READ' },
      { code: 'user:update', name: '编辑用户', action: 'UPDATE' },
      { code: 'user:delete', name: '删除用户', action: 'DELETE' },
    ],
  },
  {
    group: '模型管理',
    permissions: [
      { code: 'model:create', name: '创建模型', action: 'CREATE' },
      { code: 'model:read', name: '查看模型', action: 'READ' },
      { code: 'model:update', name: '编辑模型', action: 'UPDATE' },
      { code: 'model:delete', name: '删除模型', action: 'DELETE' },
      { code: 'model:execute', name: '执行模型', action: 'EXECUTE' },
    ],
  },
  {
    group: '工作流',
    permissions: [
      { code: 'workflow:create', name: '创建工作流', action: 'CREATE' },
      { code: 'workflow:read', name: '查看工作流', action: 'READ' },
      { code: 'workflow:update', name: '编辑工作流', action: 'UPDATE' },
      { code: 'workflow:delete', name: '删除工作流', action: 'DELETE' },
      { code: 'workflow:execute', name: '执行工作流', action: 'EXECUTE' },
    ],
  },
  {
    group: '任务管理',
    permissions: [
      { code: 'task:read', name: '查看任务', action: 'READ' },
      { code: 'task:cancel', name: '取消任务', action: 'EXECUTE' },
      { code: 'task:delete', name: '删除任务', action: 'DELETE' },
    ],
  },
  {
    group: '数据集',
    permissions: [
      { code: 'dataset:create', name: '创建数据集', action: 'CREATE' },
      { code: 'dataset:read', name: '查看数据集', action: 'READ' },
      { code: 'dataset:update', name: '编辑数据集', action: 'UPDATE' },
      { code: 'dataset:delete', name: '删除数据集', action: 'DELETE' },
    ],
  },
  {
    group: '系统管理',
    permissions: [
      { code: 'system:admin', name: '系统管理', action: 'ADMIN' },
    ],
  },
];

const ROLE_PERMISSIONS = {
  admin: PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.code)),
  expert: [
    'user:read', 'model:create', 'model:read', 'model:update', 'model:delete', 'model:execute',
    'workflow:create', 'workflow:read', 'workflow:update', 'workflow:delete', 'workflow:execute',
    'task:read', 'task:cancel', 'task:delete',
    'dataset:create', 'dataset:read', 'dataset:update',
  ],
  user: [
    'model:read', 'workflow:read', 'task:read', 'dataset:read', 'dataset:create',
    'model:execute',
  ],
  student: [
    'model:read', 'workflow:read', 'task:read', 'dataset:read',
  ],
};

const ACTION_COLORS = {
  CREATE: 'green',
  READ: 'blue',
  UPDATE: 'orange',
  DELETE: 'red',
  EXECUTE: 'purple',
  ADMIN: 'volcano',
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      // 模拟审计日志数据
      setAuditLogs([
        { id: '1', username: 'admin', action: 'LOGIN', resourceType: 'auth', resourceName: '用户登录', result: 'SUCCESS', timestamp: new Date().toISOString() },
        { id: '2', username: 'admin', action: 'CREATE', resourceType: 'model', resourceName: 'SWAT模型', result: 'SUCCESS', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: '3', username: 'expert1', action: 'EXECUTE', resourceType: 'task', resourceName: '模拟任务-001', result: 'SUCCESS', timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id: '4', username: 'admin', action: 'UPDATE', resourceType: 'user', resourceName: 'student1', result: 'SUCCESS', timestamp: new Date(Date.now() - 86400000).toISOString() },
      ]);
    } catch (error) {
      message.error('加载审计日志失败');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  const rolePermissionColumns = [
    {
      title: '权限组',
      dataIndex: 'group',
      key: 'group',
      width: 120,
      render: (text, row) => ({ children: <strong>{text}</strong>, props: { rowSpan: row.rowSpan } }),
    },
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => <Tag color={ACTION_COLORS[action] || 'default'}>{action}</Tag>,
    },
    ...ROLE_OPTIONS.map(({ value, label, color }) => ({
      title: <Tag color={color}>{label}</Tag>,
      key: value,
      width: 100,
      render: (_, record) => {
        const has = (ROLE_PERMISSIONS[value] || []).includes(record.code);
        return has ? <Tag color="success">✓</Tag> : <Tag>—</Tag>;
      },
    })),
  ];

  const permissionTableData = [];
  PERMISSION_GROUPS.forEach((group) => {
    group.permissions.forEach((perm, idx) => {
      permissionTableData.push({
        key: perm.code,
        group: idx === 0 ? group.group : '',
        rowSpan: idx === 0 ? group.permissions.length : 0,
        ...perm,
      });
    });
  });

  const auditColumns = [
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 180, render: (t) => new Date(t).toLocaleString('zh-CN') },
    { title: '用户', dataIndex: 'username', key: 'username', width: 120 },
    { title: '操作', dataIndex: 'action', key: 'action', width: 100, render: (a) => <Tag>{a}</Tag> },
    { title: '资源类型', dataIndex: 'resourceType', key: 'resourceType', width: 120 },
    { title: '资源名称', dataIndex: 'resourceName', key: 'resourceName' },
    { title: '结果', dataIndex: 'result', key: 'result', width: 80, render: (r) => <Tag color={r === 'SUCCESS' ? 'success' : 'error'}>{r}</Tag> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="系统设置"
        breadcrumbs={[{ label: '系统设置' }]}
      />

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><SafetyCertificateOutlined /> 角色权限</span>} key="roles">
            <p style={{ marginBottom: 16 }}>角色权限矩阵 — 管理系统各角色的默认权限分配</p>
            <Table
              dataSource={permissionTableData}
              columns={rolePermissionColumns}
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 800 }}
            />
          </TabPane>

          <TabPane tab={<span><AuditOutlined /> 审计日志</span>} key="audit">
            <div style={{ marginBottom: 16 }}>
              <Button icon={<ReloadOutlined />} onClick={fetchAuditLogs} loading={logsLoading}>刷新</Button>
            </div>
            <Table
              dataSource={auditLogs}
              columns={auditColumns}
              rowKey="id"
              loading={logsLoading}
              pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default SettingsPage;
