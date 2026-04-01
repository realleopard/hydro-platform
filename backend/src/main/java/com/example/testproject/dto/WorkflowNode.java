package com.example.testproject.dto;

import lombok.Data;
import java.util.Map;
import java.util.UUID;

/**
 * 工作流节点定义
 */
@Data
public class WorkflowNode {

    /** 节点ID */
    private String id;

    /** 节点类型 (model/input/output/condition) */
    private String type;

    /** 节点名称 */
    private String name;

    /** 关联模型ID */
    private UUID modelId;

    /** 节点位置坐标 */
    private Map<String, Double> position;

    /** 节点配置参数 */
    private Map<String, Object> config;

    /** 输入数据映射 */
    private Map<String, String> inputMappings;

    /** 输出数据映射 */
    private Map<String, String> outputMappings;
}
