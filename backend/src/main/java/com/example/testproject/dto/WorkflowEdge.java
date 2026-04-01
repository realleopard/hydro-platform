package com.example.testproject.dto;

import lombok.Data;
import java.util.Map;

/**
 * 工作流边定义（连接关系）
 */
@Data
public class WorkflowEdge {

    /** 边ID */
    private String id;

    /** 源节点ID */
    private String source;

    /** 目标节点ID */
    private String target;

    /** 数据映射配置 */
    private Map<String, String> dataMapping;

    /** 条件表达式（条件分支时使用） */
    private String condition;
}
