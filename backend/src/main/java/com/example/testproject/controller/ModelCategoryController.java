package com.example.testproject.controller;

import com.example.testproject.common.Result;
import com.example.testproject.entity.ModelCategory;
import com.example.testproject.service.ModelCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * 模型分类控制器
 */
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class ModelCategoryController {
    
    private final ModelCategoryService categoryService;
    
    /**
     * 获取分类列表
     */
    @GetMapping("")
    public Result<List<ModelCategory>> list() {
        List<ModelCategory> categories = categoryService.list();
        return Result.success(categories);
    }
    
    /**
     * 获取分类树
     */
    @GetMapping("/tree")
    public Result<List<ModelCategory>> tree() {
        List<ModelCategory> categories = categoryService.getCategoryTree();
        return Result.success(categories);
    }
    
    /**
     * 获取子分类
     */
    @GetMapping("/{id}/children")
    public Result<List<ModelCategory>> children(@PathVariable UUID id) {
        List<ModelCategory> children = categoryService.getChildren(id);
        return Result.success(children);
    }
    
    /**
     * 创建分类
     */
    @PostMapping("")
    public Result<ModelCategory> create(@RequestBody ModelCategory category) {
        categoryService.save(category);
        return Result.success(category);
    }
    
    /**
     * 更新分类
     */
    @PutMapping("/{id}")
    public Result<ModelCategory> update(@PathVariable UUID id, @RequestBody ModelCategory category) {
        category.setId(id);
        categoryService.updateById(category);
        return Result.success(categoryService.getById(id));
    }
    
    /**
     * 删除分类
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable UUID id) {
        categoryService.removeById(id);
        return Result.success(null);
    }
}
