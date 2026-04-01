package com.example.testproject.service.impl;

import com.example.testproject.service.SpatialDataService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 空间数据服务实现 - 提供长江中游区域的硬编码示例数据
 * 后续将替换为真实GIS数据源
 */
@Service
public class SpatialDataServiceImpl implements SpatialDataService {

    @Override
    public Map<String, Object> getRivers() {
        List<Map<String, Object>> features = new ArrayList<>();

        // 长江中游段
        features.add(buildRiverFeature("river-001", "长江中游段", new double[][]{
                {111.0, 30.0, 50}, {111.5, 30.2, 45}, {112.0, 30.4, 40}, {112.5, 30.5, 35}, {113.0, 30.6, 30}
        }, 245.5, 1250.8, "#0066cc", 4));

        // 汉江
        features.add(buildRiverFeature("river-002", "汉江", new double[][]{
                {110.5, 30.8, 80}, {111.0, 30.6, 60}, {111.5, 30.5, 45}
        }, 157.2, 890.5, "#00aaff", 3));

        return buildFeatureCollection(features);
    }

    @Override
    public Map<String, Object> getStations() {
        List<Map<String, Object>> features = new ArrayList<>();

        features.add(buildStationFeature("station-001", "宜昌站", 111.3, 30.7, 50,
                "flow", 12500, "1950-01-01"));
        features.add(buildStationFeature("station-002", "汉口站", 114.3, 30.6, 25,
                "flow", 18500, "1952-06-15"));
        features.add(buildStationFeature("station-003", "武汉雨量站", 114.3, 30.5, 30,
                "rainfall", 45.5, "1960-03-20"));
        features.add(buildStationFeature("station-004", "荆州站", 112.2, 30.3, 35,
                "waterLevel", 38.2, "1955-08-10"));

        return buildFeatureCollection(features);
    }

    @Override
    public Map<String, Object> getBasins() {
        List<Map<String, Object>> features = new ArrayList<>();

        Map<String, Object> basinProps = new HashMap<>();
        basinProps.put("id", "basin-001");
        basinProps.put("name", "长江流域");
        basinProps.put("area", 1800000);
        basinProps.put("outlet", "上海");
        basinProps.put("avgElevation", 450);
        basinProps.put("runoff", 9600);
        basinProps.put("color", "#2d5016");

        double[][] coords = {
                {110.0, 29.0}, {115.0, 29.0}, {115.0, 31.0}, {113.0, 31.5}, {110.0, 31.0}, {110.0, 29.0}
        };

        Map<String, Object> geometry = new HashMap<>();
        geometry.put("type", "Polygon");
        geometry.put("coordinates", wrapAsArray(coords));

        features.add(buildFeature("basin-001", basinProps, geometry));

        return buildFeatureCollection(features);
    }

    @Override
    public Map<String, Object> getLakes() {
        List<Map<String, Object>> features = new ArrayList<>();

        Map<String, Object> lakeProps = new HashMap<>();
        lakeProps.put("id", "lake-001");
        lakeProps.put("name", "洞庭湖");
        lakeProps.put("area", 2625.0);
        lakeProps.put("capacity", 220.5);
        lakeProps.put("waterLevel", 32.5);
        lakeProps.put("color", "#00aaff");

        double[][] coords = {
                {112.5, 29.2}, {113.0, 29.2}, {113.0, 29.5}, {112.8, 29.6}, {112.5, 29.5}, {112.5, 29.2}
        };

        Map<String, Object> geometry = new HashMap<>();
        geometry.put("type", "Polygon");
        geometry.put("coordinates", wrapAsArray(coords));

        features.add(buildFeature("lake-001", lakeProps, geometry));

        return buildFeatureCollection(features);
    }

    @Override
    public Map<String, Object> getRegionData(String regionId) {
        Map<String, Object> combined = new HashMap<>();
        combined.put("type", "FeatureCollection");
        List<Map<String, Object>> allFeatures = new ArrayList<>();

        // 合并所有空间数据
        allFeatures.addAll(extractFeatures(getRivers()));
        allFeatures.addAll(extractFeatures(getStations()));
        allFeatures.addAll(extractFeatures(getBasins()));
        allFeatures.addAll(extractFeatures(getLakes()));

        combined.put("features", allFeatures);
        combined.put("regionId", regionId);
        return combined;
    }

    // === 私有辅助方法 ===

    private Map<String, Object> buildRiverFeature(String id, String name, double[][] coords,
                                                   double length, double basinArea, String color, int width) {
        Map<String, Object> properties = new HashMap<>();
        properties.put("id", id);
        properties.put("name", name);
        properties.put("length", length);
        properties.put("basinArea", basinArea);
        properties.put("color", color);
        properties.put("width", width);

        double[][] closedCoords = new double[coords.length][3];
        for (int i = 0; i < coords.length; i++) {
            closedCoords[i] = coords[i];
        }

        Map<String, Object> geometry = new HashMap<>();
        geometry.put("type", "LineString");
        geometry.put("coordinates", closedCoords);

        return buildFeature(id, properties, geometry);
    }

    private Map<String, Object> buildStationFeature(String id, String name, double longitude,
                                                     double latitude, double height, String type,
                                                     double value, String establishedDate) {
        Map<String, Object> properties = new HashMap<>();
        properties.put("id", id);
        properties.put("name", name);
        properties.put("height", height);
        properties.put("type", type);
        properties.put("value", value);
        properties.put("establishedDate", establishedDate);

        Map<String, Object> geometry = new HashMap<>();
        geometry.put("type", "Point");
        geometry.put("coordinates", new double[]{longitude, latitude, height});

        return buildFeature(id, properties, geometry);
    }

    private Map<String, Object> buildFeature(String id, Map<String, Object> properties, Map<String, Object> geometry) {
        Map<String, Object> feature = new HashMap<>();
        feature.put("type", "Feature");
        feature.put("id", id);
        feature.put("properties", properties);
        feature.put("geometry", geometry);
        return feature;
    }

    private Map<String, Object> buildFeatureCollection(List<Map<String, Object>> features) {
        Map<String, Object> collection = new HashMap<>();
        collection.put("type", "FeatureCollection");
        collection.put("features", features);
        return collection;
    }

    private double[][][] wrapAsArray(double[][] coords) {
        return new double[][][]{coords};
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractFeatures(Map<String, Object> featureCollection) {
        return (List<Map<String, Object>>) featureCollection.get("features");
    }
}
