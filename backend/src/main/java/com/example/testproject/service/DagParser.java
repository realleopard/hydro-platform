package com.example.testproject.service;

import com.example.testproject.dto.WorkflowDefinition;
import com.example.testproject.dto.WorkflowEdge;
import com.example.testproject.dto.WorkflowNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * DAG 解析器
 * 解析工作流定义的 JSON，构建节点和边的关系
 */
@Slf4j
@Component
public class DagParser {

    private final ObjectMapper objectMapper;

    public DagParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * 解析工作流定义 JSON
     *
     * @param definitionJson 工作流定义 JSON 字符串
     * @return WorkflowDefinition 对象
     */
    public WorkflowDefinition parse(String definitionJson) {
        try {
            if (definitionJson == null || definitionJson.isEmpty()) {
                throw new IllegalArgumentException("工作流定义不能为空");
            }
            return objectMapper.readValue(definitionJson, WorkflowDefinition.class);
        } catch (Exception e) {
            log.error("解析工作流定义失败: {}", e.getMessage());
            throw new RuntimeException("解析工作流定义失败", e);
        }
    }

    /**
     * 验证工作流定义的有效性
     *
     * @param definition 工作流定义
     * @return 验证结果
     */
    public ValidationResult validate(WorkflowDefinition definition) {
        List<String> errors = new ArrayList<>();

        if (definition == null) {
            errors.add("工作流定义不能为空");
            return new ValidationResult(false, errors);
        }

        List<WorkflowNode> nodes = definition.getNodes();
        List<WorkflowEdge> edges = definition.getEdges();

        // 检查节点列表
        if (nodes == null || nodes.isEmpty()) {
            errors.add("工作流必须包含至少一个节点");
            return new ValidationResult(false, errors);
        }

        // 检查节点ID唯一性
        Set<String> nodeIds = new HashSet<>();
        for (WorkflowNode node : nodes) {
            if (node.getId() == null || node.getId().isEmpty()) {
                errors.add("节点ID不能为空");
            } else if (!nodeIds.add(node.getId())) {
                errors.add("节点ID重复: " + node.getId());
            }
        }

        // 检查边引用的节点是否存在
        if (edges != null) {
            for (WorkflowEdge edge : edges) {
                if (edge.getSource() == null || edge.getSource().isEmpty()) {
                    errors.add("边的源节点不能为空");
                } else if (!nodeIds.contains(edge.getSource())) {
                    errors.add("边引用了不存在的源节点: " + edge.getSource());
                }

                if (edge.getTarget() == null || edge.getTarget().isEmpty()) {
                    errors.add("边的目标节点不能为空");
                } else if (!nodeIds.contains(edge.getTarget())) {
                    errors.add("边引用了不存在的目标节点: " + edge.getTarget());
                }

                if (edge.getSource() != null && edge.getSource().equals(edge.getTarget())) {
                    errors.add("边不能连接节点到自身: " + edge.getSource());
                }
            }
        }

        // 检查是否有循环依赖
        if (errors.isEmpty() && hasCycle(definition)) {
            errors.add("工作流存在循环依赖");
        }

        // 检查是否有起点节点（没有入边的节点）
        if (errors.isEmpty()) {
            Set<String> nodesWithIncomingEdge = new HashSet<>();
            if (edges != null) {
                for (WorkflowEdge edge : edges) {
                    nodesWithIncomingEdge.add(edge.getTarget());
                }
            }

            boolean hasStartNode = false;
            for (WorkflowNode node : nodes) {
                if (!nodesWithIncomingEdge.contains(node.getId())) {
                    hasStartNode = true;
                    break;
                }
            }

            if (!hasStartNode) {
                errors.add("工作流必须有至少一个起点节点（无入边的节点）");
            }
        }

        return new ValidationResult(errors.isEmpty(), errors);
    }

    /**
     * 检测工作流是否有循环依赖
     */
    private boolean hasCycle(WorkflowDefinition definition) {
        Map<String, List<String>> graph = buildAdjacencyList(definition);
        Set<String> visited = new HashSet<>();
        Set<String> recStack = new HashSet<>();

        for (String nodeId : graph.keySet()) {
            if (hasCycleDFS(nodeId, graph, visited, recStack)) {
                return true;
            }
        }

        return false;
    }

    private boolean hasCycleDFS(String nodeId, Map<String, List<String>> graph,
                                 Set<String> visited, Set<String> recStack) {
        if (recStack.contains(nodeId)) {
            return true;
        }

        if (visited.contains(nodeId)) {
            return false;
        }

        visited.add(nodeId);
        recStack.add(nodeId);

        List<String> neighbors = graph.getOrDefault(nodeId, new ArrayList<>());
        for (String neighbor : neighbors) {
            if (hasCycleDFS(neighbor, graph, visited, recStack)) {
                return true;
            }
        }

        recStack.remove(nodeId);
        return false;
    }

    private Map<String, List<String>> buildAdjacencyList(WorkflowDefinition definition) {
        Map<String, List<String>> graph = new HashMap<>();

        // 初始化所有节点
        for (WorkflowNode node : definition.getNodes()) {
            graph.put(node.getId(), new ArrayList<>());
        }

        // 添加边
        if (definition.getEdges() != null) {
            for (WorkflowEdge edge : definition.getEdges()) {
                graph.get(edge.getSource()).add(edge.getTarget());
            }
        }

        return graph;
    }

    /**
     * 获取节点的入边
     */
    public List<WorkflowEdge> getIncomingEdges(WorkflowDefinition definition, String nodeId) {
        List<WorkflowEdge> incomingEdges = new ArrayList<>();
        if (definition.getEdges() != null) {
            for (WorkflowEdge edge : definition.getEdges()) {
                if (edge.getTarget().equals(nodeId)) {
                    incomingEdges.add(edge);
                }
            }
        }
        return incomingEdges;
    }

    /**
     * 获取节点的出边
     */
    public List<WorkflowEdge> getOutgoingEdges(WorkflowDefinition definition, String nodeId) {
        List<WorkflowEdge> outgoingEdges = new ArrayList<>();
        if (definition.getEdges() != null) {
            for (WorkflowEdge edge : definition.getEdges()) {
                if (edge.getSource().equals(nodeId)) {
                    outgoingEdges.add(edge);
                }
            }
        }
        return outgoingEdges;
    }

    /**
     * 验证结果
     */
    public static class ValidationResult {
        private final boolean valid;
        private final List<String> errors;

        public ValidationResult(boolean valid, List<String> errors) {
            this.valid = valid;
            this.errors = errors;
        }

        public boolean isValid() {
            return valid;
        }

        public List<String> getErrors() {
            return errors;
        }

        public String getErrorMessage() {
            return String.join("; ", errors);
        }
    }
}
