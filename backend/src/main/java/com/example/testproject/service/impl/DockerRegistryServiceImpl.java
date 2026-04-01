package com.example.testproject.service.impl;

import com.example.testproject.service.DockerRegistryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Docker Registry v2 API 客户端实现
 * 支持 Basic Auth 认证的私有 Registry
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DockerRegistryServiceImpl implements DockerRegistryService {

    @Value("${docker.registry.url:http://localhost:5000}")
    private String registryUrl;

    @Value("${docker.registry.username:}")
    private String registryUsername;

    @Value("${docker.registry.password:}")
    private String registryPassword;

    private final RestTemplate restTemplate;

    /**
     * 构建带认证的请求头
     */
    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.ACCEPT, "application/vnd.docker.distribution.manifest.v2+json");

        if (registryUsername != null && !registryUsername.isEmpty()) {
            String auth = registryUsername + ":" + registryPassword;
            String encodedAuth = Base64.getEncoder().encodeToString(
                    auth.getBytes(StandardCharsets.UTF_8));
            headers.set(HttpHeaders.AUTHORIZATION, "Basic " + encodedAuth);
        }

        return headers;
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<String> listRepositories() {
        String url = registryUrl + "/v2/_catalog";
        log.debug("列出仓库: {}", url);

        try {
            HttpEntity<Void> request = new HttpEntity<>(buildHeaders());
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, request,
                    (Class<Map<String, Object>>) (Class<?>) Map.class);

            if (response.getBody() != null && response.getBody().containsKey("repositories")) {
                return (List<String>) response.getBody().get("repositories");
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("列出仓库失败: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<String> listTags(String repository) {
        String url = registryUrl + "/v2/" + repository + "/tags/list";
        log.debug("列出标签: {}", url);

        try {
            HttpEntity<Void> request = new HttpEntity<>(buildHeaders());
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, request,
                    (Class<Map<String, Object>>) (Class<?>) Map.class);

            if (response.getBody() != null && response.getBody().containsKey("tags")) {
                return (List<String>) response.getBody().get("tags");
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("列出标签失败, repository={}: {}", repository, e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    @Override
    public boolean imageExists(String imageName, String tag) {
        String url = registryUrl + "/v2/" + imageName + "/manifests/" + tag;
        log.debug("检查镜像是否存在: {}", url);

        try {
            HttpEntity<Void> request = new HttpEntity<>(buildHeaders());
            ResponseEntity<Void> response = restTemplate.exchange(
                    url, HttpMethod.HEAD, request, Void.class);

            boolean exists = response.getStatusCode().is2xxSuccessful();
            log.debug("镜像 {}:{} 存在: {}", imageName, tag, exists);
            return exists;
        } catch (Exception e) {
            log.debug("镜像 {}:{} 不存在或查询失败: {}", imageName, tag, e.getMessage());
            return false;
        }
    }

    @Override
    public String getImageDigest(String imageName, String tag) {
        String url = registryUrl + "/v2/" + imageName + "/manifests/" + tag;
        log.debug("获取镜像 Digest: {}", url);

        try {
            HttpEntity<Void> request = new HttpEntity<>(buildHeaders());
            ResponseEntity<Void> response = restTemplate.exchange(
                    url, HttpMethod.HEAD, request, Void.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                HttpHeaders responseHeaders = response.getHeaders();
                String digest = responseHeaders.getFirst("Docker-Content-Digest");
                if (digest != null) {
                    log.debug("镜像 {}:{} digest={}", imageName, tag, digest);
                    return digest;
                }
            }
            return null;
        } catch (Exception e) {
            log.error("获取镜像 Digest 失败, {}:{}: {}", imageName, tag, e.getMessage(), e);
            return null;
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> getImageManifest(String imageName, String tag) {
        String url = registryUrl + "/v2/" + imageName + "/manifests/" + tag;
        log.debug("获取镜像 Manifest: {}", url);

        try {
            HttpEntity<Void> request = new HttpEntity<>(buildHeaders());
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, request,
                    (Class<Map<String, Object>>) (Class<?>) Map.class);

            if (response.getBody() != null) {
                Map<String, Object> result = new HashMap<>(response.getBody());
                // 附加 digest 信息
                String digest = response.getHeaders().getFirst("Docker-Content-Digest");
                if (digest != null) {
                    result.put("digest", digest);
                }
                return result;
            }
            return Collections.emptyMap();
        } catch (Exception e) {
            log.error("获取镜像 Manifest 失败, {}:{}: {}", imageName, tag, e.getMessage(), e);
            return Collections.emptyMap();
        }
    }
}
