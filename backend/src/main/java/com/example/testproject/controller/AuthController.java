package com.example.testproject.controller;

import com.example.testproject.common.Result;
import com.example.testproject.dto.LoginRequest;
import com.example.testproject.dto.LoginResponse;
import com.example.testproject.dto.RegisterRequest;
import com.example.testproject.entity.User;
import com.example.testproject.security.JwtUtil;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

/**
 * 认证控制器
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final UserService userService;
    private final JwtUtil jwtUtil;
    
    /**
     * 用户注册
     */
    @PostMapping("/register")
    public Result<User> register(@Valid @RequestBody RegisterRequest request) {
        // 检查用户名是否已存在
        if (userService.findByUsername(request.getUsername()).isPresent()) {
            return Result.error("用户名已存在");
        }
        // 检查邮箱是否已存在
        if (userService.findByEmail(request.getEmail()).isPresent()) {
            return Result.error("邮箱已被注册");
        }
        
        User user = userService.register(
            request.getUsername(),
            request.getEmail(),
            request.getPassword(),
            request.getFullName()
        );
        return Result.success(user);
    }
    
    /**
     * 用户登录
     */
    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Optional<User> userOpt = userService.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return Result.error("用户不存在");
        }
        
        User user = userOpt.get();
        if (!userService.verifyPassword(user, request.getPassword())) {
            return Result.error("密码错误");
        }
        
        // 生成JWT Token
        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        
        // 更新最后登录时间
        userService.updateLastLogin(user.getId());
        
        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setUser(user);
        return Result.success(response);
    }
    
    /**
     * 刷新Token
     */
    @PostMapping("/refresh")
    public Result<String> refresh(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        if (!jwtUtil.validateToken(token)) {
            return Result.error("Token无效");
        }
        
        UUID userId = jwtUtil.getUserIdFromToken(token);
        User user = userService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }
        
        String newToken = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        return Result.success(newToken);
    }
    
    /**
     * 用户登出
     */
    @PostMapping("/logout")
    public Result<Void> logout() {
        // JWT无状态，客户端删除token即可
        return Result.success(null);
    }

    /**
     * 获取当前用户信息
     */
    @GetMapping("/me")
    public Result<User> getCurrentUser(@CurrentUser UUID userId) {
        User user = userService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }
        user.setPasswordHash(null);
        return Result.success(user);
    }

    /**
     * 修改密码
     */
    @PostMapping("/change-password")
    public Result<Void> changePassword(@CurrentUser UUID userId, @RequestBody java.util.Map<String, String> body) {
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        if (oldPassword == null || newPassword == null) {
            return Result.error("请输入旧密码和新密码");
        }
        User user = userService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }
        if (!userService.verifyPassword(user, oldPassword)) {
            return Result.error("旧密码错误");
        }
        userService.updatePassword(userId, newPassword);
        return Result.success(null);
    }
}
