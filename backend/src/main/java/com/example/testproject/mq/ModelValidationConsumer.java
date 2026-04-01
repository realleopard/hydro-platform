package com.example.testproject.mq;

import com.example.testproject.config.RabbitMQConfig;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 模型验证消息消费者
 * 处理模型验证队列的消息
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ModelValidationConsumer {

    /**
     * 处理模型验证消息
     */
    @RabbitListener(queues = RabbitMQConfig.MODEL_VALIDATION_QUEUE, ackMode = "MANUAL")
    public void handleValidationMessage(TaskMessage message, Channel channel, Message amqpMessage) throws IOException {
        long deliveryTag = amqpMessage.getMessageProperties().getDeliveryTag();

        try {
            log.info("收到模型验证消息: taskId={}, modelId={}",
                    message.getTaskId(), message.getModelId());

            // 执行模型验证
            performValidation(message);

            // 确认消息
            channel.basicAck(deliveryTag, false);
            log.info("模型验证完成: taskId={}", message.getTaskId());

        } catch (Exception e) {
            log.error("模型验证失败: taskId={}, error={}", message.getTaskId(), e.getMessage(), e);

            // 验证失败，根据重试次数处理
            Integer retryCount = message.getRetryCount() != null ? message.getRetryCount() : 0;
            if (retryCount < 3) {
                message.setRetryCount(retryCount + 1);
                channel.basicNack(deliveryTag, false, true);
            } else {
                channel.basicNack(deliveryTag, false, false);
            }
        }
    }

    /**
     * 执行模型验证
     */
    private void performValidation(TaskMessage message) {
        log.info("开始模型验证: taskId={}, modelId={}", message.getTaskId(), message.getModelId());

        // 获取验证参数
        Object metrics = message.getParameters() != null ?
                message.getParameters().get("metrics") : null;

        // TODO: 调用 ModelValidationService 执行验证
        // 1. 加载模型和验证数据
        // 2. 执行模型推理
        // 3. 计算验证指标 (NSE, RMSE, MAE, R2)
        // 4. 保存验证结果
        // 5. 发送验证完成通知

        log.info("模型验证执行中: taskId={}, metrics={}", message.getTaskId(), metrics);
    }
}
