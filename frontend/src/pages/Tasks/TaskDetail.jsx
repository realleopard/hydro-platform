import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Tabs,
  Timeline,
  Empty,
  message,
  Divider,
  Row,
  Col,
  Progress,
  Statistic,
  Badge,
  Alert,
  Input,
  Affix,
  Select,
  Skeleton
} from 'antd';
import {
  ArrowLeftOutlined,
  PauseCircleOutlined,
  RedoOutlined,
  DownloadOutlined,
  FileTextOutlined,
  CodeOutlined,
  HistoryOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  CaretRightOutlined,
  PauseOutlined,
  VerticalAlignBottomOutlined,
  ClearOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { taskService } from '../../services/taskService';
import { workflowService } from '../../services/workflowService';
import { TASK_STATUS_OPTIONS, LOG_LEVEL_COLORS } from '../../types';
import { WorkflowCanvas } from '../../components/WorkflowEditor';
import styles from './TaskDetail.module.css';

const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;

const TaskDetail = () => {
  // Enrich workflow definition nodes with task execution status
  const enrichDefinitionWithStatus = (def, nodes) => {
    if (!def?.nodes) return def;
    const statusMap = {};
    (nodes || []).forEach(n => {
      statusMap[n.nodeId] = n;
    });
    return {
      ...def,
      nodes: def.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: statusMap[node.id]?.status || 'pending',
          ...(statusMap[node.id]?.outputs ? { outputs: statusMap[node.id].outputs } : {}),
        },
      })),
    };
  };
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [logs, setLogs] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [wsConnected, setWsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState('');
  const [workflowDef, setWorkflowDef] = useState(null);
  const [logLevelFilter, setLogLevelFilter] = useState(['debug', 'info', 'warn', 'error']);
  const [error, setError] = useState(null);
  const logsEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // 加载任务详情
  const fetchTaskDetail = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const taskId = id;
      const [taskData, logsData, outputsData] = await Promise.all([
        taskService.getTaskById(taskId),
        taskService.getTaskLogs(taskId).catch(() => []),
        taskService.getTaskOutputs(taskId).catch(() => [])
      ]);
      setTask(taskData);
      setLogs(logsData || []);
      setOutputs(outputsData || []);

      // Fetch workflow definition for DAG visualization
      if (taskData?.workflowId) {
        try {
          const wf = await workflowService.getWorkflowById(taskData.workflowId);
          if (wf?.definition) {
            let def = wf.definition;
            if (typeof def === 'string') {
              try { def = JSON.parse(def); } catch { def = null; }
            }
            setWorkflowDef(def);
          }
        } catch (e) {
          console.warn('Failed to load workflow definition:', e);
        }
      }
    } catch (err) {
      console.error('Failed to fetch task detail:', err);
      setError(err.message || '加载任务详情失败');
      message.error('加载任务详情失败: ' + (err.message || '请稍后重试'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTaskDetail();
  }, [fetchTaskDetail]);

  // WebSocket 连接
  useEffect(() => {
    if (!id || !task) return;

    const taskId = id;
    const taskStatus = task.status;

    // 只在任务处于活动状态时连接 WebSocket
    if (taskService.isActive(taskStatus)) {
      setWsConnected(true);

      // 订阅任务进度更新
      const unsubscribe = taskService.subscribeToProgress(taskId, (update) => {
        setTask(prev => prev ? {
          ...prev,
          progress: update.progress ?? prev.progress,
          status: update.status ?? prev.status,
          currentNodeId: update.currentNodeId ?? prev.currentNodeId,
          currentNodeName: update.currentNodeName ?? prev.currentNodeName
        } : null);

        // 添加日志
        if (update.message) {
          setLogs(prev => [...prev, {
            id: `ws-${Date.now()}`,
            taskId: id,
            level: update.level || 'info',
            message: update.message,
            timestamp: new Date().toISOString(),
            nodeId: update.currentNodeId
          }]);
        }
      });

      unsubscribeRef.current = unsubscribe;

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
        setWsConnected(false);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, task?.status]);

  // 自动滚动日志
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

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

  // 获取节点状态标签
  const getNodeStatusTag = (status) => {
    const colors = {
      pending: 'default',
      running: 'processing',
      completed: 'success',
      failed: 'error',
      skipped: 'warning'
    };
    const labels = {
      pending: '等待中',
      running: '运行中',
      completed: '已完成',
      failed: '失败',
      skipped: '已跳过'
    };
    return <Tag color={colors[status] || 'default'}>{labels[status] || status}</Tag>;
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

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    const matchesText = !logFilter ||
      log.message?.toLowerCase().includes(logFilter.toLowerCase()) ||
      log.nodeId?.toLowerCase().includes(logFilter.toLowerCase());
    const matchesLevel = logLevelFilter.includes(log.level);
    return matchesText && matchesLevel;
  });

  // 取消任务
  const handleCancel = async () => {
    try {
      if (!id) return;
      await taskService.cancelTask(id);
      message.success('任务已取消');
      fetchTaskDetail();
    } catch (err) {
      console.error('Failed to cancel task:', err);
      message.error('取消失败: ' + (err.message || '请稍后重试'));
    }
  };

  // 重试任务
  const handleRetry = async () => {
    try {
      if (!id) return;
      await taskService.retryTask(id);
      message.success('任务已重新提交');
      fetchTaskDetail();
    } catch (err) {
      console.error('Failed to retry task:', err);
      message.error('重试失败: ' + (err.message || '请稍后重试'));
    }
  };

  // 下载输出文件
  const handleDownload = async (filePath) => {
    try {
      if (!id) return;
      const url = await taskService.getDownloadUrl(id, filePath);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to get download URL:', err);
      message.error('获取下载链接失败: ' + (err.message || '请稍后重试'));
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Card>
          <Skeleton active avatar paragraph={{ rows: 4 }} />
        </Card>
        <Card style={{ marginTop: 24 }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={fetchTaskDetail} icon={<ReloadOutlined />}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  if (!task) {
    return (
      <div className={styles.container}>
        <Empty description="任务不存在或已被删除">
          <Button type="primary" onClick={() => navigate('/tasks')}>
            返回列表
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 头部导航 */}
      <Card className={styles.headerCard}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tasks')}
          className={styles.backButton}
        >
          返回列表
        </Button>
      </Card>

      {/* 任务标题区 */}
      <Card className={styles.titleCard}>
        <Row justify="space-between" align="middle">
          <Col xs={24} md={16}>
            <Space direction="vertical" size="small" className={styles.titleSection}>
              <Space>
                <h1 className={styles.taskName}>{task.name}</h1>
                {getStatusTag(task.status)}
                {wsConnected && (
                  <Badge status="processing" text="实时连接" />
                )}
              </Space>
              <p className={styles.description}>{task.description}</p>
              <Space>
                <Tag color="blue">{task.workflowName}</Tag>
                <Tag>策略: {task.strategy === 'sequential' ? '串行' : task.strategy === 'parallel' ? '并行' : '混合'}</Tag>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={8} className={styles.actionSection}>
            <Space>
              {task.status === 'running' && (
                <Button danger icon={<PauseCircleOutlined />} onClick={handleCancel}>
                  取消任务
                </Button>
              )}
              {(task.status === 'failed' || task.status === 'cancelled') && (
                <Button type="primary" icon={<RedoOutlined />} onClick={handleRetry}>
                  重新运行
                </Button>
              )}
              {task.status === 'completed' && (
                <Button type="primary" icon={<DownloadOutlined />}>
                  下载结果
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 进度条 */}
      {(taskService.isActive(task.status)) && (
        <Card className={styles.progressCard}>
          <Progress
            percent={task.progress || 0}
            status={task.status === 'failed' ? 'exception' : 'active'}
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
            format={(percent) => `${percent}%`}
          />
          {task.currentNodeName && (
            <div className={styles.currentNodeInfo}>
              <SyncOutlined spin className={styles.spinIcon} />
              <span>正在执行: {task.currentNodeName}</span>
            </div>
          )}
        </Card>
      )}

      {/* 统计信息 */}
      <Row gutter={16} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="执行进度"
              value={task.progress || 0}
              suffix="%"
              prefix={task.status === 'running' ? <SyncOutlined spin /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="运行时长"
              value={formatDuration(task.resourceUsage?.duration)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="CPU使用"
              value={task.resourceUsage?.cpu || 0}
              suffix="核"
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="内存使用"
              value={task.resourceUsage?.memory || 0}
              suffix="GB"
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      {/* 标签页内容 */}
      <Card className={styles.contentCard}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="概览" key="overview" icon={<FileTextOutlined />}>
            <Row gutter={24}>
              <Col xs={24} lg={12}>
                <Descriptions title="基本信息" bordered column={1}>
                  <Descriptions.Item label="任务ID">{task.id}</Descriptions.Item>
                  <Descriptions.Item label="工作流">{task.workflowName}</Descriptions.Item>
                  <Descriptions.Item label="创建者">{task.createdByName}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {task.createdAt ? new Date(task.createdAt).toLocaleString('zh-CN') : '-'}
                  </Descriptions.Item>
                  {task.startedAt && (
                    <Descriptions.Item label="开始时间">
                      {new Date(task.startedAt).toLocaleString('zh-CN')}
                    </Descriptions.Item>
                  )}
                  {task.completedAt && (
                    <Descriptions.Item label="完成时间">
                      {new Date(task.completedAt).toLocaleString('zh-CN')}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Col>

              <Col xs={24} lg={12}>
                <Descriptions title="输入参数" bordered column={1}>
                  {task.inputs?.map((input, index) => (
                    <Descriptions.Item key={index} label={input.name}>
                      <code className={styles.filePath}>{input.fileUrl || input.value?.toString()}</code>
                    </Descriptions.Item>
                  )) || <Descriptions.Item label="-">无输入参数</Descriptions.Item>}
                </Descriptions>
              </Col>
            </Row>

            {task.errorMessage && (
              <>
                <Divider />
                <Alert
                  message="错误信息"
                  description={task.errorMessage}
                  type="error"
                  showIcon
                />
              </>
            )}

            {/* 输出文件 */}
            {outputs.length > 0 && (
              <>
                <Divider />
                <Descriptions title="输出文件" bordered column={1}>
                  {outputs.map((output, index) => (
                    <Descriptions.Item key={index} label={output.name}>
                      <Space>
                        <code className={styles.filePath}>{output.path}</code>
                        <Button
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(output.path)}
                        >
                          下载
                        </Button>
                      </Space>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </>
            )}
          </TabPane>

          <TabPane tab="执行节点" key="nodes" icon={<CodeOutlined />}>
            {workflowDef && task.nodes?.length > 0 ? (
              <div>
                {/* DAG visualization */}
                <div style={{ height: 400, border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 16 }}>
                  <WorkflowCanvas
                    workflow={{
                      definition: enrichDefinitionWithStatus(workflowDef, task.nodes),
                    }}
                    readOnly={true}
                  />
                </div>
                {/* Node detail list */}
                <Card size="small" title="节点执行详情">
                  <Timeline mode="left">
                    {task.nodes.map((node) => (
                      <Timeline.Item
                        key={node.id}
                        color={node.status === 'completed' ? 'green' : node.status === 'running' ? 'blue' : node.status === 'failed' ? 'red' : 'gray'}
                      >
                        <Space>
                          <span>{node.modelName || node.nodeName || node.nodeId}</span>
                          {getNodeStatusTag(node.status)}
                          {node.startedAt && (
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                              {new Date(node.startedAt).toLocaleString('zh-CN')}
                            </span>
                          )}
                          {node.errorMessage && (
                            <span style={{ fontSize: 12, color: '#ff4d4f' }}>- {node.errorMessage}</span>
                          )}
                        </Space>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Card>
              </div>
            ) : task.nodes?.length > 0 ? (
              <Timeline mode="left">
                {task.nodes.map((node) => (
                  <Timeline.Item
                    key={node.id}
                    color={node.status === 'completed' ? 'green' : node.status === 'running' ? 'blue' : node.status === 'failed' ? 'red' : 'gray'}
                  >
                    <Card size="small" className={styles.nodeCard} title={<Space><span>{node.modelName}</span>{getNodeStatusTag(node.status)}</Space>}>
                      <Descriptions column={2} size="small">
                        <Descriptions.Item label="节点ID">{node.nodeId}</Descriptions.Item>
                        <Descriptions.Item label="重试次数">{node.retryCount || 0}/{node.maxRetries || 3}</Descriptions.Item>
                        {node.startedAt && <Descriptions.Item label="开始时间">{new Date(node.startedAt).toLocaleString('zh-CN')}</Descriptions.Item>}
                        {node.completedAt && <Descriptions.Item label="完成时间">{new Date(node.completedAt).toLocaleString('zh-CN')}</Descriptions.Item>}
                      </Descriptions>
                    </Card>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="暂无节点信息" />
            )}
          </TabPane>

          <TabPane tab="运行日志" key="logs" icon={<HistoryOutlined />}>
            <div className={styles.logsContainer}>
              <Affix offsetTop={80} className={styles.logsToolbar}>
                <Card size="small" className={styles.logsFilterCard}>
                  <Space wrap>
                    <Search
                      placeholder="搜索日志"
                      allowClear
                      onChange={(e) => setLogFilter(e.target.value)}
                      style={{ width: 200 }}
                    />
                    <Select
                      mode="multiple"
                      placeholder="日志级别"
                      value={logLevelFilter}
                      onChange={setLogLevelFilter}
                      style={{ width: 200 }}
                    >
                      <Option value="debug">Debug</Option>
                      <Option value="info">Info</Option>
                      <Option value="warn">Warn</Option>
                      <Option value="error">Error</Option>
                    </Select>
                    <Button
                      icon={autoScroll ? <PauseOutlined /> : <CaretRightOutlined />}
                      onClick={() => setAutoScroll(!autoScroll)}
                    >
                      {autoScroll ? '暂停滚动' : '自动滚动'}
                    </Button>
                    <Button icon={<ClearOutlined />} onClick={() => setLogs([])}>
                      清空
                    </Button>
                    <Button icon={<VerticalAlignBottomOutlined />} onClick={() => {
                      const blob = new Blob([logs.map(l => `[${l.timestamp}] [${l.level?.toUpperCase()}] ${l.message}`).join('\n')], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `task-${id}-logs.txt`;
                      a.click();
                    }}>
                      导出
                    </Button>
                  </Space>
                </Card>
              </Affix>

              <div className={styles.logsContent}>
                {filteredLogs.length === 0 ? (
                  <Empty description="暂无日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  filteredLogs.map((log, index) => (
                    <div key={log.id || index} className={styles.logEntry}>
                      <span className={styles.logTimestamp}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('zh-CN') : '-'}
                      </span>
                      <Tag
                        color={LOG_LEVEL_COLORS[log.level] || '#8c8c8c'}
                        className={styles.logLevel}
                      >
                        {log.level?.toUpperCase() || 'INFO'}
                      </Tag>
                      {log.nodeId && (
                        <Tag size="small" className={styles.logNode}>{log.nodeId}</Tag>
                      )}
                      <span className={styles.logMessage}>{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default TaskDetail;
