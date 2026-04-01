package com.example.testproject.service;

import com.example.testproject.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * 依赖解析器
 * 计算工作流节点的执行顺序和依赖关系
 */
@Slf4j
@Component
public class DependencyResolver {

    private final DagParser dagParser;
    private final ConditionEvaluator conditionEvaluator;

    public DependencyResolver(DagParser dagParser, ConditionEvaluator conditionEvaluator) {
        this.dagParser = dagParser;
        this.conditionEvaluator = conditionEvaluator;
    }

    /**
     * 生成执行计划
     *
     * @param workflowDefinition 工作流定义
     * @param taskId             任务ID
     * @param workflowId         工作流ID
     * @return 执行计划
     */
    public ExecutionPlan generateExecutionPlan(WorkflowDefinition workflowDefinition,
                                               UUID taskId, UUID workflowId) {
        ExecutionPlan plan = new ExecutionPlan();
        plan.setId(UUID.randomUUID());
        plan.setTaskId(taskId);
        plan.setWorkflowId(workflowId);
        plan.setCreatedAt(java.time.LocalDateTime.now());

        // 计算拓扑排序
        List<List<String>> executionStages = topologicalSort(workflowDefinition);

        // 构建执行阶段
        List<ExecutionPlan.ExecutionStage> stages = new ArrayList<>();
        for (int i = 0; i < executionStages.size(); i++) {
            ExecutionPlan.ExecutionStage stage = new ExecutionPlan.ExecutionStage();
            stage.setStageIndex(i);
            stage.setNodeIds(executionStages.get(i));
            stage.setDescription("第 " + (i + 1) + " 阶段：并行执行 " + executionStages.get(i).size() + " 个节点");
            stages.add(stage);
        }
        plan.setStages(stages);

        // 构建节点执行配置
        Map<String, ExecutionPlan.NodeExecutionConfig> nodeConfigs = new HashMap<>();
        for (WorkflowNode node : workflowDefinition.getNodes()) {
            ExecutionPlan.NodeExecutionConfig config = new ExecutionPlan.NodeExecutionConfig();
            config.setNodeId(node.getId());
            config.setDependencies(getDependencies(workflowDefinition, node.getId()));
            config.setDependents(getDependents(workflowDefinition, node.getId()));
            config.setPriority(calculatePriority(workflowDefinition, node.getId()));
            config.setTimeout(getTimeout(node));
            nodeConfigs.put(node.getId(), config);
        }
        plan.setNodeConfigs(nodeConfigs);

        log.info("生成执行计划：taskId={}, 共 {} 个阶段", taskId, stages.size());
        return plan;
    }

    /**
     * 拓扑排序 - 将节点分组为可并行执行的阶段
     */
    private List<List<String>> topologicalSort(WorkflowDefinition definition) {
        Map<String, List<String>> graph = buildGraph(definition);
        Map<String, Integer> inDegree = calculateInDegree(definition);

        List<List<String>> stages = new ArrayList<>();
        Set<String> processed = new HashSet<>();

        while (processed.size() < definition.getNodes().size()) {
            // 找到当前入度为0且未处理的节点
            List<String> currentStage = new ArrayList<>();
            for (WorkflowNode node : definition.getNodes()) {
                String nodeId = node.getId();
                if (!processed.contains(nodeId) && inDegree.getOrDefault(nodeId, 0) == 0) {
                    currentStage.add(nodeId);
                }
            }

            if (currentStage.isEmpty()) {
                throw new RuntimeException("工作流存在循环依赖，无法完成拓扑排序");
            }

            stages.add(currentStage);
            processed.addAll(currentStage);

            // 更新入度
            for (String nodeId : currentStage) {
                for (String neighbor : graph.getOrDefault(nodeId, new ArrayList<>())) {
                    inDegree.put(neighbor, inDegree.get(neighbor) - 1);
                }
            }
        }

        return stages;
    }

    /**
     * 获取节点的依赖（入边节点）
     */
    public List<String> getDependencies(WorkflowDefinition definition, String nodeId) {
        List<String> dependencies = new ArrayList<>();
        if (definition.getEdges() != null) {
            for (WorkflowEdge edge : definition.getEdges()) {
                if (edge.getTarget().equals(nodeId)) {
                    dependencies.add(edge.getSource());
                }
            }
        }
        return dependencies;
    }

    /**
     * 获取节点被谁依赖（出边节点）
     */
    public List<String> getDependents(WorkflowDefinition definition, String nodeId) {
        List<String> dependents = new ArrayList<>();
        if (definition.getEdges() != null) {
            for (WorkflowEdge edge : definition.getEdges()) {
                if (edge.getSource().equals(nodeId)) {
                    dependents.add(edge.getTarget());
                }
            }
        }
        return dependents;
    }

    /**
     * 计算节点执行优先级
     * 依赖越多的节点优先级越高（后续节点需要它的结果）
     */
    private Integer calculatePriority(WorkflowDefinition definition, String nodeId) {
        int dependencyCount = getDependencies(definition, nodeId).size();
        // 基础优先级 50，每有一个依赖节点加 10
        return 50 + dependencyCount * 10;
    }

    /**
     * 获取节点超时时间
     */
    private Integer getTimeout(WorkflowNode node) {
        if (node.getConfig() != null && node.getConfig().containsKey("timeout")) {
            return (Integer) node.getConfig().get("timeout");
        }
        return 3600; // 默认 1 小时
    }

    private Map<String, List<String>> buildGraph(WorkflowDefinition definition) {
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

    private Map<String, Integer> calculateInDegree(WorkflowDefinition definition) {
        Map<String, Integer> inDegree = new HashMap<>();

        // 初始化所有节点入度为0
        for (WorkflowNode node : definition.getNodes()) {
            inDegree.put(node.getId(), 0);
        }

        // 统计入度
        if (definition.getEdges() != null) {
            for (WorkflowEdge edge : definition.getEdges()) {
                inDegree.put(edge.getTarget(), inDegree.get(edge.getTarget()) + 1);
            }
        }

        return inDegree;
    }

    /**
     * 获取满足条件的活跃依赖节点
     * 检查目标节点的每条入边，返回边条件满足（或无条件）的前驱节点ID列表
     *
     * @param definition        工作流定义
     * @param nodeId            目标节点ID
     * @param predecessorOutputs 前驱节点的输出数据，key为前驱节点ID，value为该节点输出的JSON解析结果
     * @return 满足条件的活跃依赖节点ID列表
     */
    public List<String> getActiveDependencies(WorkflowDefinition definition,
                                               String nodeId,
                                               Map<String, Map<String, Object>> predecessorOutputs) {
        List<String> activeDeps = new ArrayList<>();

        if (definition.getEdges() == null) {
            return activeDeps;
        }

        for (WorkflowEdge edge : definition.getEdges()) {
            if (!edge.getTarget().equals(nodeId)) {
                continue;
            }

            String sourceId = edge.getSource();
            String condition = edge.getCondition();

            // 无条件的边始终激活
            if (condition == null || condition.trim().isEmpty()) {
                activeDeps.add(sourceId);
                continue;
            }

            // 获取前驱节点的输出数据作为评估上下文
            Map<String, Object> context = predecessorOutputs != null
                    ? predecessorOutputs.getOrDefault(sourceId, new HashMap<>())
                    : new HashMap<>();

            boolean satisfied = conditionEvaluator.evaluate(condition, context);
            if (satisfied) {
                activeDeps.add(sourceId);
            } else {
                log.debug("边条件不满足: edgeId={}, source={}, target={}, condition='{}'",
                        edge.getId(), sourceId, nodeId, condition);
            }
        }

        return activeDeps;
    }

    /**
     * 判断节点是否应该被跳过
     * 如果节点的所有入边都有条件且所有条件都不满足，则该节点应被跳过
     *
     * @param definition        工作流定义
     * @param nodeId            节点ID
     * @param predecessorOutputs 前驱节点的输出数据
     * @return true 表示节点应该被跳过
     */
    public boolean shouldSkipNode(WorkflowDefinition definition,
                                   String nodeId,
                                   Map<String, Map<String, Object>> predecessorOutputs) {
        if (definition.getEdges() == null) {
            // 没有边，不应跳过（根节点）
            return false;
        }

        // 收集所有指向该节点的边
        List<WorkflowEdge> incomingEdges = new ArrayList<>();
        for (WorkflowEdge edge : definition.getEdges()) {
            if (edge.getTarget().equals(nodeId)) {
                incomingEdges.add(edge);
            }
        }

        // 没有入边的根节点不应跳过
        if (incomingEdges.isEmpty()) {
            return false;
        }

        // 检查是否所有入边都有条件且都不满足
        boolean hasUnconditionalEdge = false;
        for (WorkflowEdge edge : incomingEdges) {
            String condition = edge.getCondition();
            if (condition == null || condition.trim().isEmpty()) {
                // 存在无条件边，不应跳过
                hasUnconditionalEdge = true;
                break;
            }
        }

        // 如果有至少一条无条件边，节点不应跳过
        if (hasUnconditionalEdge) {
            return false;
        }

        // 所有入边都有条件，检查是否至少有一条满足
        List<String> activeDeps = getActiveDependencies(definition, nodeId, predecessorOutputs);
        return activeDeps.isEmpty();
    }

    /**
     * 获取数据映射配置
     */
    public Map<String, String> getDataMapping(WorkflowDefinition definition, String sourceNodeId, String targetNodeId) {
        if (definition.getEdges() == null) {
            return new HashMap<>();
        }

        for (WorkflowEdge edge : definition.getEdges()) {
            if (edge.getSource().equals(sourceNodeId) && edge.getTarget().equals(targetNodeId)) {
                return edge.getDataMapping() != null ? edge.getDataMapping() : new HashMap<>();
            }
        }

        return new HashMap<>();
    }

    /**
     * 获取目标节点的所有入边数据映射
     * 合并所有指向目标节点的边上的 dataMapping 配置
     *
     * @param definition 工作流定义
     * @param targetNodeId 目标节点ID
     * @return 合并后的数据映射，key=target_field, value=source_field 表达式
     */
    public Map<String, String> getIncomingDataMappings(WorkflowDefinition definition, String targetNodeId) {
        Map<String, String> mergedMappings = new HashMap<>();

        if (definition.getEdges() == null) {
            return mergedMappings;
        }

        for (WorkflowEdge edge : definition.getEdges()) {
            if (edge.getTarget().equals(targetNodeId) && edge.getDataMapping() != null) {
                mergedMappings.putAll(edge.getDataMapping());
            }
        }

        return mergedMappings;
    }
}
