package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.entity.User;
import com.example.testproject.mapper.UserMapper;
import com.example.testproject.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;

/**
 * 用户服务实现
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    
    @Override
    public Optional<User> findByUsername(String username) {
        return userMapper.findByUsername(username);
    }
    
    @Override
    public Optional<User> findByEmail(String email) {
        return userMapper.findByEmail(email);
    }
    
    @Override
    @Transactional
    public User register(String username, String email, String password, String fullName) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setRole("user");
        user.setIsActive(true);
        userMapper.insert(user);
        return user;
    }
    
    @Override
    public boolean verifyPassword(User user, String password) {
        return passwordEncoder.matches(password, user.getPasswordHash());
    }
    
    @Override
    @Transactional
    public void updateLastLogin(UUID userId) {
        User user = getById(userId);
        if (user != null) {
            user.setLastLoginAt(LocalDateTime.now());
            updateById(user);
        }
    }

    @Override
    @Transactional
    public void updatePassword(UUID userId, String newPassword) {
        User user = getById(userId);
        if (user != null) {
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            updateById(user);
        }
    }
}
