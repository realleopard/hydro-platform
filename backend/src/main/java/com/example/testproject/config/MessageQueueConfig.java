package com.example.testproject.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;

/**
 * 消息队列配置 (RabbitMQ)
 * 用于任务队列和异步处理
 */
@Configuration
@EnableRabbit
public class MessageQueueConfig {

    @Value("${watershed.mq.task.exchange:task.exchange}")
    private String taskExchange;

    @Value("${watershed.mq.task.queue:task.queue}")
    private String taskQueue;

    @Value("${watershed.mq.task.routing-key:task.routing}")
    private String taskRoutingKey;

    @Value("${watershed.mq.result.exchange:result.exchange}")
    private String resultExchange;

    @Value("${watershed.mq.result.queue:result.queue}")
    private String resultQueue;

    /**
     * RabbitAdmin 用于自动声明队列
     */
    @Bean
    public RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
        RabbitAdmin admin = new RabbitAdmin(connectionFactory);
        admin.setAutoStartup(true);
        return admin;
    }

    /**
     * 任务交换机
     */
    @Bean
    public DirectExchange taskExchange() {
        return new DirectExchange(taskExchange);
    }

    /**
     * 任务队列
     */
    @Bean
    public Queue taskQueue() {
        return QueueBuilder.durable(taskQueue)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", taskQueue + ".dlq")
                .build();
    }

    /**
     * 任务队列绑定
     */
    @Bean
    public Binding taskBinding() {
        return BindingBuilder
                .bind(taskQueue())
                .to(taskExchange())
                .with(taskRoutingKey);
    }

    /**
     * 死信队列
     */
    @Bean
    public Queue taskDeadLetterQueue() {
        return new Queue(taskQueue + ".dlq");
    }

    /**
     * 结果交换机
     */
    @Bean
    public FanoutExchange resultExchange() {
        return new FanoutExchange(resultExchange);
    }

    /**
     * 结果队列
     */
    @Bean
    public Queue resultQueue() {
        return QueueBuilder.durable(resultQueue).build();
    }

    /**
     * 结果队列绑定
     */
    @Bean
    public Binding resultBinding() {
        return BindingBuilder
                .bind(resultQueue())
                .to(resultExchange());
    }

    /**
     * JSON消息转换器
     */
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    /**
     * RabbitTemplate配置
     */
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        template.setConfirmCallback((correlationData, ack, cause) -> {
            if (!ack) {
                // 处理消息发送失败
                System.err.println("消息发送失败: " + cause);
            }
        });
        return template;
    }
}
