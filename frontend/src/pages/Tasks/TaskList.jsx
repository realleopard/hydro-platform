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
  ReloadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import { workflowService } from '../../services/workflowService';
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
  const [workflows, setWorkflows] = useState([]);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 10,
    keyword: '',
    status: undefined,
    workflowId: undefined,
    dateRange: null
  });

  // 加载工作流列表（用于筛选下拉）
  useEffect(() => {
    workflowService.getWorkflows({ page: 1, size: 100 })
      .then(res => {
        const records = res.records || res.data?.records || [];
        setWorkflows(records);
      })
      .catch(() => {});
  }, []);

  // 加载任务列表
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: query.page,
        size: query.pageSize,
        status: query.status || undefined,
        workflowId: query.workflowId || undefined,
      };

      const response = await taskService.getTasks(params);
      setTasks(response.records || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err.message || '加载任务列表失败');
      setTasks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query.page, query.pageSize, query.status, query.workflowId]);

  // 初始加载和查询条件变化时重新加载
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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
      await taskService.cancelTask(id);
      message.success('任务已取消');
      fetchTasks();
    } catch (err) {
      message.error('取消失败: ' + (err.message || '请稍后重试'));
    }
  };

  // 重试任务
  const handleRetry = async (id) => {
    try {
      await taskService.retryTask(id);
      message.success('任务已重新提交');
      fetchTasks();
    } catch (err) {
      message.error('重试失败: ' + (err.message || '请稍后重试'));
    }
  };

  // 删除任务
  const handleDelete = async (id) => {
    try {
      await taskService.deleteTask(id);
      message.success('任务已删除');
      fetchTasks();
    } catch (err) {
      message.error('删除失败: ' + (err.message || '请稍后重试'));
    }
  };

  // 计算运行时长
  const calcDuration = (record) => {
    if (record.startedAt && record.completedAt) {
      const ms = new Date(record.completedAt) - new Date(record.startedAt);
      return Math.round(ms / 1000);
    }
    return null;
  };

  // 格式化持续时间
  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    if (minutes > 0) return `${minutes}分${secs}秒`;
    return `${secs}秒`;
  };

  // 表格列定义
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <div className={styles.taskName}>{text}</div>
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
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress, record) => (
        <Progress
          percent={progress || 0}
          size="small"
          strokeColor={record.status === 'failed' ? '#ff4d4f' : record.status === 'completed' ? '#52c41a' : '#1890ff'}
          status={record.status === 'failed' ? 'exception' : undefined}
        />
      )
    },
    {
      title: '运行时长',
      key: 'duration',
      width: 110,
      render: (_, record) => formatDuration(calcDuration(record))
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
      width: 180,
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
              title="确定要取消这个任务吗？"
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

          {(record.status === 'completed' || record.status === 'failed' || record.status === 'cancelled') && (
            <Popconfirm
              title="确定要删除这个任务吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

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
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="按工作流筛选"
              allowClear
              style={{ width: '100%' }}
              value={query.workflowId}
              onChange={(value) => setQuery({ ...query, workflowId: value, page: 1 })}
            >
              {workflows.map(wf => (
                <Option key={wf.id} value={wf.id}>{wf.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
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
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary">
              共 <Badge count={total} showZero className={styles.totalBadge} /> 个任务
            </Text>
          </Col>
        </Row>
      </Card>

      <Card className={styles.tableCard}>
        {error ? (
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
        ) : !loading && tasks.length === 0 ? (
          <Empty description="暂无任务数据">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/workflows')}>
              新建任务
            </Button>
          </Empty>
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={tasks}
              rowKey="id"
              loading={loading}
              pagination={false}
              scroll={{ x: 1100 }}
            />
            <div className={styles.pagination}>
              <Pagination
                current={query.page}
                pageSize={query.pageSize}
                total={total}
                showSizeChanger
                showQuickJumper
                showTotal={(t) => `共 ${t} 条`}
                onChange={(page, pageSize) => setQuery({ ...query, page, pageSize })}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default TaskList;
