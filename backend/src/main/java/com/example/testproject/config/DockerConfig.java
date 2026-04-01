package com.example.testproject.config;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Docker 配置类
 * 配置 Docker Client 连接参数
 */
@Slf4j
@Configuration
public class DockerConfig {

    @Value("${docker.host:unix:///var/run/docker.sock}")
    private String dockerHost;

    @Value("${docker.tls.verify:false}")
    private boolean tlsVerify;

    @Value("${docker.cert.path:}")
    private String certPath;

    @Value("${docker.config:}")
    private String dockerConfig;

    @Value("${docker.api.version:1.43}")
    private String apiVersion;

    @Value("${docker.registry.url:}")
    private String registryUrl;

    @Value("${docker.registry.username:}")
    private String registryUsername;

    @Value("${docker.registry.password:}")
    private String registryPassword;

    @Value("${docker.pull.timeout:300}")
    private int pullTimeoutSeconds;

    @Value("${docker.container.timeout:3600}")
    private int containerTimeoutSeconds;

    /**
     * 创建 Docker Client
     */
    @Bean
    public DockerClient dockerClient() {
        log.info("初始化 Docker Client, host: {}", dockerHost);

        DefaultDockerClientConfig.Builder configBuilder = DefaultDockerClientConfig.createDefaultConfigBuilder()
                .withDockerHost(dockerHost)
                .withApiVersion(apiVersion);

        if (tlsVerify && !certPath.isEmpty()) {
            configBuilder.withDockerTlsVerify(true)
                    .withDockerCertPath(certPath);
        }

        if (!dockerConfig.isEmpty()) {
            configBuilder.withDockerConfig(dockerConfig);
        }

        if (!registryUrl.isEmpty() && !registryUsername.isEmpty()) {
            configBuilder.withRegistryUrl(registryUrl)
                    .withRegistryUsername(registryUsername)
                    .withRegistryPassword(registryPassword);
        }

        DefaultDockerClientConfig config = configBuilder.build();

        DockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
                .dockerHost(config.getDockerHost())
                .sslConfig(config.getSSLConfig())
                .maxConnections(100)
                .connectionTimeout(Duration.ofSeconds(30))
                .responseTimeout(Duration.ofSeconds(45))
                .build();

        DockerClient dockerClient = DockerClientImpl.getInstance(config, httpClient);

        // 测试连接
        try {
            dockerClient.pingCmd().exec();
            log.info("Docker Client 连接成功");
        } catch (Exception e) {
            log.warn("Docker Client 连接失败: {} -- Docker 功能将不可用", e.getMessage());
        }

        return dockerClient;
    }

    public String getDockerHost() {
        return dockerHost;
    }

    public int getPullTimeoutSeconds() {
        return pullTimeoutSeconds;
    }

    public int getContainerTimeoutSeconds() {
        return containerTimeoutSeconds;
    }
}
