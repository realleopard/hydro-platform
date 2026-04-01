package com.example.testproject.mq;

import com.example.testproject.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 消息生产者
 * 用于发送消息到 RabbitMQ
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 发送任务消息
     *
     * @param message 任务消息
     */
    public void sendTaskMessage(TaskMessage message) {
        log.info("发送任务消息: taskId={}, type={}, priority={}",
                message.getTaskId(), message.getType(), message.getPriority());

        String routingKey = "task." + message.getType().name().toLowerCase();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.TASK_EXCHANGE,
                routingKey,
                message,
                msg -> {
                    // 设置消息优先级
                    if (message.getPriority() != null) {
                        msg.getMessageProperties().setPriority(message.getPriority());
                    }
                    return msg;
                }
        );
    }

    /**
     * 发送通知消息
     *
     * @param message 通知消息
     */
    public void sendNotification(NotificationMessage message) {
        log.info("发送通知消息: notificationId={}, type={}, userId={}",
                message.getNotificationId(), message.getType(), message.getUserId());

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.NOTIFICATION_EXCHANGE,
                "", // fanout 交换机不需要 routing key
                message
        );
    }

    /**
     * 发送模型验证消息
     *
     * @param taskMessage 包含模型验证信息的任务消息
     */
    public void sendModelValidationMessage(TaskMessage taskMessage) {
        log.info("发送模型验证消息: taskId={}, modelId={}",
                taskMessage.getTaskId(), taskMessage.getModelId());

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.MODEL_EXCHANGE,
                RabbitMQConfig.MODEL_VALIDATION_ROUTING_KEY,
                taskMessage
        );
    }

    /**
     * 发送延迟任务消息
     *
     * @param message     任务消息
     * @param delayMillis 延迟时间（毫秒）
     */
    public void sendDelayedTaskMessage(TaskMessage message, long delayMillis) {
        log.info("发送延迟任务消息: taskId={}, delay={}ms", message.getTaskId(), delayMillis);

        String routingKey = "task." + message.getType().name().toLowerCase();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.TASK_EXCHANGE,
                routingKey,
                message,
                msg -> {
                    msg.getMessageProperties().setDelay((int) delayMillis);
                    if (message.getPriority() != null) {
                        msg.getMessageProperties().setPriority(message.getPriority());
                    }
                    return msg;
                }
        );
    }
}
