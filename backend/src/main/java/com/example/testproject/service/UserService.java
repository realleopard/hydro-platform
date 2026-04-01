package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.entity.User;

import java.util.Optional;
import java.util.UUID;

/**
 * 用户服务接口
 */
public interface UserService extends IService<User> {
    
    /**
     * 根据用户名查找用户
     */
    Optional<User> findByUsername(String username);
    
    /**
     * 根据邮箱查找用户
     */
    Optional<User> findByEmail(String email);
    
    /**
     * 注册新用户
     */
    User register(String username, String email, String password, String fullName);
    
    /**
     * 验证密码
     */
    boolean verifyPassword(User user, String password);
    
    /**
     * 更新最后登录时间
     */
    void updateLastLogin(UUID userId);
}
