package com.example.testproject.controller;

import com.example.testproject.common.Result;
import com.example.testproject.service.DockerRegistryService;
import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.model.Image;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Docker 镜像管理控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/docker")
@RequiredArgsConstructor
public class DockerController {

    private final DockerClient dockerClient;
    private final DockerRegistryService registryService;

    /**
     * 列出本地 Docker 镜像
     */
    @GetMapping("/images")
    public Result<List<Map<String, Object>>> listLocalImages() {
        try {
            List<Image> images = dockerClient.listImagesCmd().exec();
            List<Map<String, Object>> result = images.stream().map(img -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", img.getId());
                map.put("repoTags", img.getRepoTags() != null ? Arrays.asList(img.getRepoTags()) : Collections.emptyList());
                map.put("size", img.getSize());
                map.put("created", img.getCreated());
                return map;
            }).collect(Collectors.toList());
            return Result.success(result);
        } catch (Exception e) {
            log.error("列出本地镜像失败: {}", e.getMessage());
            return Result.error(500, "获取本地镜像列表失败: " + e.getMessage());
        }
    }

    /**
     * 列出 Registry 中的仓库
     */
    @GetMapping("/registry/repositories")
    public Result<List<String>> listRegistryRepositories() {
        try {
            List<String> repos = registryService.listRepositories();
            return Result.success(repos);
        } catch (Exception e) {
            log.error("列出Registry仓库失败: {}", e.getMessage());
            return Result.error(500, "获取Registry仓库列表失败: " + e.getMessage());
        }
    }

    /**
     * 列出 Registry 仓库的标签
     */
    @GetMapping("/registry/repositories/{repository}/tags")
    public Result<List<String>> listRegistryTags(@PathVariable String repository) {
        try {
            List<String> tags = registryService.listTags(repository);
            return Result.success(tags);
        } catch (Exception e) {
            log.error("列出Registry标签失败: repository={}, error={}", repository, e.getMessage());
            return Result.error(500, "获取标签列表失败: " + e.getMessage());
        }
    }

    /**
     * 验证镜像是否存在
     */
    @GetMapping("/registry/validate")
    public Result<Map<String, Object>> validateImage(
            @RequestParam String imageName,
            @RequestParam(defaultValue = "latest") String tag) {
        try {
            Map<String, Object> result = new HashMap<>();
            // Check local first
            List<Image> local = dockerClient.listImagesCmd()
                    .withImageNameFilter(imageName)
                    .exec();
            boolean localExists = local.stream()
                    .anyMatch(img -> img.getRepoTags() != null &&
                            Arrays.stream(img.getRepoTags())
                                    .anyMatch(t -> t.equals(imageName + ":" + tag)));

            // Check registry
            boolean registryExists = false;
            try {
                registryExists = registryService.imageExists(imageName, tag);
            } catch (Exception e) {
                log.debug("Registry检查失败，忽略: {}", e.getMessage());
            }

            result.put("imageName", imageName);
            result.put("tag", tag);
            result.put("localExists", localExists);
            result.put("registryExists", registryExists);
            result.put("exists", localExists || registryExists);
            return Result.success(result);
        } catch (Exception e) {
            log.error("验证镜像失败: {}", e.getMessage());
            return Result.error(500, "验证镜像失败: " + e.getMessage());
        }
    }
}
