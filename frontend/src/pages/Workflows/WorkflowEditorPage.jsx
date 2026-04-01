import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Input,
  Form,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Drawer,
  List,
  Avatar,
  Tooltip,
  Empty,
  Divider
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  ApiOutlined,
  ImportOutlined,
  ExportOutlined,
  PlayCircleOutlined,
  DatabaseOutlined,
  SearchOutlined,
  DragOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { WorkflowCanvas } from '../../components/WorkflowEditor';
import styles from './WorkflowEditorPage.module.css';

const { TextArea } = Input;
const { Search } = Input;

// 模拟模型数据
const mockModels = [
  {
    id: '1',
    name: 'SWAT水文模型',
    description: '土壤和水评估工具，用于流域尺度的径流模拟',
    category: 'hydrological',
    currentVersion: '1.2.0',
    authorName: '张三'
  },
  {
    id: '2',
    name: 'HEC-RAS水力学模型',
    description: '一维/二维水力学计算引擎',
    category: 'hydraulic',
    currentVersion: '2.0.1',
    authorName: '李四'
  },
  {
    id: '3',
    name: 'WASP水质模型',
    description: '水质分析和模拟程序',
    category: 'water_quality',
    currentVersion: '0.9.0',
    authorName: '张三'
  },
  {
    id: '4',
    name: 'MIKE21水动力模型',
    description: '二维水动力模拟软件',
    category: 'hydraulic',
    currentVersion: '3.1.0',
    authorName: '王五'
  },
  {
    id: '5',
    name: 'EFDC生态模型',
    description: '环境流体动力学代码，用于水质和生态模拟',
    category: 'ecological',
    currentVersion: '1.0.0',
    authorName: '李四'
  }
];

// 模拟工作流数据
const mockWorkflows = {
  '1': {
    id: '1',
    name: '流域径流模拟工作流',
    description: '集成SWAT模型进行流域径流模拟的完整工作流',
    status: 'published',
    tags: ['径流模拟', 'SWAT', '流域分析'],
    definition: {
      nodes: [
        { id: 'start', type: 'start', position: { x: 100, y: 200 }, data: { label: '开始' } },
        { id: 'input1', type: 'input', position: { x: 250, y: 200 }, data: { label: '气象数据输入' } },
        { id: 'model1', type: 'model', position: { x: 450, y: 200 }, data: { label: 'SWAT模型', model: mockModels[0] } },
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

const WorkflowEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const [models, setModels] = useState(mockModels);
  const [modelSearch, setModelSearch] = useState('');
  const [definition, setDefinition] = useState({ nodes: [], edges: [] });

  const isEditing = !!id;

  // 加载工作流数据
  useEffect(() => {
    if (isEditing) {
      fetchWorkflow();
    } else {
      // 新建工作流，添加默认的开始和结束节点
      setDefinition({
        nodes: [
          { id: 'start', type: 'start', position: { x: 100, y: 300 }, data: { label: '开始' } },
          { id: 'end', type: 'end', position: { x: 800, y: 300 }, data: { label: '结束' } }
        ],
        edges: []
      });
    }
  }, [id]);

  const fetchWorkflow = async () => {
    setLoading(true);
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = mockWorkflows[id] || {
        id,
        name: '',
        description: '',
        definition: { nodes: [], edges: [] }
      };
      setWorkflow(data);
      setDefinition(data.definition || { nodes: [], edges: [] });
      form.setFieldsValue({
        name: data.name,
        description: data.description,
        tags: data.tags
      });
    } catch (error) {
      message.error('加载工作流失败');
    } finally {
      setLoading(false);
    }
  };

  // 过滤模型
  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
    model.description.toLowerCase().includes(modelSearch.toLowerCase())
  );

  // 拖拽开始
  const onDragStart = (event, nodeType, modelData = null) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    if (modelData) {
      event.dataTransfer.setData('modelData', JSON.stringify(modelData));
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  // 保存工作流定义
  const handleSaveDefinition = async (newDefinition) => {
    setDefinition(newDefinition);
  };

  // 保存工作流
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 500));

      const workflowData = {
        ...values,
        definition
      };

      console.log('Saving workflow:', workflowData);
      message.success(isEditing ? '工作流更新成功' : '工作流创建成功');

      if (!isEditing) {
        navigate('/workflows');
      }
    } catch (error) {
      message.error('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 运行工作流
  const handleRun = async () => {
    message.success('工作流开始运行');
  };

  // 验证工作流
  const handleValidate = async (def) => {
    // 模拟验证
    const errors = [];
    if (def.nodes.length < 2) {
      errors.push('工作流至少需要包含开始和结束节点');
    }
    if (def.edges.length === 0 && def.nodes.length > 2) {
      errors.push('请连接节点以构建工作流');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  };

  // 获取分类颜色
  const getCategoryColor = (category) => {
    const colorMap = {
      hydrological: 'blue',
      hydraulic: 'green',
      water_quality: 'orange',
      ecological: 'purple',
      other: 'default'
    };
    return colorMap[category] || 'default';
  };

  // 获取分类名称
  const getCategoryName = (category) => {
    const nameMap = {
      hydrological: '水文',
      hydraulic: '水力学',
      water_quality: '水质',
      ecological: '生态',
      other: '其他'
    };
    return nameMap[category] || category;
  };

  return (
    <div className={styles.container}>
      <Spin spinning={loading}>
        {/* 顶部工具栏 */}
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
              <h2 className={styles.title}>
                {isEditing ? '编辑工作流' : '创建工作流'}
              </h2>
            </div>
            <div className={styles.headerRight}>
              <Space>
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={handleRun}
                  disabled={definition.nodes.length === 0}
                >
                  运行
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={saving}
                >
                  保存
                </Button>
              </Space>
            </div>
          </div>
        </Card>

        {/* 基本信息表单 */}
        <Card className={styles.formCard} size="small">
          <Form
            form={form}
            layout="inline"
            className={styles.form}
          >
            <Form.Item
              name="name"
              label="工作流名称"
              rules={[{ required: true, message: '请输入工作流名称' }]}
            >
              <Input placeholder="输入工作流名称" style={{ width: 250 }} />
            </Form.Item>
            <Form.Item
              name="description"
              label="描述"
            >
              <Input placeholder="输入工作流描述" style={{ width: 300 }} />
            </Form.Item>
          </Form>
        </Card>

        {/* 编辑器主体 */}
        <div className={styles.editorContainer}>
          {/* 左侧模型面板 */}
          <Card className={styles.sidebar} size="small" title="模型组件">
            <Search
              placeholder="搜索模型"
              allowClear
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className={styles.searchInput}
            />

            <Divider style={{ margin: '12px 0' }} />

            <div className={styles.nodeTypesSection}>
              <h4 className={styles.sectionTitle}>基础节点</h4>
              <div className={styles.nodeTypeGrid}>
                <div
                  className={styles.nodeTypeItem}
                  draggable
                  onDragStart={(e) => onDragStart(e, 'input')}
                >
                  <ImportOutlined className={styles.nodeTypeIcon} style={{ color: '#52c41a' }} />
                  <span>输入</span>
                </div>
                <div
                  className={styles.nodeTypeItem}
                  draggable
                  onDragStart={(e) => onDragStart(e, 'output')}
                >
                  <ExportOutlined className={styles.nodeTypeIcon} style={{ color: '#faad14' }} />
                  <span>输出</span>
                </div>
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div className={styles.modelsSection}>
              <h4 className={styles.sectionTitle}>模型库</h4>
              <List
                dataSource={filteredModels}
                renderItem={model => (
                  <List.Item
                    className={styles.modelItem}
                    draggable
                    onDragStart={(e) => onDragStart(e, 'model', model)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar icon={<ApiOutlined />} style={{ backgroundColor: '#1890ff' }} />
                      }
                      title={
                        <div className={styles.modelTitle}>
                          <span>{model.name}</span>
                          <Tag size="small" color={getCategoryColor(model.category)}>
                            {getCategoryName(model.category)}
                          </Tag>
                        </div>
                      }
                      description={
                        <div className={styles.modelDesc}>
                          <div className={styles.modelDescription}>{model.description}</div>
                          <div className={styles.modelMeta}>
                            <Tag size="small">v{model.currentVersion}</Tag>
                            <span className={styles.modelAuthor}>{model.authorName}</span>
                          </div>
                        </div>
                      }
                    />
                    <DragOutlined className={styles.dragIcon} />
                  </List.Item>
                )}
                locale={{
                  emptyText: <Empty description="暂无模型" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                }}
              />
            </div>
          </Card>

          {/* 画布区域 */}
          <div className={styles.canvasWrapper}>
            <WorkflowCanvas
              workflow={{ ...workflow, definition }}
              onSave={handleSaveDefinition}
              onRun={handleRun}
              onValidate={handleValidate}
              models={models}
            />
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default WorkflowEditorPage;
