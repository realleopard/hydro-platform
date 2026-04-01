package com.example.testproject.annotation;

import java.lang.annotation.*;

/**
 * 审计日志注解
 * 标记需要记录审计日志的方法
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AuditLog {

    /**
     * 操作类型
     */
    String action();

    /**
     * 资源类型
     */
    String resourceType();

    /**
     * 资源ID表达式（SpEL）
     * 例如: #id, #model.id, #result.id
     */
    String resourceId() default "";

    /**
     * 资源名称表达式（SpEL）
     */
    String resourceName() default "";

    /**
     * 操作描述
     */
    String description() default "";

    /**
     * 是否记录请求参数
     */
    boolean recordParams() default true;

    /**
     * 是否记录返回值
     */
    boolean recordResult() default false;
}
