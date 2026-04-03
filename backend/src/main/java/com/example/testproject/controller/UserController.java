package com.example.testproject.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.testproject.common.Result;
import com.example.testproject.entity.User;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * 用户管理控制器
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 分页用户列表
     */
    @GetMapping
    public Result<IPage<User>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @CurrentUser UUID currentUserId) {
        User currentUser = userService.getById(currentUserId);
        if (currentUser == null || !"admin".equals(currentUser.getRole())) {
            return Result.error("权限不足");
        }

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (search != null && !search.isEmpty()) {
            wrapper.and(w -> w.like(User::getUsername, search)
                    .or().like(User::getEmail, search)
                    .or().like(User::getFullName, search));
        }
        if (role != null && !role.isEmpty()) {
            wrapper.eq(User::getRole, role);
        }
        wrapper.orderByDesc(User::getCreatedAt);

        IPage<User> result = userService.page(new Page<>(page, size), wrapper);
        // 清除密码哈希
        result.getRecords().forEach(u -> u.setPasswordHash(null));
        return Result.success(result);
    }

    /**
     * 获取用户详情
     */
    @GetMapping("/{id}")
    public Result<User> get(@PathVariable UUID id, @CurrentUser UUID currentUserId) {
        User currentUser = userService.getById(currentUserId);
        if (currentUser == null) {
            return Result.error("用户不存在");
        }
        // 只允许admin或本人查看
        if (!"admin".equals(currentUser.getRole()) && !currentUser.getId().equals(id)) {
            return Result.error("权限不足");
        }
        User user = userService.getById(id);
        if (user == null) {
            return Result.error("用户不存在");
        }
        user.setPasswordHash(null);
        return Result.success(user);
    }

    /**
     * 更新用户
     */
    @PutMapping("/{id}")
    public Result<User> update(@PathVariable UUID id, @RequestBody Map<String, Object> updates,
                               @CurrentUser UUID currentUserId) {
        User currentUser = userService.getById(currentUserId);
        if (currentUser == null || !"admin".equals(currentUser.getRole())) {
            return Result.error("权限不足");
        }

        User user = userService.getById(id);
        if (user == null) {
            return Result.error("用户不存在");
        }

        if (updates.containsKey("role")) {
            user.setRole((String) updates.get("role"));
        }
        if (updates.containsKey("isActive")) {
            user.setIsActive((Boolean) updates.get("isActive"));
        }
        if (updates.containsKey("fullName")) {
            user.setFullName((String) updates.get("fullName"));
        }
        if (updates.containsKey("email")) {
            user.setEmail((String) updates.get("email"));
        }
        if (updates.containsKey("organization")) {
            user.setOrganization((String) updates.get("organization"));
        }
        user.setUpdatedAt(LocalDateTime.now());

        userService.updateById(user);
        user.setPasswordHash(null);
        return Result.success(user);
    }

    /**
     * 删除用户（软删除）
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable UUID id, @CurrentUser UUID currentUserId) {
        User currentUser = userService.getById(currentUserId);
        if (currentUser == null || !"admin".equals(currentUser.getRole())) {
            return Result.error("权限不足");
        }
        if (currentUser.getId().equals(id)) {
            return Result.error("不能删除自己");
        }
        userService.removeById(id);
        return Result.success(null);
    }
}
