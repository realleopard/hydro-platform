package com.example.testproject.service;

import com.example.testproject.dto.ExecutionPlan;
import com.example.testproject.dto.WorkflowDefinition;
import com.example.testproject.dto.WorkflowEdge;
import com.example.testproject.dto.WorkflowNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 依赖解析器测试
 */
class DependencyResolverTest {

    private DagParser dagParser;
    private DependencyResolver dependencyResolver;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        dagParser = new DagParser(objectMapper);
        dependencyResolver = new DependencyResolver(dagParser, new ConditionEvaluator());
    }

    @Test
    void testGenerateExecutionPlan_SerialWorkflow() {
        // 串行工作流: A -> B -> C
        WorkflowDefinition definition = createSerialWorkflow();

        UUID taskId = UUID.randomUUID();
        UUID workflowId = UUID.randomUUID();

        ExecutionPlan plan = dependencyResolver.generateExecutionPlan(definition, taskId, workflowId);

        assertNotNull(plan);
        assertEquals(taskId, plan.getTaskId());
        assertEquals(workflowId, plan.getWorkflowId());

        // 串行工作流应该有3个阶段
        assertEquals(3, plan.getStages().size());

        // 每个阶段只有一个节点
        assertEquals(1, plan.getStages().get(0).getNodeIds().size());
        assertEquals(1, plan.getStages().get(1).getNodeIds().size());
        assertEquals(1, plan.getStages().get(2).getNodeIds().size());

        // 验证执行顺序
        assertEquals("node-a", plan.getStages().get(0).getNodeIds().get(0));
        assertEquals("node-b", plan.getStages().get(1).getNodeIds().get(0));
        assertEquals("node-c", plan.getStages().get(2).getNodeIds().get(0));
    }

    @Test
    void testGenerateExecutionPlan_ParallelWorkflow() {
        // 并行工作流:
        //       -> B ->
        //  A ->          -> D
        //       -> C ->
        WorkflowDefinition definition = createParallelWorkflow();

        UUID taskId = UUID.randomUUID();
        UUID workflowId = UUID.randomUUID();

        ExecutionPlan plan = dependencyResolver.generateExecutionPlan(definition, taskId, workflowId);

        assertNotNull(plan);
        // 应该有3个阶段：第1阶段[A]，第2阶段[B,C]，第3阶段[D]
        assertEquals(3, plan.getStages().size());

        // 第1阶段：只有A
        assertEquals(1, plan.getStages().get(0).getNodeIds().size());
        assertTrue(plan.getStages().get(0).getNodeIds().contains("node-a"));

        // 第2阶段：B和C并行
        assertEquals(2, plan.getStages().get(1).getNodeIds().size());
        assertTrue(plan.getStages().get(1).getNodeIds().contains("node-b"));
        assertTrue(plan.getStages().get(1).getNodeIds().contains("node-c"));

        // 第3阶段：只有D
        assertEquals(1, plan.getStages().get(2).getNodeIds().size());
        assertTrue(plan.getStages().get(2).getNodeIds().contains("node-d"));
    }

    @Test
    void testGenerateExecutionPlan_NodeConfigs() {
        WorkflowDefinition definition = createParallelWorkflow();

        UUID taskId = UUID.randomUUID();
        UUID workflowId = UUID.randomUUID();

        ExecutionPlan plan = dependencyResolver.generateExecutionPlan(definition, taskId, workflowId);

        // 验证节点配置
        assertNotNull(plan.getNodeConfigs());
        assertEquals(4, plan.getNodeConfigs().size());

        // 验证A节点的依赖关系
        ExecutionPlan.NodeExecutionConfig configA = plan.getNodeConfigs().get("node-a");
        assertNotNull(configA);
        assertTrue(configA.getDependencies().isEmpty()); // A没有依赖
        assertEquals(2, configA.getDependents().size()); // A被B和C依赖
        assertTrue(configA.getDependents().contains("node-b"));
        assertTrue(configA.getDependents().contains("node-c"));

        // 验证D节点的依赖关系
        ExecutionPlan.NodeExecutionConfig configD = plan.getNodeConfigs().get("node-d");
        assertNotNull(configD);
        assertEquals(2, configD.getDependencies().size()); // D依赖B和C
        assertTrue(configD.getDependencies().contains("node-b"));
        assertTrue(configD.getDependencies().contains("node-c"));
        assertTrue(configD.getDependents().isEmpty()); // D没有被依赖

        // 验证优先级：D的依赖最多，优先级应该最高
        assertTrue(configD.getPriority() > configA.getPriority());
    }

    @Test
    void testGetDependencies() {
        WorkflowDefinition definition = createParallelWorkflow();

        // D节点依赖B和C
        List<String> dependencies = dependencyResolver.getDependencies(definition, "node-d");
        assertEquals(2, dependencies.size());
        assertTrue(dependencies.contains("node-b"));
        assertTrue(dependencies.contains("node-c"));

        // A节点没有依赖
        List<String> dependenciesA = dependencyResolver.getDependencies(definition, "node-a");
        assertTrue(dependenciesA.isEmpty());
    }

    @Test
    void testGetDependents() {
        WorkflowDefinition definition = createParallelWorkflow();

        // A节点被B和C依赖
        List<String> dependents = dependencyResolver.getDependents(definition, "node-a");
        assertEquals(2, dependents.size());
        assertTrue(dependents.contains("node-b"));
        assertTrue(dependents.contains("node-c"));

        // D节点没有被依赖
        List<String> dependentsD = dependencyResolver.getDependents(definition, "node-d");
        assertTrue(dependentsD.isEmpty());
    }

    @Test
    void testGetDataMapping() {
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        WorkflowNode nodeB = createNode("node-b", "节点B");
        definition.setNodes(Arrays.asList(nodeA, nodeB));

        WorkflowEdge edge = new WorkflowEdge();
        edge.setId("edge-1");
        edge.setSource("node-a");
        edge.setTarget("node-b");
        Map<String, String> dataMapping = new HashMap<>();
        dataMapping.put("output.runoff", "input.inflow");
        edge.setDataMapping(dataMapping);
        definition.setEdges(Collections.singletonList(edge));

        Map<String, String> result = dependencyResolver.getDataMapping(definition, "node-a", "node-b");

        assertNotNull(result);
        assertEquals("input.inflow", result.get("output.runoff"));
    }

    @Test
    void testComplexWorkflow() {
        // 复杂工作流:
        //       -> B -> D ->
        //  A ->                -> F
        //       -> C -> E ->
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        WorkflowNode nodeB = createNode("node-b", "节点B");
        WorkflowNode nodeC = createNode("node-c", "节点C");
        WorkflowNode nodeD = createNode("node-d", "节点D");
        WorkflowNode nodeE = createNode("node-e", "节点E");
        WorkflowNode nodeF = createNode("node-f", "节点F");

        definition.setNodes(Arrays.asList(nodeA, nodeB, nodeC, nodeD, nodeE, nodeF));

        List<WorkflowEdge> edges = new ArrayList<>();
        edges.add(createEdge("edge-1", "node-a", "node-b"));
        edges.add(createEdge("edge-2", "node-a", "node-c"));
        edges.add(createEdge("edge-3", "node-b", "node-d"));
        edges.add(createEdge("edge-4", "node-c", "node-e"));
        edges.add(createEdge("edge-5", "node-d", "node-f"));
        edges.add(createEdge("edge-6", "node-e", "node-f"));
        definition.setEdges(edges);

        UUID taskId = UUID.randomUUID();
        UUID workflowId = UUID.randomUUID();

        ExecutionPlan plan = dependencyResolver.generateExecutionPlan(definition, taskId, workflowId);

        assertEquals(4, plan.getStages().size());
        // 第1阶段: A
        assertEquals(1, plan.getStages().get(0).getNodeIds().size());
        // 第2阶段: B, C
        assertEquals(2, plan.getStages().get(1).getNodeIds().size());
        // 第3阶段: D, E
        assertEquals(2, plan.getStages().get(2).getNodeIds().size());
        // 第4阶段: F
        assertEquals(1, plan.getStages().get(3).getNodeIds().size());
    }

    private WorkflowDefinition createSerialWorkflow() {
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        WorkflowNode nodeB = createNode("node-b", "节点B");
        WorkflowNode nodeC = createNode("node-c", "节点C");

        definition.setNodes(Arrays.asList(nodeA, nodeB, nodeC));

        List<WorkflowEdge> edges = new ArrayList<>();
        edges.add(createEdge("edge-1", "node-a", "node-b"));
        edges.add(createEdge("edge-2", "node-b", "node-c"));
        definition.setEdges(edges);

        return definition;
    }

    private WorkflowDefinition createParallelWorkflow() {
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        WorkflowNode nodeB = createNode("node-b", "节点B");
        WorkflowNode nodeC = createNode("node-c", "节点C");
        WorkflowNode nodeD = createNode("node-d", "节点D");

        definition.setNodes(Arrays.asList(nodeA, nodeB, nodeC, nodeD));

        List<WorkflowEdge> edges = new ArrayList<>();
        edges.add(createEdge("edge-1", "node-a", "node-b"));
        edges.add(createEdge("edge-2", "node-a", "node-c"));
        edges.add(createEdge("edge-3", "node-b", "node-d"));
        edges.add(createEdge("edge-4", "node-c", "node-d"));
        definition.setEdges(edges);

        return definition;
    }

    private WorkflowNode createNode(String id, String name) {
        WorkflowNode node = new WorkflowNode();
        node.setId(id);
        node.setName(name);
        node.setType("model");
        node.setModelId(UUID.randomUUID());
        return node;
    }

    private WorkflowEdge createEdge(String id, String source, String target) {
        WorkflowEdge edge = new WorkflowEdge();
        edge.setId(id);
        edge.setSource(source);
        edge.setTarget(target);
        return edge;
    }
}
