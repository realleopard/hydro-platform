import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow
} from 'react-flow-renderer';
import ModelNode from './ModelNode';
import './WorkflowEditor.css';

// 注册自定义节点类型
const nodeTypes = {
  modelNode: ModelNode
};

const WorkflowEditorInner = ({ workflow, onSave }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const { project } = useReactFlow();

  // 初始化工作流数据
  React.useEffect(() => {
    if (workflow?.definition) {
      const { nodes: flowNodes = [], edges: flowEdges = [] } = workflow.definition;

      setNodes(flowNodes.map(node => ({
        id: node.id,
        type: 'modelNode',
        position: node.position || { x: 0, y: 0 },
        data: {
          label: node.name,
          modelType: node.type,
          description: node.description,
          modelId: node.modelId,
          config: node.config,
          onDelete: () => handleDeleteNode(node.id),
          onConfigure: () => handleConfigureNode(node)
        }
      })));

      setEdges(flowEdges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: true
      })));
    }
  }, [workflow]);

  // 连接节点
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, [setEdges]);

  // 删除节点
  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  // 配置节点
  const handleConfigureNode = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  // 拖拽添加节点
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const modelData = JSON.parse(event.dataTransfer.getData('modelData') || '{}');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      });

      const newNode = {
        id: `node-${Date.now()}`,
        type: 'modelNode',
        position,
        data: {
          label: modelData.name || '新节点',
          modelType: type,
          description: modelData.description,
          modelId: modelData.id,
          config: {},
          onDelete: () => handleDeleteNode(`node-${Date.now()}`),
          onConfigure: () => handleConfigureNode(modelData)
        }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes]
  );

  // 保存工作流
  const handleSave = useCallback(() => {
    if (!reactFlowInstance) return;

    const flowData = reactFlowInstance.toObject();

    const definition = {
      nodes: flowData.nodes.map(node => ({
        id: node.id,
        type: node.data.modelType,
        name: node.data.label,
        modelId: node.data.modelId,
        description: node.data.description,
        position: node.position,
        config: node.data.config
      })),
      edges: flowData.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target
      }))
    };

    onSave?.(definition);
  }, [reactFlowInstance, onSave]);

  return (
    <div className="workflow-editor">
      <div className="workflow-editor-toolbar">
        <h3>{workflow?.name || '新建工作流'}</h3>
        <div className="toolbar-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            💾 保存
          </button>
        </div>
      </div>

      <div className="workflow-editor-content" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n.type === 'modelNode') return '#1890ff';
              return '#d9d9d9';
            }}
            nodeColor={(n) => {
              if (n.type === 'modelNode') return '#e6f7ff';
              return '#fff';
            }}
          />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={(config) => {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === selectedNode.id
                  ? { ...n, data: { ...n.data, config } }
                  : n
              )
            );
            setSelectedNode(null);
          }}
        />
      )}
    </div>
  );
};

// 节点配置面板
const NodeConfigPanel = ({ node, onClose, onSave }) => {
  const [config, setConfig] = useState(node.config || {});

  return (
    <div className="node-config-panel">
      <div className="panel-header">
        <h4>节点配置: {node.name}</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="panel-body">
        <div className="form-group">
          <label>节点名称</label>
          <input
            type="text"
            value={config.name || node.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>超时时间（秒）</label>
          <input
            type="number"
            value={config.timeout || 3600}
            onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
          />
        </div>

        <div className="form-group">
          <label>输入数据映射</label>
          <textarea
            value={JSON.stringify(config.inputMapping || {}, null, 2)}
            onChange={(e) => {
              try {
                setConfig({ ...config, inputMapping: JSON.parse(e.target.value) });
              } catch {}
            }}
            rows={4}
          />
        </div>
      </div>
      <div className="panel-footer">
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn btn-primary" onClick={() => onSave(config)}>
          保存
        </button>
      </div>
    </div>
  );
};

const WorkflowEditor = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowEditor;
