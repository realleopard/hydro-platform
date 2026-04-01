package com.example.testproject.supercomputer;

import com.example.testproject.dto.task.TaskMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * 超算中心网关
 * 用于对接外部高性能计算资源
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupercomputerGateway {

    private final RestTemplate restTemplate;

    @Value("${watershed.hpc.enabled:false}")
    private boolean hpcEnabled;

    @Value("${watershed.hpc.api-url:}")
    private String hpcApiUrl;

    @Value("${watershed.hpc.api-key:}")
    private String hpcApiKey;

    @Value("${watershed.hpc.queue:default}")
    private String hpcQueue;

    /**
     * 提交任务到超算中心
     */
    public String submitJob(TaskMessage task) {
        if (!hpcEnabled) {
            throw new RuntimeException("超算中心未启用");
        }

        log.info("提交任务到超算中心: taskId={}", task.getTaskId());

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-API-Key", hpcApiKey);

            Map<String, Object> jobRequest = new HashMap<>();
            jobRequest.put("name", "watershed-task-" + task.getTaskId());
            jobRequest.put("queue", hpcQueue);
            jobRequest.put("command", buildCommand(task));
            jobRequest.put("resources", Map.of(
                    "nodes", 1,
                    "cpus", task.getResources().getCpuCores(),
                    "memory", task.getResources().getMemoryMb() + "M",
                    "walltime", task.getResources().getMaxRuntimeSeconds() + "s"
            ));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(jobRequest, headers);

            Map<String, Object> response = restTemplate.postForObject(
                    hpcApiUrl + "/jobs",
                    request,
                    Map.class
            );

            String jobId = (String) response.get("jobId");
            log.info("任务已提交到超算中心: taskId={}, hpcJobId={}", task.getTaskId(), jobId);

            return jobId;

        } catch (Exception e) {
            log.error("提交任务到超算中心失败: taskId={}", task.getTaskId(), e);
            throw new RuntimeException("超算任务提交失败: " + e.getMessage(), e);
        }
    }

    /**
     * 查询任务状态
     */
    public HpcJobStatus queryJobStatus(String hpcJobId) {
        if (!hpcEnabled) {
            return null;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-API-Key", hpcApiKey);

            HttpEntity<Void> request = new HttpEntity<>(headers);

            Map<String, Object> response = restTemplate.getForObject(
                    hpcApiUrl + "/jobs/" + hpcJobId,
                    Map.class
            );

            String status = (String) response.get("status");
            return HpcJobStatus.valueOf(status.toUpperCase());

        } catch (Exception e) {
            log.error("查询超算任务状态失败: hpcJobId={}", hpcJobId, e);
            return HpcJobStatus.UNKNOWN;
        }
    }

    /**
     * 取消超算任务
     */
    public boolean cancelJob(String hpcJobId) {
        if (!hpcEnabled) {
            return false;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-API-Key", hpcApiKey);

            HttpEntity<Void> request = new HttpEntity<>(headers);

            restTemplate.delete(hpcApiUrl + "/jobs/" + hpcJobId);

            log.info("超算任务已取消: hpcJobId={}", hpcJobId);
            return true;

        } catch (Exception e) {
            log.error("取消超算任务失败: hpcJobId={}", hpcJobId, e);
            return false;
        }
    }

    /**
     * 构建执行命令
     */
    private String buildCommand(TaskMessage task) {
        // 构建容器运行命令
        return String.format(
                "docker run --rm -e TASK_ID=%s -e WORKFLOW_ID=%s watershed-model:latest",
                task.getTaskId(),
                task.getWorkflowId()
        );
    }

    /**
     * 超算任务状态枚举
     */
    public enum HpcJobStatus {
        QUEUED,    // 排队中
        RUNNING,   // 运行中
        COMPLETED, // 已完成
        FAILED,    // 失败
        CANCELLED, // 已取消
        UNKNOWN    // 未知
    }
}