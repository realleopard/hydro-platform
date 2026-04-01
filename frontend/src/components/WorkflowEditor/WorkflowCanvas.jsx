import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { message, Modal, Form, Input, Select, Menu, Dropdown } from 'antd';
import {
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  PlayCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { nodeTypes } from './NodeTypes';
import { edgeTypes } from './EdgeTypes';
import WorkflowToolbar from './WorkflowToolbar';
import styles from './WorkflowEditor.module.css';

const { Option } = Select;

// 初始节点
const initialNodes = [];
const initialEdges = [];

// 画布内容组件
const CanvasContent = ({
  workflow,
  onSave,
  onRun,
  onValidate,
  models,
  readOnly = false,
}) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [contextMenu, setContextMenu] = useState(null);
  const [nodeConfigVisible, setNodeConfigVisible] = useState(false);
  const [configForm] = Form.useForm();

  const { project, fitView, getNodes, getEdges } = useReactFlow();

  // 加载工作流数据
  useEffect(() => {
    if (workflow?.definition) {
      const { nodes: workflowNodes = [], edges: workflowEdges = [] } = workflow.definition;
      setNodes(workflowNodes);
      setEdges(workflowEdges);
      setIsDirty(false);
    }
  }, [workflow]);

  // 保存历史记录
  const saveHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: getNodes(),
      edges: getEdges(),
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, getNodes, getEdges]);

  // 连接节点
  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        type: 'custom',
        data: { onDelete: handleDeleteEdge },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setIsDirty(true);
      saveHistory();
    },
    [setEdges, saveHistory]
  );

  // 删除边
  const handleDeleteEdge = useCallback(
    (edgeId) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setIsDirty(true);
      saveHistory();
    },
    [setEdges, saveHistory]
  );

  // 节点选中
  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  // 画布点击 - 取消选中
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenu(null);
  }, []);

  // 双击节点编辑
  const onNodeDoubleClick = useCallback((_, node) => {
    setSelectedNode(node);
    setNodeConfigVisible(true);
    configForm.setFieldsValue({
      label: node.data?.label || '',
      modelId: node.data?.model?.id,
      ...node.data,
    });
  }, [configForm]);

  // 右键菜单
  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      setSelectedNode(node);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        node,
      });
    },
    []
  );

  // 删除节点
  const handleDeleteNode = useCallback(
    (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      setSelectedNode(null);
      setIsDirty(true);
      saveHistory();
      message.success('节点已删除');
    },
    [setNodes, setEdges, saveHistory]
  );

  // 复制节点
  const handleCopyNode = useCallback(
    (node) => {
      const newNode = {
        ...node,
        id: `${node.type}-${Date.now()}`,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: false,
      };
      setNodes((nds) => [...nds, newNode]);
      setIsDirty(true);
      saveHistory();
      message.success('节点已复制');
    },
    [setNodes, saveHistory]
  );

  // 拖拽放置
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const modelData = event.dataTransfer.getData('modelData');

      if (!type) return;

      const position = project({
        x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
        y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
      });

      let newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: type === 'model' ? '模型节点' : type,
          onDoubleClick: onNodeDoubleClick,
          onContextMenu: onNodeContextMenu,
        },
      };

      if (type === 'model' && modelData) {
        const model = JSON.parse(modelData);
        newNode.data = {
          ...newNode.data,
          model,
          label: model.name,
        };
      }

      setNodes((nds) => [...nds, newNode]);
      setIsDirty(true);
      saveHistory();
    },
    [project, setNodes, saveHistory, onNodeDoubleClick, onNodeContextMenu]
  );

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // 清空画布
  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setIsDirty(true);
    saveHistory();
    message.success('画布已清空');
  }, [setNodes, setEdges, saveHistory]);

  // 保存工作流
  const handleSave = useCallback(async () => {
    const definition = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      })),
    };

    try {
      await onSave?.(definition);
      setIsDirty(false);
      message.success('工作流保存成功');
    } catch (error) {
      message.error('保存失败: ' + error.message);
    }
  }, [nodes, edges, onSave]);

  // 运行工作流
  const handleRun = useCallback(async () => {
    try {
      await onRun?.();
      message.success('工作流开始运行');
    } catch (error) {
      message.error('运行失败: ' + error.message);
    }
  }, [onRun]);

  // 验证工作流
  const handleValidate = useCallback(async () => {
    try {
      const result = await onValidate?.({ nodes, edges });
      if (result?.valid) {
        message.success('工作流验证通过');
      } else {
        Modal.error({
          title: '验证失败',
          content: (
            <div>
              {result?.errors?.map((err, idx) => (
                <p key={idx}>{err}</p>
              ))}
            </div>
          ),
        });
      }
    } catch (error) {
      message.error('验证失败: ' + error.message);
    }
  }, [nodes, edges, onValidate]);

  // 导出工作流
  const handleExport = useCallback(() => {
    const definition = { nodes, edges };
    const blob = new Blob([JSON.stringify(definition, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow?.name || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('工作流已导出');
  }, [nodes, edges, workflow]);

  // 导入工作流
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const definition = JSON.parse(event.target.result);
            setNodes(definition.nodes || []);
            setEdges(definition.edges || []);
            setIsDirty(true);
            saveHistory();
            message.success('工作流已导入');
          } catch (error) {
            message.error('导入失败: 无效的JSON文件');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setNodes, setEdges, saveHistory]);

  // 节点配置保存
  const handleNodeConfigSave = useCallback(() => {
    configForm.validateFields().then((values) => {
      if (selectedNode) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === selectedNode.id
              ? {
                  ...n,
                  data: { ...n.data, ...values },
                }
              : n
          )
        );
        setIsDirty(true);
        saveHistory();
      }
      setNodeConfigVisible(false);
    });
  }, [configForm, selectedNode, setNodes, saveHistory]);

  // 右键菜单项
  const contextMenuItems = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑配置',
      onClick: () => {
        if (selectedNode) {
          onNodeDoubleClick(null, selectedNode);
        }
        setContextMenu(null);
      },
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制节点',
      onClick: () => {
        if (selectedNode) {
          handleCopyNode(selectedNode);
        }
        setContextMenu(null);
      },
    },
    {
      key: 'run',
      icon: <PlayCircleOutlined />,
      label: '运行此节点',
      onClick: () => {
        message.info('运行单个节点功能开发中');
        setContextMenu(null);
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除节点',
      danger: true,
      onClick: () => {
        if (selectedNode) {
          handleDeleteNode(selectedNode.id);
        }
        setContextMenu(null);
      },
    },
  ];

  return (
    <div className={styles.canvasContainer} ref={reactFlowWrapper}>
      <WorkflowToolbar
        onSave={handleSave}
        onRun={handleRun}
        onClear={handleClear}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onValidate={handleValidate}
        onExport={handleExport}
        onImport={handleImport}
        onFitView={fitView}
        onDelete={() => selectedNode && handleDeleteNode(selectedNode.id)}
        onSettings={() => message.info('设置功能开发中')}
        hasSelection={!!selectedNode}
        isDirty={isDirty}
        isValid={nodes.length > 0}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        workflowName={workflow?.name}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Control', 'Meta']}
        selectionKeyCode={['Shift']}
        className={styles.reactFlow}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type === 'model') return '#1890ff';
            if (n.type === 'input') return '#52c41a';
            if (n.type === 'output') return '#faad14';
            return '#eee';
          }}
          nodeColor={(n) => {
            if (n.type === 'model') return '#e6f7ff';
            if (n.type === 'input') return '#f6ffed';
            if (n.type === 'output') return '#fffbe6';
            return '#fff';
          }}
        />

        <Panel position="top-left" className={styles.helpPanel}>
          <div className={styles.helpText}>
            <p>🖱️ 拖拽模型到画布</p>
            <p>🔗 拖拽连接节点</p>
            <p>✏️ 双击编辑节点</p>
            <p>🗑️ 选中按 Delete 删除</p>
          </div>
        </Panel>
      </ReactFlow>

      {/* 右键菜单 */}
      {contextMenu && (
        <Dropdown
          menu={{ items: contextMenuItems }}
          open={true}
          onOpenChange={() => setContextMenu(null)}
        >
          <div
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 1000,
            }}
          />
        </Dropdown>
      )}

      {/* 节点配置弹窗 */}
      <Modal
        title="节点配置"
        open={nodeConfigVisible}
        onOk={handleNodeConfigSave}
        onCancel={() => setNodeConfigVisible(false)}
        destroyOnClose
      >
        <Form form={configForm} layout="vertical">
          <Form.Item
            name="label"
            label="节点名称"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input placeholder="输入节点名称" />
          </Form.Item>

          {selectedNode?.type === 'model' && (
            <Form.Item name="modelId" label="选择模型">
              <Select placeholder="选择模型" allowClear>
                {models?.map((model) => (
                  <Option key={model.id} value={model.id}>
                    {model.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="输入节点描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// 主组件 - 提供 ReactFlowProvider
const WorkflowCanvas = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasContent {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;
