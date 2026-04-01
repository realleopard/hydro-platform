package com.example.testproject.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 条件表达式评估器
 * 用于评估工作流边上的条件表达式，支持简单的比较操作
 *
 * 支持的表达式格式:
 * - "output.river_flow > 1000" - 比较前驱节点输出中的值
 * - "status == 'success'" - 检查执行状态
 * - "output.exitCode == 0" - 检查退出码
 * - "true" / "false" - 字面布尔值
 *
 * 支持的操作符: ==, !=, >, <, >=, <=, contains
 */
@Slf4j
@Component
public class ConditionEvaluator {

    /**
     * 正则表达式匹配条件表达式: left_operand operator right_operand
     * 操作符按长度降序排列，确保 >= 在 > 之前匹配
     */
    private static final Pattern CONDITION_PATTERN = Pattern.compile(
            "^\\s*(.+?)\\s*(>=|<=|!=|==|>|<|contains)\\s*(.+?)\\s*$"
    );

    /**
     * 评估条件表达式
     *
     * @param condition 条件表达式字符串，为 null 或空时返回 true（无条件边）
     * @param context   上下文数据，包含前驱节点的输出信息。
     *                  键可以是 "output.FIELD_NAME" 形式引用前驱节点输出中的字段值。
     *                  也可包含 "status" 等其他上下文信息。
     * @return 条件是否满足
     */
    public boolean evaluate(String condition, Map<String, Object> context) {
        // 无条件表达式，默认通过
        if (condition == null || condition.trim().isEmpty()) {
            return true;
        }

        String trimmed = condition.trim();

        // 字面布尔值
        if ("true".equalsIgnoreCase(trimmed)) {
            return true;
        }
        if ("false".equalsIgnoreCase(trimmed)) {
            return false;
        }

        // 解析表达式
        Matcher matcher = CONDITION_PATTERN.matcher(trimmed);
        if (!matcher.matches()) {
            log.warn("无法解析条件表达式: '{}', 默认返回 false", condition);
            return false;
        }

        String leftOperand = matcher.group(1).trim();
        String operator = matcher.group(2).trim();
        String rightOperand = matcher.group(3).trim();

        // 解析左侧值
        Object leftValue = resolveValue(leftOperand, context);

        // 解析右侧值（去除可能的引号）
        Object rightValue = parseRightOperand(rightOperand);

        // 执行比较
        boolean result = compare(leftValue, rightValue, operator);
        log.debug("条件评估: '{}' {} '{}' -> {} (left={}, right={})",
                leftOperand, operator, rightOperand, result, leftValue, rightValue);
        return result;
    }

    /**
     * 解析操作数的值
     * 如果操作数以 "output." 开头，从上下文中查找对应的值
     * 否则尝试从上下文中直接查找
     */
    private Object resolveValue(String operand, Map<String, Object> context) {
        if (context == null) {
            return null;
        }

        if (operand.startsWith("output.")) {
            String fieldName = operand.substring("output.".length());
            return context.get(fieldName);
        }

        // 尝试直接从上下文查找
        return context.get(operand);
    }

    /**
     * 解析右侧操作数，去除引号并尝试类型推断
     */
    private Object parseRightOperand(String operand) {
        // 去除单引号或双引号
        if ((operand.startsWith("'") && operand.endsWith("'")) ||
                (operand.startsWith("\"") && operand.endsWith("\""))) {
            return operand.substring(1, operand.length() - 1);
        }

        // 尝试解析为数字
        try {
            if (operand.contains(".")) {
                return Double.parseDouble(operand);
            }
            return Long.parseLong(operand);
        } catch (NumberFormatException e) {
            // 不是数字，作为字符串返回
            return operand;
        }
    }

    /**
     * 执行比较操作
     */
    private boolean compare(Object left, Object right, String operator) {
        if (left == null && right == null) {
            return "==".equals(operator);
        }
        if (left == null || right == null) {
            return "!=".equals(operator);
        }

        // 统一类型进行比较
        Object normalizedLeft = normalizeForComparison(left, right);
        Object normalizedRight = normalizeForComparison(right, left);

        switch (operator) {
            case "==":
                return normalizedLeft.equals(normalizedRight);
            case "!=":
                return !normalizedLeft.equals(normalizedRight);
            case ">":
                return compareNumbers(normalizedLeft, normalizedRight) > 0;
            case "<":
                return compareNumbers(normalizedLeft, normalizedRight) < 0;
            case ">=":
                return compareNumbers(normalizedLeft, normalizedRight) >= 0;
            case "<=":
                return compareNumbers(normalizedLeft, normalizedRight) <= 0;
            case "contains":
                return String.valueOf(normalizedLeft).contains(String.valueOf(normalizedRight));
            default:
                log.warn("不支持的操作符: {}", operator);
                return false;
        }
    }

    /**
     * 标准化值以便比较
     * 尝试将两个值转换为相同类型（优先转为数字）
     */
    private Object normalizeForComparison(Object value, Object otherValue) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }

        // 如果另一个值是数字，尝试将当前值也转为数字
        if (otherValue instanceof Number) {
            try {
                return Double.parseDouble(String.valueOf(value));
            } catch (NumberFormatException e) {
                return String.valueOf(value);
            }
        }

        return String.valueOf(value);
    }

    /**
     * 比较两个数值
     */
    @SuppressWarnings("unchecked")
    private int compareNumbers(Object left, Object right) {
        if (left instanceof Comparable && right instanceof Comparable) {
            try {
                return ((Comparable<Object>) left).compareTo(right);
            } catch (ClassCastException e) {
                // 类型不兼容时转为字符串比较
                return String.valueOf(left).compareTo(String.valueOf(right));
            }
        }
        return String.valueOf(left).compareTo(String.valueOf(right));
    }
}
