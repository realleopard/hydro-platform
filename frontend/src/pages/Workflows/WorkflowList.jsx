import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Tag,
  Space,
  Pagination,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Typography,
  Row,
  Col,
  Empty
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  ForkOutlined,
  ExportOutlined,
  ShareAltOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './WorkflowList.module.css';

const { Search } = Input;
const { Title, Text } = Typography;

// 模拟工作流数据
const mockWorkflows = [
  {
    id: '1',
    name: '流域径流模拟工作流',
    description: '集成SWAT模型进行流域径流模拟的完整工作流',
    status: 'published',
    isPublic: true,
    nodeCount: 5,
    edgeCount: 4,
    tags: ['径流模拟', 'SWAT', '流域分析'],
    authorId: 'user1',
    authorName: '张三',
    organizationName: '清华大学',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-03-20T10:30:00Z',
    runCount: 45,
    lastRunAt: '2024-03-19T14:20:00Z',
    definition: {
      nodes: [
        { id: 'start', type: 'start', position: { x: 100, y: 200 } },
        { id: 'input1', type: 'input', position: { x: 250, y: 200 } },
        { id: 'model1', type: 'model', position: { x: 450, y: 200 } },
        { id: 'output1', type: 'output', position: { x: 650, y: 200 } },
        { id: 'end', type: 'end', position: { x: 800, y: 200 } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'input1' },
        { id: 'e2', source: 'input1', target: 'model1' },
        { id: 'e3', source: 'model1', target: 'output1' },
        { id: 'e4', source: 'output1', target: 'end' }
      ]
    }
  },
  {
    id: '2',
    name: '洪水预报工作流',
    description: '基于HEC-RAS的洪水预报和预警工作流',
    status: 'published',
    isPublic: true,
    nodeCount: 7,
    edgeCount: 6,
    tags: ['洪水预报', 'HEC-RAS', '预警'],
    authorId: 'user2',
    authorName: '李四',
    organizationName: '武汉大学',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-03-18T16:45:00Z',
    runCount: 32,
    lastRunAt: '2024-03-18T10:00:00Z',
    definition: {
      nodes: [],
      edges: []
    }
  },
  {
    id: '3',
    name: '水质评估工作流',
    description: '水质参数计算和评估分析工作流',
    status: 'draft',
    isPublic: false,
    nodeCount: 4,
    edgeCount: 3,
    tags: ['水质', 'WASP'],
    authorId: 'user1',
    authorName: '张三',
    organizationName: '清华大学',
    createdAt: '2024-03-10T11:00:00Z',
    updatedAt: '2024-03-10T11:00:00Z',
    runCount: 0,
    definition: {
      nodes: [],
      edges: []
    }
  },
  {
    id: '4',
    name: '二维水动力模拟工作流',
    description: 'MIKE21二维水动力模拟工作流',
    status: 'published',
    isPublic: true,
    nodeCount: 6,
    edgeCount: 5,
    tags: ['水动力', 'MIKE21', '二维模拟'],
    authorId: 'user3',
    authorName: '王五',
    organizationName: '河海大学',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-03-15T14:20:00Z',
    runCount: 28,
    lastRunAt: '2024-03-14T09:30:00Z',
    definition: {
      nodes: [],
      edges: []
    }
  },
  {
    id: '5',
    name: '生态流量评估工作流',
    description: '河流生态流量计算和评估工作流',
    status: 'archived',
    isPublic: false,
    nodeCount: 5,
    edgeCount: 4,
    tags: ['生态', 'EFDC', '流量评估'],
    authorId: 'user2',
    authorName: '李四',
    organizationName: '武汉大学',
    createdAt: '2023-12-01T08:30:00Z',
    updatedAt: '2024-02-28T09:15:00Z',
    runCount: 15,
    definition: {
      nodes: [],
      edges: []
    }
  }
];

const WorkflowList = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 10,
    keyword: ''
  });

  // 加载工作流列表
  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 500));

      let filtered = [...mockWorkflows];

      // 关键词搜索
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        filtered = filtered.filter(w =>
          w.name.toLowerCase().includes(keyword) ||
          w.description?.toLowerCase().includes(keyword) ||
          w.tags?.some(t => t.toLowerCase().includes(keyword))
        );
      }

      setTotal(filtered.length);

      // 分页
      const start = ((query.page || 1) - 1) * (query.pageSize || 10);
      const end = start + (query.pageSize || 10);
      setWorkflows(filtered.slice(start, end));
    } catch (error) {
      message.error('加载工作流列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [query.page, query.pageSize]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkflows();
    }, 300);
    return () => clearTimeout(timer);
  }, [query.keyword]);

  // 获取状态标签
  const getStatusTag = (status) => {
    const statusMap = {
      draft: { color: 'default', label: '草稿' },
      published: { color: 'success', label: '已发布' },
      archived: { color: 'warning', label: '已归档' }
    };
    const config = statusMap[status] || { color: 'default', label: status };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  // 删除工作流
  const handleDelete = async (id) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      message.success('删除成功');
      fetchWorkflows();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 克隆工作流
  const handleClone = async (record) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      message.success(`已克隆工作流 "${record.name}"`);
      fetchWorkflows();
    } catch (error) {
      message.error('克隆失败');
    }
  };

  // 运行工作流
  const handleRun = async (id) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      message.success('工作流开始运行');
    } catch (error) {
      message.error('运行失败');
    }
  };

  // 导出工作流
  const handleExport = (record) => {
    const blob = new Blob([JSON.stringify(record.definition, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('工作流已导出');
  };

  // 表格列定义
  const columns = [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div className={styles.workflowName}>
            <BranchesOutlined className={styles.workflowIcon} />
            {text}
            {record.isPublic && (
              <Tag color="blue" style={{ marginLeft: 8 }}>公开</Tag>
            )}
          </div>
          <Text type="secondary" className={styles.workflowDesc}>
            {record.description || '暂无描述'}
          </Text>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: '节点数',
      dataIndex: 'nodeCount',
      key: 'nodeCount',
      width: 80,
      render: (count) => (
        <Tooltip title={`${count} 个节点`}>
          <span>{count}</span>
        </Tooltip>
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags) => (
        <Space size={[0, 4]} wrap>
          {tags?.slice(0, 2).map((tag, idx) => (
            <Tag key={idx} size="small">{tag}</Tag>
          ))}
          {tags?.length > 2 && (
            <Tag size="small">+{tags.length - 2}</Tag>
          )}
        </Space>
      )
    },
    {
      title: '作者',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 150,
      render: (author, record) => (
        <div className={styles.authorInfo}>
          <span>{author}</span>
          <Text type="secondary" className={styles.orgName}>
            {record.organizationName}
          </Text>
        </div>
      )
    },
    {
      title: '运行次数',
      dataIndex: 'runCount',
      key: 'runCount',
      width: 100,
      render: (count, record) => (
        <div>
          <div>{count} 次</div>
          {record.lastRunAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(record.lastRunAt).toLocaleDateString('zh-CN')}
            </Text>
          )}
        </div>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (date) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/workflows/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/workflows/${record.id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="运行">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleRun(record.id)}
            />
          </Tooltip>
          <Tooltip title="克隆">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleClone(record)}
            />
          </Tooltip>
          <Tooltip title="导出">
            <Button
              type="text"
              icon={<ExportOutlined />}
              onClick={() => handleExport(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除工作流 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <Card className={styles.headerCard}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} className={styles.pageTitle}>
              <BranchesOutlined style={{ marginRight: 8 }} />
              工作流编排
            </Title>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ShareAltOutlined />}
                onClick={() => navigate('/workflows/public')}
              >
                公开工作流
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/workflows/create')}
              >
                创建工作流
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className={styles.filterCard}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="搜索工作流名称、描述或标签"
              allowClear
              enterButton={<SearchOutlined />}
              value={query.keyword}
              onChange={(e) => setQuery({ ...query, keyword: e.target.value })}
              onSearch={() => fetchWorkflows()}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} style={{ textAlign: 'right' }}>
            <Text type="secondary">
              共 <Badge count={total} showZero className={styles.totalBadge} /> 个工作流
            </Text>
          </Col>
        </Row>
      </Card>

      <Card className={styles.tableCard}>
        <Table
          columns={columns}
          dataSource={workflows}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                description="暂无工作流"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
        />
        <div className={styles.pagination}>
          <Pagination
            current={query.page}
            pageSize={query.pageSize}
            total={total}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `共 ${total} 条`}
            onChange={(page, pageSize) => setQuery({ ...query, page, pageSize })}
          />
        </div>
      </Card>
    </div>
  );
};

export default WorkflowList;
