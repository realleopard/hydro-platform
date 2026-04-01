package com.example.testproject;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * 水文模型平台 - Spring Boot 后端服务
 * 从 Go 后端迁移
 */
@SpringBootApplication
@EnableCaching
public class TestProjectApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(TestProjectApplication.class, args);
        System.out.println("╔══════════════════════════════════════════════════════════╗");
        System.out.println("║                                                          ║");
        System.out.println("║              水文模型管理平台 (Hydro Platform)            ║");
        System.out.println("║                                                          ║");
        System.out.println("║              Spring Boot 后端服务已启动                   ║");
        System.out.println("║                                                          ║");
        System.out.println("╚══════════════════════════════════════════════════════════╝");
    }
}
