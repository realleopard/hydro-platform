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
  Empty,
  Alert
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workflowService } from '../../services/workflowService';
import { taskService } from '../../services/taskService';
import styles from './WorkflowList.module.css';

const { Search } = Input;
const { Title, Text } = Typography;

const WorkflowList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRunMode = searchParams.get('intent') === 'run';
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 10,
    keyword: ''
  });

  // 加载工作流列表
  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await workflowService.getWorkflows({
        page: query.page,
        pageSize: query.pageSize,
        search: query.keyword || undefined,
      });
      setWorkflows(result.records || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err.message || '加载工作流列表失败');
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
      await workflowService.deleteWorkflow(id);
      message.success('删除成功');
      fetchWorkflows();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 克隆工作流
  const handleClone = async (record) => {
    try {
      await workflowService.cloneWorkflow(record.id);
      message.success(`已克隆工作流 "${record.name}"`);
      fetchWorkflows();
    } catch (error) {
      message.error('克隆失败');
    }
  };

  // 运行工作流（创建任务）
  const handleRun = async (record) => {
    try {
      const result = await taskService.createTask({
        workflowId: record.id,
        inputs: '{}'
      });
      message.success('任务已创建');
      navigate(`/tasks/${result.id}`);
    } catch (error) {
      message.error('创建任务失败: ' + (error.message || '请稍后重试'));
    }
  };

  // 导出工作流
  const handleExport = (record) => {
    let def = record.definition;
    // definition 在后端是 JSON 字符串，先解析再格式化
    if (typeof def === 'string') {
      try { def = JSON.parse(def); } catch { /* 保留原始字符串 */ }
    }
    const blob = new Blob([JSON.stringify(def, null, 2)], {
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
      render: (count, record) => {
        const nodeCount = count || record.definition?.nodes?.length || 0;
        return (
          <Tooltip title={`${nodeCount} 个节点`}>
            <span>{nodeCount}</span>
          </Tooltip>
        );
      }
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
      render: (_, record) => {
        if (isRunMode) {
          return (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleRun(record)}
            >
              运行
            </Button>
          );
        }
        return (
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
                onClick={() => handleRun(record)}
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
        );
      }
    }
  ];

  return (
    <div className={styles.container}>
      {error && (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setError(null)}
        />
      )}
      <Card className={styles.headerCard}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} className={styles.pageTitle}>
              <BranchesOutlined style={{ marginRight: 8 }} />
              {isRunMode ? '选择工作流运行任务' : '工作流编排'}
            </Title>
          </Col>
          <Col>
            <Space>
              {isRunMode && (
                <Button onClick={() => navigate('/tasks')}>
                  返回任务列表
                </Button>
              )}
              {!isRunMode && (
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={() => navigate('/workflows/public')}
                >
                  公开工作流
                </Button>
              )}
              {!isRunMode && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/workflows/create')}
                >
                  创建工作流
                </Button>
              )}
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
