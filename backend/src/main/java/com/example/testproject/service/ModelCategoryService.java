package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.entity.ModelCategory;

import java.util.List;
import java.util.UUID;

/**
 * 模型分类服务接口
 */
public interface ModelCategoryService extends IService<ModelCategory> {
    
    /**
     * 获取分类树
     */
    List<ModelCategory> getCategoryTree();
    
    /**
     * 获取子分类
     */
    List<ModelCategory> getChildren(UUID parentId);
}
