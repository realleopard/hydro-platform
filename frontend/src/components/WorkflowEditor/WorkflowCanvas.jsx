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
import { message, Modal, Form, Input, Select, Menu, Dropdown, Table, Tag, Tooltip, Space, Button } from 'antd';
import {
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  WarningOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { nodeTypes } from './NodeTypes';
import { edgeTypes } from './EdgeTypes';
import WorkflowToolbar from './WorkflowToolbar';
import styles from './WorkflowEditor.module.css';

const { Option } = Select;

// 初始节点
const initialNodes = [];
const initialEdges = [];

// 解析模型的接口端口
const getModelPorts = (modelData) => {
  if (!modelData?.interfaces) return { inputs: [], outputs: [] };
  const interfaces = modelData.interfaces;
  let inputs = [];
  let outputs = [];
  if (Array.isArray(interfaces)) {
    inputs = interfaces.filter(i => i.type === 'input');
    outputs = interfaces.filter(i => i.type === 'output');
  } else if (interfaces.inputs || interfaces.outputs) {
    inputs = (interfaces.inputs || []).map(i => ({ ...i, type: 'input' }));
    outputs = (interfaces.outputs || []).map(i => ({ ...i, type: 'output' }));
  }
  return { inputs, outputs };
};

// 自动匹配端口：dataType 相同 + 名称相似优先
const autoMatchPorts = (sourceOutputs, targetInputs) => {
  const mappings = {};
  const used = new Set();

  // 第一轮：dataType 和 name 都匹配
  for (const target of targetInputs) {
    for (const source of sourceOutputs) {
      if (used.has(source.name)) continue;
      if (target.dataType === source.dataType && target.name === source.name) {
        mappings[target.name] = source.name;
        used.add(source.name);
        break;
      }
    }
  }

  // 第二轮：dataType 匹配
  for (const target of targetInputs) {
    if (mappings[target.name]) continue;
    for (const source of sourceOutputs) {
      if (used.has(source.name)) continue;
      if (target.dataType === source.dataType) {
        mappings[target.name] = source.name;
        used.add(source.name);
        break;
      }
    }
  }

  // 第三轮：尝试名称相似匹配（忽略大小写和下划线）
  for (const target of targetInputs) {
    if (mappings[target.name]) continue;
    const tName = target.name.toLowerCase().replace(/[_-]/g, '');
    for (const source of sourceOutputs) {
      if (used.has(source.name)) continue;
      const sName = source.name.toLowerCase().replace(/[_-]/g, '');
      if (tName.includes(sName) || sName.includes(tName)) {
        mappings[target.name] = source.name;
        used.add(source.name);
        break;
      }
    }
  }

  return mappings;
};

// 画布内容组件
const CanvasContent = ({
  workflow,
  onSave,
  onRun,
  onValidate,
  models,
  readOnly = false,
  onDefinitionChange,
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

  // 数据映射弹窗状态
  const [mappingModalVisible, setMappingModalVisible] = useState(false);
  const [mappingSourceNode, setMappingSourceNode] = useState(null);
  const [mappingTargetNode, setMappingTargetNode] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [mappingConfig, setMappingConfig] = useState({}); // { targetPortName: sourcePortName }
  const [editingEdgeId, setEditingEdgeId] = useState(null);

  const { project, fitView, getNodes, getEdges } = useReactFlow();

  // 加载工作流数据
  useEffect(() => {
    if (workflow?.definition) {
      const { nodes: workflowNodes = [], edges: workflowEdges = [] } = workflow.definition;
      setNodes(workflowNodes);
      // 恢复 edges 时设置正确的 type 和 data
      setEdges(workflowEdges.map(e => ({
        ...e,
        type: (e.data?.dataMapping && Object.keys(e.data.dataMapping).length > 0) ? 'dataFlow' : 'custom',
        data: {
          ...e.data,
          onDelete: handleDeleteEdge,
          onEdit: handleEditEdgeMapping,
        },
      })));
      setIsDirty(false);
    }
  }, [workflow]);

  // Sync current nodes/edges to parent whenever they change
  useEffect(() => {
    if (onDefinitionChange && nodes.length > 0) {
      onDefinitionChange({
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
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
          data: e.data,
        })),
      });
    }
  }, [nodes, edges]);

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

  // 删除边
  const handleDeleteEdge = useCallback(
    (edgeId) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setIsDirty(true);
      saveHistory();
    },
    [setEdges, saveHistory]
  );

  // 编辑边映射
  const handleEditEdgeMapping = useCallback(
    (edgeId) => {
      const edge = getEdges().find(e => e.id === edgeId);
      if (!edge) return;

      const sourceNode = getNodes().find(n => n.id === edge.source);
      const targetNode = getNodes().find(n => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      setEditingEdgeId(edgeId);
      setMappingSourceNode(sourceNode);
      setMappingTargetNode(targetNode);
      setMappingConfig(edge.data?.dataMapping || {});
      setMappingModalVisible(true);
    },
    [getNodes, getEdges]
  );

  // 连接节点
  const onConnect = useCallback(
    (params) => {
      const sourceNode = getNodes().find(n => n.id === params.source);
      const targetNode = getNodes().find(n => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      // 检查源和目标是否都有模型数据
      const sourceModel = sourceNode.data?.model;
      const targetModel = targetNode.data?.model;

      if (sourceModel && targetModel) {
        const sourcePorts = getModelPorts(sourceModel);
        const targetPorts = getModelPorts(targetModel);

        // 如果都有显式端口，打开映射配置弹窗
        if (sourcePorts.outputs.length > 0 && targetPorts.inputs.length > 0) {
          setPendingConnection(params);
          setMappingSourceNode(sourceNode);
          setMappingTargetNode(targetNode);
          setEditingEdgeId(null);

          // 自动匹配
          const autoMappings = autoMatchPorts(sourcePorts.outputs, targetPorts.inputs);
          setMappingConfig(autoMappings);
          setMappingModalVisible(true);
          return;
        }
      }

      // 无显式端口或非模型节点，直接连线
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        type: 'custom',
        data: { onDelete: handleDeleteEdge, onEdit: handleEditEdgeMapping },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setIsDirty(true);
      saveHistory();
    },
    [setEdges, saveHistory, getNodes, handleDeleteEdge, handleEditEdgeMapping]
  );

  // 确认数据映射
  const handleMappingConfirm = useCallback(() => {
    const hasMapping = Object.keys(mappingConfig).length > 0;
    const edgeId = editingEdgeId || `e${pendingConnection.source}-${pendingConnection.target}`;

    const newEdge = {
      id: edgeId,
      source: pendingConnection?.source || mappingSourceNode.id,
      target: pendingConnection?.target || mappingTargetNode.id,
      sourceHandle: pendingConnection?.sourceHandle,
      targetHandle: pendingConnection?.targetHandle,
      type: hasMapping ? 'dataFlow' : 'custom',
      data: {
        onDelete: handleDeleteEdge,
        onEdit: handleEditEdgeMapping,
        dataMapping: hasMapping ? mappingConfig : undefined,
        mapping: hasMapping
          ? Object.entries(mappingConfig).map(([t, s]) => `${s} → ${t}`).join(', ')
          : undefined,
      },
    };

    if (editingEdgeId) {
      // 更新已有边
      setEdges((eds) => eds.map(e => e.id === editingEdgeId ? newEdge : e));
    } else {
      // 添加新边
      setEdges((eds) => [...eds.filter(e => e.id !== edgeId), newEdge]);
    }

    setIsDirty(true);
    saveHistory();
    setMappingModalVisible(false);
    setPendingConnection(null);
    setEditingEdgeId(null);

    if (hasMapping) {
      message.success(`数据映射配置成功: ${Object.entries(mappingConfig).map(([t, s]) => `${s}→${t}`).join(', ')}`);
    }
  }, [mappingConfig, pendingConnection, editingEdgeId, mappingSourceNode, mappingTargetNode, setEdges, saveHistory, handleDeleteEdge, handleEditEdgeMapping]);

  // 双击边编辑映射
  const onEdgeDoubleClick = useCallback((_, edge) => {
    handleEditEdgeMapping(edge.id);
  }, [handleEditEdgeMapping]);

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
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type,
        data: e.data,
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

  // ===== 数据映射弹窗 =====
  const renderMappingModal = () => {
    if (!mappingSourceNode || !mappingTargetNode) return null;

    const sourceModel = mappingSourceNode.data?.model;
    const targetModel = mappingTargetNode.data?.model;
    const sourcePorts = getModelPorts(sourceModel);
    const targetPorts = getModelPorts(targetModel);

    if (sourcePorts.outputs.length === 0 && targetPorts.inputs.length === 0) {
      return null;
    }

    const columns = [
      {
        title: `${sourceModel?.name || '源'} 输出端口`,
        dataIndex: 'sourcePort',
        key: 'sourcePort',
        render: (port) => (
          <Space>
            <Tag color="blue">{port?.name}</Tag>
            {port?.dataType && <span style={{ fontSize: 11, color: '#8c8c8c' }}>{port.dataType}</span>}
          </Space>
        ),
      },
      {
        title: '',
        key: 'arrow',
        width: 50,
        render: () => <SwapOutlined style={{ color: '#52c41a' }} />,
      },
      {
        title: `${targetModel?.name || '目标'} 输入端口`,
        dataIndex: 'targetPort',
        key: 'targetPort',
        render: (port) => (
          <Space>
            <Tag color="green">{port?.name}</Tag>
            {port?.dataType && <span style={{ fontSize: 11, color: '#8c8c8c' }}>{port.dataType}</span>}
            {port?.required && <Tag color="red" style={{ fontSize: 10 }}>必填</Tag>}
          </Space>
        ),
      },
      {
        title: '兼容性',
        key: 'compat',
        width: 80,
        render: (_, record) => {
          const sType = record.sourcePort?.dataType;
          const tType = record.targetPort?.dataType;
          if (!sType || !tType) return <Tag>未知</Tag>;
          if (sType === tType) return <Tag color="success">兼容</Tag>;
          return (
            <Tooltip title={`类型不匹配: ${sType} ≠ ${tType}`}>
              <Tag color="warning" icon={<WarningOutlined />}>不匹配</Tag>
            </Tooltip>
          );
        },
      },
      {
        title: '操作',
        key: 'action',
        width: 80,
        render: (_, record) => (
          <Button
            type="link"
            danger
            size="small"
            onClick={() => {
              const newConfig = { ...mappingConfig };
              delete newConfig[record.targetPort.name];
              setMappingConfig(newConfig);
            }}
          >
            移除
          </Button>
        ),
      },
    ];

    // 构建映射行数据
    const dataSource = [];

    // 已映射的行
    for (const [targetName, sourceName] of Object.entries(mappingConfig)) {
      const sourcePort = sourcePorts.outputs.find(p => p.name === sourceName);
      const targetPort = targetPorts.inputs.find(p => p.name === targetName);
      if (targetPort) {
        dataSource.push({
          key: targetName,
          sourcePort: sourcePort || { name: sourceName, dataType: null },
          targetPort,
        });
      }
    }

    // 未映射的目标端口
    for (const targetPort of targetPorts.inputs) {
      if (!mappingConfig[targetPort.name]) {
        dataSource.push({
          key: targetPort.name,
          sourcePort: null,
          targetPort,
        });
      }
    }

    // 未被使用的源端口
    const usedSources = new Set(Object.values(mappingConfig));
    const unusedSourcePorts = sourcePorts.outputs.filter(p => !usedSources.has(p.name));

    return (
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#52c41a' }} />
            <span>数据映射配置</span>
            <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 'normal' }}>
              {sourceModel?.name} → {targetModel?.name}
            </span>
          </Space>
        }
        open={mappingModalVisible}
        onOk={handleMappingConfirm}
        onCancel={() => {
          setMappingModalVisible(false);
          setPendingConnection(null);
          setEditingEdgeId(null);
        }}
        okText="确认映射"
        cancelText="取消"
        width={700}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Space style={{ marginBottom: 8 }}>
            <Button
              size="small"
              onClick={() => {
                const autoMappings = autoMatchPorts(sourcePorts.outputs, targetPorts.inputs);
                setMappingConfig(autoMappings);
                message.success('已自动匹配端口');
              }}
            >
              自动匹配
            </Button>
            <Button
              size="small"
              onClick={() => setMappingConfig({})}
            >
              清除所有
            </Button>
          </Space>

          {unusedSourcePorts.length > 0 && (
            <div style={{ margin: '12px 0' }}>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
                点击源端口，再点击目标端口进行映射：
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#1890ff' }}>未映射输出:</span>
                {unusedSourcePorts.map(port => (
                  <Tag
                    key={port.name}
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      // 找到第一个未映射的输入端口
                      const unmappedInput = targetPorts.inputs.find(
                        t => !mappingConfig[t.name]
                      );
                      if (unmappedInput) {
                        setMappingConfig(prev => ({
                          ...prev,
                          [unmappedInput.name]: port.name,
                        }));
                      } else {
                        message.info('所有输入端口已映射');
                      }
                    }}
                  >
                    {port.name} ({port.dataType})
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无映射配置' }}
        />
      </Modal>
    );
  };

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
        onEdgeDoubleClick={onEdgeDoubleClick}
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
            <p>🔗 拖拽连接节点端口</p>
            <p>✏️ 双击编辑节点</p>
            <p>🔄 双击连线编辑映射</p>
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

      {/* 数据映射配置弹窗 */}
      {renderMappingModal()}
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
