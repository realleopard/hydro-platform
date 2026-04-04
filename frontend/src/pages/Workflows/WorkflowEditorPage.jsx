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

// React Flow definition → backend WorkflowDefinition format
const toBackendDefinition = (rfDef) => {
  const nodes = (rfDef.nodes || [])
    .filter(n => n.type !== 'start' && n.type !== 'end')
    .map(n => ({
      id: n.id,
      type: n.type,
      name: n.data?.label || n.id,
      ...(n.data?.model?.id ? { modelId: n.data.model.id } : {}),
      position: n.position,
      config: Object.fromEntries(
        Object.entries(n.data || {}).filter(([k]) =>
          !['label', 'model', 'onDoubleClick', 'onContextMenu'].includes(k)
        )
      ),
    }));

  const edges = (rfDef.edges || []).map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
    ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
    ...(e.data?.dataMapping && Object.keys(e.data.dataMapping).length > 0
      ? { dataMapping: e.data.dataMapping }
      : {}),
    ...(e.data?.condition ? { condition: e.data.condition } : {}),
  }));

  return { nodes, edges };
};

// backend WorkflowDefinition → React Flow format
const toReactFlowDefinition = (backendDef) => {
  const nodes = (backendDef?.nodes || []).map(n => ({
    id: n.id,
    type: n.type || 'model',
    position: n.position || { x: 0, y: 0 },
    data: {
      label: n.name || n.id,
      ...(n.modelId ? { model: { id: n.modelId, name: n.name } } : {}),
      ...(n.config || {}),
    },
  }));

  if (!nodes.find(n => n.type === 'start')) {
    nodes.unshift({ id: 'start', type: 'start', position: { x: 100, y: 300 }, data: { label: '开始' } });
  }
  if (!nodes.find(n => n.type === 'end')) {
    nodes.push({ id: 'end', type: 'end', position: { x: 800, y: 300 }, data: { label: '结束' } });
  }

  const edges = (backendDef?.edges || []).map(e => {
    const hasMapping = e.dataMapping && Object.keys(e.dataMapping).length > 0;
    const hasCondition = e.condition && e.condition.trim().length > 0;
    let edgeType = 'custom';
    if (hasCondition) edgeType = 'condition';
    else if (hasMapping) edgeType = 'dataFlow';

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
      targetHandle: e.targetHandle || undefined,
      type: edgeType,
      data: {
        ...(hasMapping ? {
          dataMapping: e.dataMapping,
          mapping: Object.entries(e.dataMapping).map(([t, s]) => `${s} → ${t}`).join(', '),
        } : {}),
        ...(hasCondition ? { condition: e.condition } : {}),
      },
    };
  });

  return { nodes, edges };
};

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
  // Keep a ref in sync so page-level save always has latest canvas state
  const definitionRef = React.useRef(definition);
  const updateDefinition = (newDef) => {
    definitionRef.current = newDef;
    setDefinition(newDef);
  };

  const isEditing = !!id;

  // 加载模型列表
  const fetchModels = async () => {
    setModelsLoading(true);
    try {
      const result = await modelService.getModels({ page: 1, pageSize: 100 });
      setModels(result.records || []);
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
      updateDefinition({
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
      const data = await workflowService.getWorkflowById(id);
      setWorkflow(data);
      // definition 在后端是 String 字段，需要 JSON.parse
      let def = data.definition;
      if (typeof def === 'string') {
        try { def = JSON.parse(def); } catch { def = { nodes: [], edges: [] }; }
      }
      updateDefinition(toReactFlowDefinition(def || { nodes: [], edges: [] }));
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
    (model.description || '').toLowerCase().includes(modelSearch.toLowerCase())
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
    updateDefinition(newDefinition);
  };

  // 保存工作流
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const backendDef = toBackendDefinition(definitionRef.current);
      const workflowData = {
        ...values,
        definition: JSON.stringify(backendDef),
      };

      if (isEditing) {
        await workflowService.updateWorkflow(id, workflowData);
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

  // 运行工作流：先保存再运行
  const handleRun = async () => {
    try {
      let workflowId = id;
      if (!isEditing) {
        // 新工作流先保存
        const values = await form.validateFields();
        const backendDef = toBackendDefinition(definitionRef.current);
        const result = await workflowService.createWorkflow({
          ...values,
          definition: JSON.stringify(backendDef),
        });
        workflowId = result.id;
      } else {
        // 已有工作流先保存更改
        const values = await form.validateFields();
        const backendDef = toBackendDefinition(definitionRef.current);
        await workflowService.updateWorkflow(id, {
          ...values,
          definition: JSON.stringify(backendDef),
        });
      }
      // 调用后端运行接口
      const task = await workflowService.runWorkflow(workflowId);
      message.success('工作流开始运行');
      navigate(`/tasks/${task.id}`);
    } catch (error) {
      message.error('运行失败: ' + (error.message || '请先保存工作流'));
    }
  };

  // 验证工作流（客户端校验）
  const handleValidate = async (def) => {
    const errors = [];
    const modelNodes = (def.nodes || []).filter(n => n.type !== 'start' && n.type !== 'end');
    if (modelNodes.length === 0) {
      errors.push('工作流至少需要包含一个模型节点');
    }
    if (modelNodes.length > 1 && (def.edges || []).length === 0) {
      errors.push('请连接节点以构建工作流');
    }

    // 检查模型节点是否都关联了模型
    for (const node of modelNodes) {
      if (node.type === 'model' && !node.data?.model?.id) {
        errors.push(`节点 "${node.data?.label || node.id}" 未关联模型`);
      }
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
                  disabled={definition.nodes.length <= 2}
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
              onDefinitionChange={(def) => { definitionRef.current = def; }}
            />
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default WorkflowEditorPage;
