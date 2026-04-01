package com.example.testproject.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * 工作流定义
 */
@Data
public class WorkflowDefinition {

    /** 节点列表 */
    private List<WorkflowNode> nodes;

    /** 边列表（连接关系） */
    private List<WorkflowEdge> edges;

    /** 全局配置 */
    private Map<String, Object> globalConfig;

    /** 执行策略 (serial/parallel/mixed) */
    private String executionStrategy;
}
