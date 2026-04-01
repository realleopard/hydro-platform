import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  message,
  Timeline,
  Table,
  Badge,
  Divider,
  Row,
  Col,
  Statistic,
  Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  ExportOutlined,
  DeleteOutlined,
  BranchesOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  EyeOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { WorkflowCanvas } from '../../components/WorkflowEditor';
import styles from './WorkflowDetail.module.css';

// 模拟工作流数据
const mockWorkflows = {
  '1': {
    id: '1',
    name: '流域径流模拟工作流',
    description: '集成SWAT模型进行流域径流模拟的完整工作流',
    status: 'published',
    isPublic: true,
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
        { id: 'start', type: 'start', position: { x: 100, y: 200 }, data: { label: '开始' } },
        { id: 'input1', type: 'input', position: { x: 250, y: 200 }, data: { label: '气象数据输入' } },
        { id: 'model1', type: 'model', position: { x: 450, y: 200 }, data: { label: 'SWAT模型', model: { name: 'SWAT水文模型' } } },
        { id: 'output1', type: 'output', position: { x: 650, y: 200 }, data: { label: '径流结果输出' } },
        { id: 'end', type: 'end', position: { x: 800, y: 200 }, data: { label: '结束' } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'input1', type: 'custom' },
        { id: 'e2', source: 'input1', target: 'model1', type: 'custom' },
        { id: 'e3', source: 'model1', target: 'output1', type: 'custom' },
        { id: 'e4', source: 'output1', target: 'end', type: 'custom' }
      ]
    }
  }
};

// 模拟执行历史
const mockExecutionHistory = [
  {
    taskId: '101',
    status: 'completed',
    startTime: '2024-03-19T14:20:00Z',
    endTime: '2024-03-19T14:25:30Z',
    executedBy: '张三',
    duration: '5分30秒'
  },
  {
    taskId: '98',
    status: 'completed',
    startTime: '2024-03-18T09:15:00Z',
    endTime: '2024-03-18T09:20:15Z',
    executedBy: '李四',
    duration: '5分15秒'
  },
  {
    taskId: '95',
    status: 'failed',
    startTime: '2024-03-17T16:30:00Z',
    endTime: '2024-03-17T16:32:00Z',
    executedBy: '张三',
    duration: '2分0秒',
    error: '输入数据格式错误'
  }
];

const WorkflowDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);

  useEffect(() => {
    fetchWorkflow();
    fetchExecutionHistory();
  }, [id]);

  const fetchWorkflow = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = mockWorkflows[id];
      if (data) {
        setWorkflow(data);
      } else {
        message.error('工作流不存在');
        navigate('/workflows');
      }
    } catch (error) {
      message.error('加载工作流失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutionHistory = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setExecutionHistory(mockExecutionHistory);
    } catch (error) {
      console.error('加载执行历史失败', error);
    }
  };

  const handleRun = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      message.success('工作流开始运行');
    } catch (error) {
      message.error('运行失败');
    }
  };

  const handleClone = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      message.success(`已克隆工作流 "${workflow.name}"`);
    } catch (error) {
      message.error('克隆失败');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(workflow.definition, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('工作流已导出');
  };

  const handleDelete = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      message.success('工作流已删除');
      navigate('/workflows');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      draft: { color: 'default', label: '草稿' },
      published: { color: 'success', label: '已发布' },
      archived: { color: 'warning', label: '已归档' }
    };
    const config = statusMap[status] || { color: 'default', label: status };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const getTaskStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'default', label: '等待中', icon: <ClockCircleOutlined /> },
      running: { color: 'processing', label: '运行中', icon: <ClockCircleOutlined /> },
      completed: { color: 'success', label: '已完成', icon: <CheckCircleOutlined /> },
      failed: { color: 'error', label: '失败', icon: <CloseCircleOutlined /> }
    };
    const config = statusMap[status] || { color: 'default', label: status };
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.label}
      </Tag>
    );
  };

  const historyColumns = [
    {
      title: '任务ID',
      dataIndex: 'taskId',
      key: 'taskId',
      render: (id) => <a onClick={() => navigate(`/tasks/${id}`)}>{id}</a>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getTaskStatusTag(status)
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time) => time ? new Date(time).toLocaleString('zh-CN') : '-'
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration'
    },
    {
      title: '执行人',
      dataIndex: 'executedBy',
      key: 'executedBy'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/tasks/${record.taskId}`)}
        >
          查看
        </Button>
      )
    }
  ];

  if (!workflow) {
    return <Spin spinning={loading} style={{ marginTop: 100 }} />;
  }

  return (
    <div className={styles.container}>
      <Spin spinning={loading}>
        {/* 头部 */}
        <Card className={styles.headerCard} size="small">
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/workflows')}
              >
                返回
              </Button>
              <Divider type="vertical" />
              <div className={styles.titleSection}>
                <h2 className={styles.title}>
                  <BranchesOutlined style={{ marginRight: 8 }} />
                  {workflow.name}
                </h2>
                <div className={styles.subtitle}>
                  {getStatusTag(workflow.status)}
                  {workflow.isPublic && <Tag color="blue">公开</Tag>}
                  {workflow.tags?.map((tag, idx) => (
                    <Tag key={idx} size="small">{tag}</Tag>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.headerRight}>
              <Space>
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={handleRun}
                  type="primary"
                  style={{ backgroundColor: '#52c41a' }}
                >
                  运行
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/workflows/${id}/edit`)}
                >
                  编辑
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleClone}
                >
                  克隆
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExport}
                >
                  导出
                </Button>
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={handleDelete}
                >
                  删除
                </Button>
              </Space>
            </div>
          </div>
        </Card>

        {/* 统计信息 */}
        <Row gutter={16} className={styles.statsRow}>
          <Col span={6}>
            <Card>
              <Statistic
                title="节点数量"
                value={workflow.definition?.nodes?.length || 0}
                prefix={<BranchesOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="运行次数"
                value={workflow.runCount}
                prefix={<PlayCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="创建时间"
                value={new Date(workflow.createdAt).toLocaleDateString('zh-CN')}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="作者"
                value={workflow.authorName}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 工作流画布 */}
        <Card className={styles.canvasCard} title="工作流定义" size="small">
          <div className={styles.canvasContainer}>
            <WorkflowCanvas
              workflow={workflow}
              readOnly={true}
            />
          </div>
        </Card>

        {/* 执行历史 */}
        <Card className={styles.historyCard} title="执行历史" size="small">
          <Table
            columns={historyColumns}
            dataSource={executionHistory}
            rowKey="taskId"
            pagination={false}
            locale={{
              emptyText: <Empty description="暂无执行记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            }}
          />
        </Card>

        {/* 描述信息 */}
        <Card className={styles.descriptionCard} title="详细信息" size="small">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="工作流ID">{workflow.id}</Descriptions.Item>
            <Descriptions.Item label="工作流名称">{workflow.name}</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>{workflow.description || '暂无描述'}</Descriptions.Item>
            <Descriptions.Item label="作者">{workflow.authorName}</Descriptions.Item>
            <Descriptions.Item label="所属机构">{workflow.organizationName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(workflow.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{new Date(workflow.updatedAt).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="最后运行">{workflow.lastRunAt ? new Date(workflow.lastRunAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="公开状态">{workflow.isPublic ? '公开' : '私有'}</Descriptions.Item>
          </Descriptions>
        </Card>
      </Spin>
    </div>
  );
};

export default WorkflowDetail;
