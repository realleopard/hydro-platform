package com.example.testproject.service;

import com.example.testproject.dto.WorkflowDefinition;
import com.example.testproject.dto.WorkflowEdge;
import com.example.testproject.dto.WorkflowNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * DAG 解析器测试
 */
class DagParserTest {

    private DagParser dagParser;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        dagParser = new DagParser(objectMapper);
    }

    @Test
    void testParseValidWorkflow() throws Exception {
        // 构建一个简单的工作流: A -> B -> C
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = new WorkflowNode();
        nodeA.setId("node-a");
        nodeA.setType("model");
        nodeA.setName("节点A");
        nodeA.setModelId(UUID.randomUUID());

        WorkflowNode nodeB = new WorkflowNode();
        nodeB.setId("node-b");
        nodeB.setType("model");
        nodeB.setName("节点B");
        nodeB.setModelId(UUID.randomUUID());

        WorkflowNode nodeC = new WorkflowNode();
        nodeC.setId("node-c");
        nodeC.setType("model");
        nodeC.setName("节点C");
        nodeC.setModelId(UUID.randomUUID());

        definition.setNodes(Arrays.asList(nodeA, nodeB, nodeC));

        WorkflowEdge edge1 = new WorkflowEdge();
        edge1.setId("edge-1");
        edge1.setSource("node-a");
        edge1.setTarget("node-b");

        WorkflowEdge edge2 = new WorkflowEdge();
        edge2.setId("edge-2");
        edge2.setSource("node-b");
        edge2.setTarget("node-c");

        definition.setEdges(Arrays.asList(edge1, edge2));

        String json = objectMapper.writeValueAsString(definition);
        WorkflowDefinition parsed = dagParser.parse(json);

        assertNotNull(parsed);
        assertEquals(3, parsed.getNodes().size());
        assertEquals(2, parsed.getEdges().size());
        assertEquals("node-a", parsed.getNodes().get(0).getId());
    }

    @Test
    void testValidateValidWorkflow() {
        // 构建一个有效的并行工作流:
        //       -> B ->
        //  A ->          -> D
        //       -> C ->
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        WorkflowNode nodeB = createNode("node-b", "节点B");
        WorkflowNode nodeC = createNode("node-c", "节点C");
        WorkflowNode nodeD = createNode("node-d", "节点D");

        definition.setNodes(Arrays.asList(nodeA, nodeB, nodeC, nodeD));

        WorkflowEdge edge1 = createEdge("edge-1", "node-a", "node-b");
        WorkflowEdge edge2 = createEdge("edge-2", "node-a", "node-c");
        WorkflowEdge edge3 = createEdge("edge-3", "node-b", "node-d");
        WorkflowEdge edge4 = createEdge("edge-4", "node-c", "node-d");

        definition.setEdges(Arrays.asList(edge1, edge2, edge3, edge4));

        DagParser.ValidationResult result = dagParser.validate(definition);

        assertTrue(result.isValid(), "工作流应该是有效的: " + result.getErrorMessage());
        assertTrue(result.getErrors().isEmpty());
    }

    @Test
    void testValidateEmptyWorkflow() {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setNodes(Collections.emptyList());

        DagParser.ValidationResult result = dagParser.validate(definition);

        assertFalse(result.isValid());
        assertTrue(result.getErrors().contains("工作流必须包含至少一个节点"));
    }

    @Test
    void testValidateDuplicateNodeId() {
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode node1 = createNode("same-id", "节点1");
        WorkflowNode node2 = createNode("same-id", "节点2");

        definition.setNodes(Arrays.asList(node1, node2));
        definition.setEdges(Collections.emptyList());

        DagParser.ValidationResult result = dagParser.validate(definition);

        assertFalse(result.isValid());
        assertTrue(result.getErrors().stream()
                .anyMatch(e -> e.contains("节点ID重复")));
    }

    @Test
    void testValidateMissingNodeReference() {
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        definition.setNodes(Collections.singletonList(nodeA));

        WorkflowEdge edge = createEdge("edge-1", "node-a", "node-b");
        definition.setEdges(Collections.singletonList(edge));

        DagParser.ValidationResult result = dagParser.validate(definition);

        assertFalse(result.isValid());
        assertTrue(result.getErrors().stream()
                .anyMatch(e -> e.contains("边引用了不存在的目标节点")));
    }

    @Test
    void testValidateSelfLoop() {
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        definition.setNodes(Collections.singletonList(nodeA));

        WorkflowEdge edge = createEdge("edge-1", "node-a", "node-a");
        definition.setEdges(Collections.singletonList(edge));

        DagParser.ValidationResult result = dagParser.validate(definition);

        assertFalse(result.isValid());
        assertTrue(result.getErrors().stream()
                .anyMatch(e -> e.contains("边不能连接节点到自身")));
    }

    @Test
    void testValidateCycle() {
        // A -> B -> C -> A (循环依赖)
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        WorkflowNode nodeB = createNode("node-b", "节点B");
        WorkflowNode nodeC = createNode("node-c", "节点C");

        definition.setNodes(Arrays.asList(nodeA, nodeB, nodeC));

        WorkflowEdge edge1 = createEdge("edge-1", "node-a", "node-b");
        WorkflowEdge edge2 = createEdge("edge-2", "node-b", "node-c");
        WorkflowEdge edge3 = createEdge("edge-3", "node-c", "node-a");

        definition.setEdges(Arrays.asList(edge1, edge2, edge3));

        DagParser.ValidationResult result = dagParser.validate(definition);

        assertFalse(result.isValid());
        assertTrue(result.getErrors().contains("工作流存在循环依赖"));
    }

    @Test
    void testGetIncomingEdges() {
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        WorkflowNode nodeB = createNode("node-b", "节点B");

        definition.setNodes(Arrays.asList(nodeA, nodeB));

        WorkflowEdge edge = createEdge("edge-1", "node-a", "node-b");
        definition.setEdges(Collections.singletonList(edge));

        var incomingEdges = dagParser.getIncomingEdges(definition, "node-b");

        assertEquals(1, incomingEdges.size());
        assertEquals("node-a", incomingEdges.get(0).getSource());
    }

    @Test
    void testGetOutgoingEdges() {
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = createNode("node-a", "节点A");
        WorkflowNode nodeB = createNode("node-b", "节点B");

        definition.setNodes(Arrays.asList(nodeA, nodeB));

        WorkflowEdge edge = createEdge("edge-1", "node-a", "node-b");
        definition.setEdges(Collections.singletonList(edge));

        var outgoingEdges = dagParser.getOutgoingEdges(definition, "node-a");

        assertEquals(1, outgoingEdges.size());
        assertEquals("node-b", outgoingEdges.get(0).getTarget());
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
