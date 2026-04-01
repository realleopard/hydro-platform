package com.example.testproject.service;

import java.util.Map;

/**
 * 空间数据服务接口
 */
public interface SpatialDataService {

    /**
     * 获取河流GeoJSON数据
     */
    Map<String, Object> getRivers();

    /**
     * 获取水文站点GeoJSON数据
     */
    Map<String, Object> getStations();

    /**
     * 获取流域边界GeoJSON数据
     */
    Map<String, Object> getBasins();

    /**
     * 获取湖泊/水库GeoJSON数据
     */
    Map<String, Object> getLakes();

    /**
     * 获取指定区域的所有空间数据（合并GeoJSON）
     */
    Map<String, Object> getRegionData(String regionId);
}
