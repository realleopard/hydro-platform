package com.example.testproject.dto;

import com.example.testproject.entity.User;
import lombok.Data;

/**
 * 登录响应DTO
 */
@Data
public class LoginResponse {
    
    private String token;
    private User user;
}
