package com.example.testproject.mq;

import com.example.testproject.dto.task.TaskMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 任务消息生产者
 * 将任务发送到消息队列
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TaskMessageProducer {

    private final RabbitTemplate rabbitTemplate;

    @Value("${watershed.mq.task.exchange:task.exchange}")
    private String taskExchange;

    @Value("${watershed.mq.task.routing-key:task.routing}")
    private String taskRoutingKey;

    /**
     * 发送任务到队列
     */
    public void sendTask(TaskMessage message) {
        log.info("发送任务到队列: taskId={}, workflowId={}",
                message.getTaskId(), message.getWorkflowId());

        rabbitTemplate.convertAndSend(
                taskExchange,
                taskRoutingKey,
                message
        );
    }

    /**
     * 发送高优先级任务
     */
    public void sendPriorityTask(TaskMessage message, int priority) {
        log.info("发送高优先级任务: taskId={}, priority={}",
                message.getTaskId(), priority);

        rabbitTemplate.convertAndSend(
                taskExchange,
                taskRoutingKey,
                message,
                msg -> {
                    msg.getMessageProperties().setPriority(priority);
                    return msg;
                }
        );
    }

    /**
     * 发送延迟任务
     */
    public void sendDelayedTask(TaskMessage message, int delayMillis) {
        log.info("发送延迟任务: taskId={}, delay={}ms",
                message.getTaskId(), delayMillis);

        rabbitTemplate.convertAndSend(
                taskExchange,
                taskRoutingKey,
                message,
                msg -> {
                    msg.getMessageProperties().setDelay(delayMillis);
                    return msg;
                }
        );
    }
}
