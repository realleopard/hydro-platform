package com.example.testproject.service;

import java.util.List;
import java.util.Map;

/**
 * Docker Registry 服务接口
 * 与 Docker Registry v2 API 交互，用于镜像验证和标签查询
 */
public interface DockerRegistryService {

    /**
     * 列出 Registry 中的所有仓库
     *
     * @return 仓库名称列表
     */
    List<String> listRepositories();

    /**
     * 列出指定仓库的所有标签
     *
     * @param repository 仓库名称
     * @return 标签列表
     */
    List<String> listTags(String repository);

    /**
     * 检查镜像是否存在于 Registry 中
     *
     * @param imageName 镜像名称
     * @param tag       标签
     * @return 是否存在
     */
    boolean imageExists(String imageName, String tag);

    /**
     * 获取镜像的 Digest
     *
     * @param imageName 镜像名称
     * @param tag       标签
     * @return Docker-Content-Digest 值
     */
    String getImageDigest(String imageName, String tag);

    /**
     * 获取镜像的 Manifest
     *
     * @param imageName 镜像名称
     * @param tag       标签
     * @return Manifest 信息
     */
    Map<String, Object> getImageManifest(String imageName, String tag);
}
