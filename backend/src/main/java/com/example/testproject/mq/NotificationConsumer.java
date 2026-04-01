package com.example.testproject.mq;

import com.example.testproject.config.RabbitMQConfig;
import com.rabbitmq.client.Channel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 通知消息消费者
 * 处理系统通知并通过 WebSocket 推送给前端
 */
@Slf4j
@Component
public class NotificationConsumer {

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 处理通知消息
     */
    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE, ackMode = "MANUAL")
    public void handleNotification(NotificationMessage message, Channel channel, Message amqpMessage) throws IOException {
        long deliveryTag = amqpMessage.getMessageProperties().getDeliveryTag();

        try {
            log.info("收到通知消息: notificationId={}, type={}, userId={}",
                    message.getNotificationId(), message.getType(), message.getUserId());

            if (messagingTemplate != null) {
                // 通过 WebSocket 发送通知给指定用户
                if (message.getUserId() != null) {
                    String destination = "/topic/notifications/" + message.getUserId();
                    messagingTemplate.convertAndSend(destination, message);
                    log.info("WebSocket 通知已发送: userId={}", message.getUserId());
                }

                // 广播系统通知
                if (message.getType() == NotificationMessage.NotificationType.SYSTEM_ALERT) {
                    messagingTemplate.convertAndSend("/topic/notifications/system", message);
                }

                // 发送任务相关通知
                if (message.getTaskId() != null) {
                    messagingTemplate.convertAndSend("/topic/tasks/" + message.getTaskId() + "/notifications", message);
                }
            } else {
                log.warn("SimpMessagingTemplate 不可用，跳过 WebSocket 通知推送");
            }

            // 确认消息
            channel.basicAck(deliveryTag, false);

        } catch (Exception e) {
            log.error("通知处理失败: notificationId={}, error={}", message.getNotificationId(), e.getMessage(), e);
            // 拒绝消息，不重新入队（避免通知循环）
            channel.basicNack(deliveryTag, false, false);
        }
    }
}
