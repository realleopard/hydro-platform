package com.example.testproject.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.transaction.RabbitTransactionManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ 配置类
 * 配置连接工厂、队列、交换机和绑定关系
 */
@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.host:localhost}")
    private String host;

    @Value("${rabbitmq.port:5672}")
    private int port;

    @Value("${rabbitmq.username:hydro}")
    private String username;

    @Value("${rabbitmq.password:hydro123}")
    private String password;

    @Value("${rabbitmq.virtual-host:watershed}")
    private String virtualHost;

    // 队列名称常量
    public static final String TASK_QUEUE = "task.queue";
    public static final String TASK_DLQ = "task.dlq";
    public static final String NOTIFICATION_QUEUE = "notification.queue";
    public static final String MODEL_VALIDATION_QUEUE = "model.validation.queue";

    // 交换机名称常量
    public static final String TASK_EXCHANGE = "task.exchange";
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";
    public static final String MODEL_EXCHANGE = "model.exchange";

    // 路由键常量
    public static final String TASK_ROUTING_KEY = "task.#";
    public static final String MODEL_VALIDATION_ROUTING_KEY = "validation";

    /**
     * 配置连接工厂
     */
    @Bean
    public ConnectionFactory connectionFactory() {
        CachingConnectionFactory factory = new CachingConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        factory.setUsername(username);
        factory.setPassword(password);
        factory.setVirtualHost(virtualHost);
        factory.setConnectionTimeout(10000);
        factory.setRequestedHeartBeat(30);
        return factory;
    }

    /**
     * 配置 RabbitTemplate
     */
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setConfirmCallback((correlationData, ack, cause) -> {
            if (!ack) {
                System.err.println("消息发送失败: " + cause);
            }
        });
        template.setReturnsCallback(returned -> {
            System.err.println("消息路由失败: " + returned.getMessage());
        });
        return template;
    }

    /**
     * 任务队列
     */
    @Bean
    public Queue taskQueue() {
        return QueueBuilder.durable(TASK_QUEUE)
                .withArgument("x-max-priority", 10)
                .withArgument("x-message-ttl", 86400000) // 24小时
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", TASK_DLQ)
                .build();
    }

    /**
     * 死信队列
     */
    @Bean
    public Queue taskDLQ() {
        return QueueBuilder.durable(TASK_DLQ).build();
    }

    /**
     * 通知队列
     */
    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_QUEUE).build();
    }

    /**
     * 模型验证队列
     */
    @Bean
    public Queue modelValidationQueue() {
        return QueueBuilder.durable(MODEL_VALIDATION_QUEUE).build();
    }

    /**
     * 任务交换机 (Topic 类型)
     */
    @Bean
    public TopicExchange taskExchange() {
        return ExchangeBuilder.topicExchange(TASK_EXCHANGE)
                .durable(true)
                .build();
    }

    /**
     * 通知交换机 (Fanout 类型)
     */
    @Bean
    public FanoutExchange notificationExchange() {
        return ExchangeBuilder.fanoutExchange(NOTIFICATION_EXCHANGE)
                .durable(true)
                .build();
    }

    /**
     * 模型交换机 (Direct 类型)
     */
    @Bean
    public DirectExchange modelExchange() {
        return ExchangeBuilder.directExchange(MODEL_EXCHANGE)
                .durable(true)
                .build();
    }

    /**
     * 绑定任务队列到任务交换机
     */
    @Bean
    public Binding taskBinding(Queue taskQueue, TopicExchange taskExchange) {
        return BindingBuilder.bind(taskQueue)
                .to(taskExchange)
                .with(TASK_ROUTING_KEY);
    }

    /**
     * 绑定通知队列到通知交换机
     */
    @Bean
    public Binding notificationBinding(Queue notificationQueue, FanoutExchange notificationExchange) {
        return BindingBuilder.bind(notificationQueue).to(notificationExchange);
    }

    /**
     * 绑定模型验证队列到模型交换机
     */
    @Bean
    public Binding modelValidationBinding(Queue modelValidationQueue, DirectExchange modelExchange) {
        return BindingBuilder.bind(modelValidationQueue)
                .to(modelExchange)
                .with(MODEL_VALIDATION_ROUTING_KEY);
    }
}
