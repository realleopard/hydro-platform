package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 数据集实体 - 对应 datasets 表
 */
@Data
@TableName("datasets")
public class Dataset implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 数据集ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 数据集名称 */
    private String name;
    
    /** 描述 */
    private String description;
    
    /** 所有者ID */
    private UUID ownerId;
    
    /** 数据类型 (timeseries/raster/vector/netcdf/csv/geotiff/shapefile) */
    private String dataType;
    
    /** 存储类型 (s3/local/nfs) */
    private String storageType;
    
    /** 存储路径 */
    private String storagePath;
    
    /** 文件大小 (字节) */
    private Long fileSize;
    
    /** 校验和 */
    private String checksum;
    
    /** 元数据 (JSON) */
    private String metadata;
    
    /** 空间边界 (WKT格式) */
    private String spatialBounds;
    
    /** 时间范围开始 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime temporalStart;
    
    /** 时间范围结束 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime temporalEnd;
    
    /** 下载次数 */
    private Integer downloadCount;
    
    /** 可见性 (private/public/organization) */
    private String visibility;
    
    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    
    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
    
    /** 删除时间 */
    @TableLogic
    private LocalDateTime deletedAt;
}
