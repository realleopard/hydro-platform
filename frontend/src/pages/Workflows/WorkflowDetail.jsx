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
  Popconfirm,
  Timeline,
  Table,
  Badge,
  Divider,
  Row,
  Col,
  Statistic,
  Empty,
  Modal,
  Form,
  Input,
  InputNumber,
  Select
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
import { workflowService } from '../../services/workflowService';
import styles from './WorkflowDetail.module.css';

const WorkflowDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [runModalVisible, setRunModalVisible] = useState(false);
  const [runForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchWorkflow();
      fetchExecutionHistory();
    }
  }, [id]);

  const fetchWorkflow = async () => {
    setLoading(true);
    try {
      const data = await workflowService.getWorkflowById(id);
      if (data) {
        setWorkflow(data);
      } else {
        message.error('工作流不存在');
        navigate('/workflows');
      }
    } catch (error) {
      message.error('加载工作流失败');
      navigate('/workflows');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutionHistory = async () => {
    try {
      const history = await workflowService.getExecutionHistory(id);
      setExecutionHistory(history || []);
    } catch (error) {
      console.error('加载执行历史失败', error);
    }
  };

  const handleRun = () => {
    // Extract input parameters from workflow definition nodes
    const definition = workflow.definition;
    const inputParams = {};
    if (definition?.nodes) {
      for (const node of definition.nodes) {
        if (node.type === 'input' || node.data?.model?.interfaces) {
          const interfaces = node.data?.model?.interfaces;
          if (interfaces) {
            let inputs = [];
            if (Array.isArray(interfaces)) {
              inputs = interfaces.filter(i => i.type === 'input' && i.required);
            } else if (interfaces.inputs) {
              inputs = (interfaces.inputs || []).filter(i => i.required);
            }
            for (const inp of inputs) {
              const key = `${node.id}.${inp.name}`;
              inputParams[key] = {
                label: `${node.data?.label || node.id} - ${inp.name}`,
                dataType: inp.dataType,
                description: inp.description,
                required: true,
              };
            }
          }
        }
      }
    }
    runForm.resetFields();
    setRunModalVisible(true);
  };

  const handleRunSubmit = async () => {
    try {
      const values = await runForm.validateFields();
      const inputValues = { ...values };
      delete inputValues.taskName;
      delete inputValues.description;
      const task = await workflowService.runWorkflow(id, inputValues);
      setRunModalVisible(false);
      message.success('工作流开始运行');
      navigate(`/tasks/${task.id}`);
    } catch (error) {
      if (error.message) {
        message.error('运行失败: ' + error.message);
      }
    }
  };

  const handleClone = async () => {
    try {
      await workflowService.cloneWorkflow(id);
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
      await workflowService.deleteWorkflow(id);
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
                  onClick={() => setRunModalVisible(true)}
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
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title="节点数量"
                value={workflow.definition?.nodes?.length || 0}
                prefix={<BranchesOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title="运行次数"
                value={workflow.runCount}
                prefix={<PlayCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title="创建时间"
                value={new Date(workflow.createdAt).toLocaleDateString('zh-CN')}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
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

      {/* 运行参数配置弹窗 */}
      <Modal
        title={
          <Space>
            <PlayCircleOutlined style={{ color: '#52c41a' }} />
            <span>运行工作流</span>
            <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 'normal' }}>
              {workflow?.name}
            </span>
          </Space>
        }
        open={runModalVisible}
        onOk={handleRunSubmit}
        onCancel={() => setRunModalVisible(false)}
        okText="开始运行"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form form={runForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="taskName" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder={`${workflow?.name || '工作流'} - ${new Date().toLocaleDateString('zh-CN')}`} />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <Input.TextArea rows={2} placeholder="可选：描述本次运行目的" />
          </Form.Item>
          <Divider style={{ margin: '12px 0' }}>输入参数</Divider>
          <Form.Item name="inputs" label="输入数据 (JSON)">
            <Input.TextArea
              rows={6}
              placeholder='{"rainfall": [0, 5, 10, 8, 3], "duration": 24}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkflowDetail;
