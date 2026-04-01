package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.entity.ModelCategory;
import com.example.testproject.mapper.ModelCategoryMapper;
import com.example.testproject.service.ModelCategoryService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 模型分类服务实现
 */
@Service
public class ModelCategoryServiceImpl extends ServiceImpl<ModelCategoryMapper, ModelCategory> implements ModelCategoryService {
    
    @Override
    public List<ModelCategory> getCategoryTree() {
        // 获取所有分类
        List<ModelCategory> allCategories = list();
        
        // 构建树形结构
        return buildTree(allCategories, null);
    }
    
    @Override
    public List<ModelCategory> getChildren(UUID parentId) {
        LambdaQueryWrapper<ModelCategory> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ModelCategory::getParentId, parentId)
               .orderByAsc(ModelCategory::getSortOrder);
        return list(wrapper);
    }
    
    private List<ModelCategory> buildTree(List<ModelCategory> categories, UUID parentId) {
        return categories.stream()
                .filter(c -> {
                    if (parentId == null) {
                        return c.getParentId() == null;
                    }
                    return parentId.equals(c.getParentId());
                })
                .collect(Collectors.toList());
    }
}
