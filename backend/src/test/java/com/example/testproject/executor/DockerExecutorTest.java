package com.example.testproject.executor;

import com.example.testproject.config.DockerConfig;
import com.example.testproject.service.DockerExecutor;
import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.time.Duration;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Docker 执行器测试
 *
 * 注意：这些测试需要 Docker 环境才能运行
 * 在没有 Docker 的环境中会被跳过
 */
@EnabledIfEnvironmentVariable(named = "DOCKER_ENABLED", matches = "true")
class DockerExecutorTest {

    private DockerExecutor dockerExecutor;
    private DockerClient dockerClient;

    @BeforeEach
    void setUp() {
        // 创建 Docker 客户端
        DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
                .withDockerHost("unix:///var/run/docker.sock")
                .withApiVersion("1.43")
                .build();

        DockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
                .dockerHost(config.getDockerHost())
                .sslConfig(config.getSSLConfig())
                .maxConnections(10)
                .connectionTimeout(Duration.ofSeconds(30))
                .responseTimeout(Duration.ofSeconds(45))
                .build();

        dockerClient = DockerClientImpl.getInstance(config, httpClient);

        // 创建 DockerConfig mock
        DockerConfig dockerConfig = new DockerConfig();

        dockerExecutor = new DockerExecutor(dockerClient, dockerConfig);
    }

    @Test
    void testIsDockerAvailable() {
        // 如果 Docker 可用，测试应该通过
        // 如果 Docker 不可用，测试会被跳过
        assertDoesNotThrow(() -> dockerClient.pingCmd().exec());
    }

    @Test
    void testPullImage() {
        // 测试拉取一个轻量级镜像
        String imageName = "hello-world:latest";
        boolean result = dockerExecutor.pullImage(imageName);
        assertTrue(result, "镜像拉取应该成功");
    }

    @Test
    void testExecuteContainer_Success() {
        String taskId = UUID.randomUUID().toString();
        String nodeId = "test-node-1";

        DockerExecutor.ExecutionResult result = dockerExecutor.executeContainer(
                taskId,
                nodeId,
                "hello-world:latest",
                null,  // 使用默认命令
                null,  // 无环境变量
                null,  // 无卷挂载
                null,  // 默认工作目录
                null,  // 默认 CPU 限制
                null,  // 默认内存限制
                30,    // 30秒超时
                null   // 无日志收集器
        );

        assertNotNull(result);
        assertTrue(result.isSuccess(), "容器执行应该成功: " + result.getErrorMessage());
        assertNotNull(result.getStdout());
        assertTrue(result.getStdout().contains("Hello from Docker"), "日志应该包含预期内容");
    }

    @Test
    void testExecuteContainer_WithEnvironment() {
        String taskId = UUID.randomUUID().toString();
        String nodeId = "test-node-2";

        Map<String, String> envVars = new HashMap<>();
        envVars.put("TEST_VAR", "HelloTest");

        DockerExecutor.ExecutionResult result = dockerExecutor.executeContainer(
                taskId,
                nodeId,
                "alpine:latest",
                Arrays.asList("sh", "-c", "echo $TEST_VAR"),
                envVars,
                null,
                null,
                null,
                null,
                30,
                null
        );

        assertNotNull(result);
        assertTrue(result.isSuccess(), "容器执行应该成功: " + result.getErrorMessage());
        assertTrue(result.getStdout().contains("HelloTest"), "输出应该包含环境变量值");
    }

    @Test
    void testExecuteContainer_WithResourceLimits() {
        String taskId = UUID.randomUUID().toString();
        String nodeId = "test-node-3";

        // 1 CPU = 1000000000 nanocpus
        Long cpuLimit = 1000000000L;
        // 128MB
        Long memoryLimit = 128L * 1024 * 1024;

        DockerExecutor.ExecutionResult result = dockerExecutor.executeContainer(
                taskId,
                nodeId,
                "alpine:latest",
                Arrays.asList("sleep", "1"),
                null,
                null,
                null,
                cpuLimit,
                memoryLimit,
                30,
                null
        );

        assertNotNull(result);
        assertTrue(result.isSuccess(), "容器执行应该成功: " + result.getErrorMessage());
    }

    @Test
    void testExecuteContainer_Timeout() {
        String taskId = UUID.randomUUID().toString();
        String nodeId = "test-node-4";

        DockerExecutor.ExecutionResult result = dockerExecutor.executeContainer(
                taskId,
                nodeId,
                "alpine:latest",
                Arrays.asList("sleep", "10"),
                null,
                null,
                null,
                null,
                null,
                2,  // 2秒超时
                null
        );

        assertNotNull(result);
        assertFalse(result.isSuccess(), "容器执行应该失败（超时）");
        assertTrue(result.getErrorMessage().contains("超时"), "应该返回超时错误");
    }

    @Test
    void testExecuteContainer_InvalidImage() {
        String taskId = UUID.randomUUID().toString();
        String nodeId = "test-node-5";

        DockerExecutor.ExecutionResult result = dockerExecutor.executeContainer(
                taskId,
                nodeId,
                "nonexistent-image-12345:latest",
                null,
                null,
                null,
                null,
                null,
                null,
                30,
                null
        );

        assertNotNull(result);
        assertFalse(result.isSuccess(), "容器执行应该失败（镜像不存在）");
    }

    @Test
    void testLogCollector() {
        String taskId = UUID.randomUUID().toString();
        String nodeId = "test-node-6";

        StringBuilder collectedLogs = new StringBuilder();
        DockerExecutor.LogCollector logCollector = (logLine, isError) -> {
            collectedLogs.append(logLine);
        };

        DockerExecutor.ExecutionResult result = dockerExecutor.executeContainer(
                taskId,
                nodeId,
                "alpine:latest",
                Arrays.asList("sh", "-c", "echo 'Line1' && echo 'Line2'"),
                null,
                null,
                null,
                null,
                null,
                30,
                logCollector
        );

        assertNotNull(result);
        assertTrue(result.isSuccess(), "容器执行应该成功: " + result.getErrorMessage());
        assertTrue(collectedLogs.toString().contains("Line1"), "日志收集器应该收集到 Line1");
        assertTrue(collectedLogs.toString().contains("Line2"), "日志收集器应该收集到 Line2");
    }

    @Test
    void testCancelContainer() throws InterruptedException {
        String taskId = UUID.randomUUID().toString();
        String nodeId = "test-node-7";

        // 在另一个线程中启动长时间运行的容器
        Thread containerThread = new Thread(() -> {
            DockerExecutor.ExecutionResult result = dockerExecutor.executeContainer(
                    taskId,
                    nodeId,
                    "alpine:latest",
                    Arrays.asList("sleep", "60"),
                    null,
                    null,
                    null,
                    null,
                    null,
                    60,
                    null
            );
            assertFalse(result.isSuccess(), "容器应该被取消");
        });
        containerThread.start();

        // 等待容器启动
        Thread.sleep(3000);

        // 取消容器
        boolean cancelled = dockerExecutor.cancelContainer(taskId, nodeId);
        assertTrue(cancelled, "容器应该成功取消");

        // 等待容器线程结束
        containerThread.join(10000);
    }

    @Test
    void testVolumeMounts() {
        String taskId = UUID.randomUUID().toString();
        String nodeId = "test-node-8";

        // 创建临时目录
        String tempDir = System.getProperty("java.io.tmpdir") + "/docker-test-" + taskId;
        new java.io.File(tempDir).mkdirs();

        Map<String, String> volumeMounts = new HashMap<>();
        volumeMounts.put(tempDir, "/workspace/data");

        // 写入测试文件到主机目录
        try {
            java.nio.file.Files.write(
                    java.nio.file.Paths.get(tempDir, "test.txt"),
                    "Hello from host".getBytes()
            );
        } catch (Exception e) {
            fail("无法写入测试文件: " + e.getMessage());
        }

        DockerExecutor.ExecutionResult result = dockerExecutor.executeContainer(
                taskId,
                nodeId,
                "alpine:latest",
                Arrays.asList("cat", "/workspace/data/test.txt"),
                null,
                volumeMounts,
                null,
                null,
                null,
                30,
                null
        );

        assertNotNull(result);
        assertTrue(result.isSuccess(), "容器执行应该成功: " + result.getErrorMessage());
        assertTrue(result.getStdout().contains("Hello from host"), "应该能读取挂载的文件");

        // 清理
        dockerExecutor.removeContainer(result.getContainerId());
        try {
            java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(tempDir, "test.txt"));
            java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(tempDir));
        } catch (Exception e) {
            // 忽略清理错误
        }
    }
}
