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
import { workflowService } from '../../services/workflowService';
import { modelService } from '../../services/modelService';
import styles from './WorkflowEditorPage.module.css';

const { TextArea } = Input;
const { Search } = Input;

const WorkflowEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [definition, setDefinition] = useState({ nodes: [], edges: [] });

  const isEditing = !!id;

  // 加载模型列表
  const fetchModels = async () => {
    setModelsLoading(true);
    try {
      const result = await modelService.getModels({ page: 1, pageSize: 100 });
      setModels(result.items || []);
    } catch (error) {
      console.error('加载模型列表失败:', error);
      message.error('加载模型列表失败');
    } finally {
      setModelsLoading(false);
    }
  };

  // 加载工作流数据
  useEffect(() => {
    fetchModels();
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
      const data = await workflowService.getWorkflowById(Number(id));
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

      const workflowData = {
        ...values,
        definition
      };

      if (isEditing) {
        await workflowService.updateWorkflow(Number(id), workflowData);
        message.success('工作流更新成功');
      } else {
        await workflowService.createWorkflow(workflowData);
        message.success('工作流创建成功');
        navigate('/workflows');
      }
    } catch (error) {
      if (error.message) {
        message.error('保存失败: ' + error.message);
      }
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
