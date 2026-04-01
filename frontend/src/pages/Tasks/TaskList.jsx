import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
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
  Progress,
  DatePicker,
  Empty,
  Skeleton,
  Alert
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  RedoOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  LoadingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import { TASK_STATUS_OPTIONS } from '../../types';
import styles from './TaskList.module.css';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const TaskList = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 10,
    keyword: '',
    status: undefined,
    dateRange: null
  });

  // 加载任务列表
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: query.page,
        size: query.pageSize,
        search: query.keyword || undefined,
        status: query.status
      };

      const response = await taskService.getTasks(params);
      setTasks(response.records || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err.message || '加载任务列表失败');
      message.error('加载任务列表失败: ' + (err.message || '请稍后重试'));
      setTasks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query.page, query.pageSize, query.keyword, query.status]);

  // 初始加载和查询条件变化时重新加载
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.keyword !== undefined) {
        setQuery(prev => ({ ...prev, page: 1 }));
        fetchTasks();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query.keyword, fetchTasks]);

  // 获取状态标签
  const getStatusTag = (status) => {
    const option = TASK_STATUS_OPTIONS.find(o => o.value === status);
    const iconMap = {
      pending: <ClockCircleOutlined />,
      queued: <ClockCircleOutlined />,
      running: <SyncOutlined spin />,
      completed: <CheckCircleOutlined />,
      failed: <CloseCircleOutlined />,
      cancelled: <CloseCircleOutlined />,
      retrying: <LoadingOutlined />
    };

    return (
      <Tag icon={iconMap[status]} color={option?.color || 'default'}>
        {option?.label || status}
      </Tag>
    );
  };

  // 取消任务
  const handleCancel = async (id) => {
    try {
      await taskService.cancelTask(Number(id));
      message.success('任务已取消');
      fetchTasks();
    } catch (err) {
      console.error('Failed to cancel task:', err);
      message.error('取消失败: ' + (err.message || '请稍后重试'));
    }
  };

  // 重试任务
  const handleRetry = async (id) => {
    try {
      await taskService.retryTask(Number(id));
      message.success('任务已重新提交');
      fetchTasks();
    } catch (err) {
      console.error('Failed to retry task:', err);
      message.error('重试失败: ' + (err.message || '请稍后重试'));
    }
  };

  // 删除任务
  const handleDelete = async (id) => {
    try {
      await taskService.deleteTask(Number(id));
      message.success('任务已删除');
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      message.error('删除失败: ' + (err.message || '请稍后重试'));
    }
  };

  // 渲染进度条
  const renderProgress = (task) => {
    const statusColors = {
      pending: '#d9d9d9',
      queued: '#1890ff',
      running: '#1890ff',
      completed: '#52c41a',
      failed: '#ff4d4f',
      cancelled: '#faad14',
      retrying: '#722ed1'
    };

    return (
      <div className={styles.progressWrapper}>
        <Progress
          percent={task.progress || 0}
          size="small"
          strokeColor={statusColors[task.status]}
          status={task.status === 'failed' ? 'exception' : undefined}
        />
        {task.currentNodeName && task.status === 'running' && (
          <Text type="secondary" className={styles.currentNode}>
            正在执行: {task.currentNodeName}
          </Text>
        )}
        {task.errorMessage && task.status === 'failed' && (
          <Text type="danger" className={styles.errorMessage}>
            {task.errorMessage}
          </Text>
        )}
      </div>
    );
  };

  // 格式化持续时间
  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div className={styles.taskName}>{text}</div>
          <Text type="secondary" className={styles.taskDesc}>
            {record.description || '暂无描述'}
          </Text>
        </div>
      )
    },
    {
      title: '所属工作流',
      dataIndex: 'workflowName',
      key: 'workflowName',
      width: 180,
      render: (name) => (
        <Tag color="blue">{name || '-'}</Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status)
    },
    {
      title: '进度',
      key: 'progress',
      width: 200,
      render: (_, record) => renderProgress(record)
    },
    {
      title: '创建者',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: 100
    },
    {
      title: '运行时长',
      key: 'duration',
      width: 120,
      render: (_, record) => formatDuration(record.resourceUsage?.duration)
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date) => date ? new Date(date).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/tasks/${record.id}`)}
            />
          </Tooltip>

          {record.status === 'running' && (
            <Popconfirm
              title="确认取消"
              description="确定要取消这个正在运行的任务吗？"
              onConfirm={() => handleCancel(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="取消任务">
                <Button type="text" danger icon={<PauseCircleOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}

          {(record.status === 'failed' || record.status === 'cancelled') && (
            <Tooltip title="重新运行">
              <Button
                type="text"
                icon={<RedoOutlined />}
                onClick={() => handleRetry(record.id)}
              />
            </Tooltip>
          )}

          {record.status === 'completed' && (
            <Tooltip title="查看结果">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => navigate(`/tasks/${record.id}/results`)}
              />
            </Tooltip>
          )}

          {(record.status === 'completed' || record.status === 'failed' || record.status === 'cancelled') && (
            <Popconfirm
              title="确认删除"
              description="确定要删除这个任务吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button type="text" danger icon={<CloseCircleOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // 渲染表格内容
  const renderTableContent = () => {
    if (loading && tasks.length === 0) {
      return <Skeleton active paragraph={{ rows: 5 }} />;
    }

    if (error) {
      return (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={fetchTasks} icon={<ReloadOutlined />}>
              重试
            </Button>
          }
        />
      );
    }

    if (!loading && tasks.length === 0) {
      return (
        <Empty
          description="暂无任务数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/workflows')}
          >
            新建任务
          </Button>
        </Empty>
      );
    }

    return (
      <>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
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
      </>
    );
  };

  return (
    <div className={styles.container}>
      <Card className={styles.headerCard}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} className={styles.pageTitle}>任务管理</Title>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchTasks}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/workflows')}
              >
                新建任务
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className={styles.filterCard}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="搜索任务名称或描述"
              allowClear
              enterButton={<SearchOutlined />}
              value={query.keyword}
              onChange={(e) => setQuery({ ...query, keyword: e.target.value })}
              onSearch={() => fetchTasks()}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={query.status}
              onChange={(value) => setQuery({ ...query, status: value, page: 1 })}
            >
              {TASK_STATUS_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} style={{ textAlign: 'right' }}>
            <Text type="secondary">
              共 <Badge count={total} showZero className={styles.totalBadge} /> 个任务
            </Text>
          </Col>
        </Row>
      </Card>

      <Card className={styles.tableCard}>
        {renderTableContent()}
      </Card>
    </div>
  );
};

export default TaskList;
