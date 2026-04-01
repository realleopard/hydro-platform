package com.example.testproject.annotation;

import java.lang.annotation.*;

/**
 * 权限要求注解
 * 标记需要特定权限才能访问的方法
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequirePermission {

    /**
     * 权限编码
     */
    String value();

    /**
     * 权限描述
     */
    String description() default "";
}
