package com.example.testproject.mq;

import com.example.testproject.config.RabbitMQConfig;
import com.example.testproject.dto.task.TaskMessage;
import com.example.testproject.service.TaskScheduler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * 任务消息消费者
 * 从消息队列接收并处理任务
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TaskMessageConsumer {

    private final TaskScheduler taskScheduler;

    /**
     * 处理任务消息
     */
    @RabbitListener(queues = "${watershed.mq.task.queue:task.queue}")
    @RabbitHandler
    public void handleTaskMessage(TaskMessage message) {
        log.info("收到任务消息: taskId={}, type={}", message.getTaskId(), message.getType());

        try {
            // 根据任务类型选择处理方式
            switch (message.getType()) {
                case "SIMULATION":
                    taskScheduler.scheduleTask(message);
                    break;
                case "ANALYSIS":
                    taskScheduler.scheduleAnalysis(message);
                    break;
                case "VALIDATION":
                    taskScheduler.scheduleValidation(message);
                    break;
                default:
                    log.warn("未知任务类型: {}", message.getType());
            }
        } catch (Exception e) {
            log.error("处理任务消息失败: taskId={}", message.getTaskId(), e);
            // 可以在这里实现重试逻辑或发送到死信队列
            throw e;
        }
    }

    /**
     * 处理死信队列消息
     */
    @RabbitListener(queues = RabbitMQConfig.TASK_DLQ)
    @RabbitHandler
    public void handleDeadLetterMessage(TaskMessage message) {
        log.error("处理死信队列消息: taskId={}", message.getTaskId());
        // 实现失败处理逻辑，如发送通知、记录日志等
    }
}