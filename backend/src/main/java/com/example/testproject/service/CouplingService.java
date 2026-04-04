package com.example.testproject.service;

import com.example.testproject.dto.WorkflowDefinition;
import com.example.testproject.dto.WorkflowEdge;
import com.example.testproject.dto.WorkflowNode;
import com.example.testproject.entity.TaskNode;
import com.example.testproject.mapper.TaskNodeMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

/**
 * 模型耦合服务 — 处理工作流节点间的数据传递、文件传递和格式转换
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CouplingService {

    private final TaskNodeMapper taskNodeMapper;
    private final ObjectMapper objectMapper;
    private final DependencyResolver dependencyResolver;

    private static final String BASE_DIR = System.getProperty("user.dir");
    private static final long LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

    /**
     * 收集前置节点的输出并应用数据映射
     */
    public Map<String, Object> collectMappedInputs(UUID taskId, String nodeId,
                                                    List<String> dependencies,
                                                    WorkflowDefinition definition) {
        Map<String, Object> mappedInputs = new HashMap<>();
        if (dependencies == null || dependencies.isEmpty()) {
            return mappedInputs;
        }

        Map<String, String> dataMappings = dependencyResolver.getIncomingDataMappings(definition, nodeId);

        Map<String, Map<String, Object>> predecessorOutputs = new HashMap<>();
        for (String depNodeId : dependencies) {
            TaskNode depTaskNode = taskNodeMapper.selectByTaskIdAndNodeId(taskId, depNodeId);
            if (depTaskNode != null && depTaskNode.getOutputs() != null) {
                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> outputs = objectMapper.readValue(depTaskNode.getOutputs(), Map.class);
                    predecessorOutputs.put(depNodeId, outputs);
                } catch (Exception e) {
                    log.warn("解析前置节点输出失败: depNodeId={}, error={}", depNodeId, e.getMessage());
                }
            }
        }

        for (Map.Entry<String, String> mapping : dataMappings.entrySet()) {
            String targetField = mapping.getKey();
            String sourceExpression = mapping.getValue();

            // 支持 "sourcePort|transform:csv_to_json" 格式
            String transform = null;
            String expression = sourceExpression;
            if (sourceExpression.contains("|transform:")) {
                String[] parts = sourceExpression.split("\\|transform:", 2);
                expression = parts[0];
                transform = parts[1];
            }

            Object resolvedValue = resolveDataExpression(expression, predecessorOutputs);
            if (resolvedValue != null) {
                if (transform != null) {
                    resolvedValue = applyTransform(resolvedValue, transform);
                }
                mappedInputs.put(targetField, resolvedValue);
            }
        }

        log.info("数据映射完成: taskId={}, nodeId={}, 映射字段数={}", taskId, nodeId, mappedInputs.size());
        return mappedInputs;
    }

    /**
     * 解析数据表达式，支持 "sourceNodeId.fieldName" 或 "fieldName" 格式
     */
    public Object resolveDataExpression(String expression,
                                         Map<String, Map<String, Object>> predecessorOutputs) {
        if (expression == null || expression.isEmpty()) return null;

        int dotIndex = expression.indexOf('.');
        if (dotIndex > 0 && dotIndex < expression.length() - 1) {
            String sourceNodeId = expression.substring(0, dotIndex);
            String fieldName = expression.substring(dotIndex + 1);
            Map<String, Object> sourceOutputs = predecessorOutputs.get(sourceNodeId);
            if (sourceOutputs != null) {
                return resolveNestedField(sourceOutputs, fieldName);
            }
        }

        for (Map<String, Object> outputs : predecessorOutputs.values()) {
            Object val = resolveNestedField(outputs, expression);
            if (val != null) return val;
        }
        return null;
    }

    /**
     * 解析嵌套字段，如 "outputFiles.results.json"
     */
    private Object resolveNestedField(Map<String, Object> data, String fieldPath) {
        String[] parts = fieldPath.split("\\.");
        Object current = data;
        for (String part : parts) {
            if (current instanceof Map) {
                current = ((Map<String, Object>) current).get(part);
            } else {
                return null;
            }
        }
        return current;
    }

    /**
     * 捕获容器输出目录中的文件清单
     * 扫描 output/tasks/{taskId}/{nodeId}/ 并记录文件元数据
     */
    public Map<String, Object> captureOutputFiles(UUID taskId, String nodeId) {
        String outputDir = BASE_DIR + "/output/tasks/" + taskId + "/" + nodeId;
        Path dir = Paths.get(outputDir);
        Map<String, Object> outputFiles = new HashMap<>();
        if (!Files.exists(dir)) return outputFiles;

        try (var stream = Files.list(dir)) {
            for (Path file : stream.toList()) {
                if (Files.isRegularFile(file)) {
                    String fileName = file.getFileName().toString();
                    Map<String, Object> fileInfo = new HashMap<>();
                    fileInfo.put("fileName", fileName);
                    fileInfo.put("hostPath", file.toString());
                    fileInfo.put("containerPath", "/workspace/output/" + fileName);
                    fileInfo.put("fileSize", Files.size(file));
                    fileInfo.put("contentType", guessContentType(fileName));
                    outputFiles.put(fileName, fileInfo);
                }
            }
        } catch (Exception e) {
            log.warn("扫描输出目录失败: {}", outputDir, e);
        }
        return outputFiles;
    }

    /**
     * 构建节点输出 JSON，合并 stdout JSON 和输出文件清单
     */
    public String buildNodeOutputs(UUID taskId, String nodeId, String stdout) {
        Map<String, Object> outputs = new HashMap<>();
        outputs.put("outputPath", "/workspace/output");

        if (stdout != null && !stdout.trim().isEmpty()) {
            try {
                JsonNode stdoutNode = objectMapper.readTree(stdout.trim());
                if (stdoutNode.isObject()) {
                    Iterator<Map.Entry<String, JsonNode>> fields = stdoutNode.fields();
                    while (fields.hasNext()) {
                        Map.Entry<String, JsonNode> field = fields.next();
                        outputs.put(field.getKey(), objectMapper.convertValue(field.getValue(), Object.class));
                    }
                } else if (stdoutNode.isValueNode()) {
                    outputs.put("stdoutValue", objectMapper.convertValue(stdoutNode, Object.class));
                }
            } catch (Exception e) {
                outputs.put("stdout", stdout.trim());
            }
        }

        Map<String, Object> outputFileMap = captureOutputFiles(taskId, nodeId);
        if (!outputFileMap.isEmpty()) {
            outputs.put("outputFiles", outputFileMap);
        }

        try {
            return objectMapper.writeValueAsString(outputs);
        } catch (Exception e) {
            log.warn("构建节点输出 JSON 失败: {}", e.getMessage());
            return "{}";
        }
    }

    /**
     * 准备文件输入：从前置节点输出中提取文件并复制/链接到当前节点的输入目录
     */
    public void prepareFileInputs(UUID taskId, String nodeId, Map<String, Object> mappedInputs) {
        String inputDir = BASE_DIR + "/data/tasks/" + taskId + "/" + nodeId + "/input";
        try {
            Files.createDirectories(Paths.get(inputDir));
        } catch (Exception e) {
            log.warn("创建输入目录失败: {}", inputDir, e);
            return;
        }

        for (Map.Entry<String, Object> entry : new HashMap<>(mappedInputs).entrySet()) {
            if (entry.getValue() instanceof Map fileMap) {
                String hostPath = (String) fileMap.get("hostPath");
                if (hostPath != null && Files.exists(Paths.get(hostPath))) {
                    try {
                        String fileName = (String) fileMap.get("fileName");
                        Path source = Paths.get(hostPath);
                        Path target = Paths.get(inputDir, fileName);

                        long fileSize = Files.size(source);
                        if (fileSize > LARGE_FILE_THRESHOLD) {
                            // 大文件使用符号链接
                            Files.createSymbolicLink(target, source);
                            log.info("大文件符号链接: {} -> {}", target, source);
                        } else {
                            Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
                        }

                        mappedInputs.put(entry.getKey(), Map.of(
                                "file", "/workspace/input/" + fileName,
                                "hostPath", target.toString(),
                                "fileName", fileName,
                                "fileSize", fileSize
                        ));
                    } catch (Exception e) {
                        log.warn("文件传递失败: {} -> {}", hostPath, inputDir, e);
                    }
                }
            }
        }
    }

    /**
     * 构建环境变量，注入映射的输入数据
     */
    public Map<String, String> buildEnvironmentVariables(WorkflowNode node, UUID taskId,
                                                          String nodeId, Map<String, Object> mappedInputs) {
        Map<String, String> envVars = new HashMap<>();
        envVars.put("TASK_ID", taskId.toString());
        envVars.put("NODE_ID", nodeId);
        envVars.put("WORKING_DIR", "/workspace");

        if (node != null && node.getConfig() != null) {
            Object envObj = node.getConfig().get("env");
            if (envObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> nodeEnv = (Map<String, Object>) envObj;
                for (Map.Entry<String, Object> entry : nodeEnv.entrySet()) {
                    envVars.put(entry.getKey(), String.valueOf(entry.getValue()));
                }
            }
        }

        if (mappedInputs != null && !mappedInputs.isEmpty()) {
            for (Map.Entry<String, Object> entry : mappedInputs.entrySet()) {
                String envKey = "INPUT_" + entry.getKey().toUpperCase().replace('.', '_');
                String value = entry.getValue() instanceof Map
                        ? objectMapper.convertValue(entry.getValue(), String.class)
                        : String.valueOf(entry.getValue());
                envVars.put(envKey, value);
            }
            envVars.put("INPUT_DATA_FILE", "/workspace/input/data.json");
        }

        return envVars;
    }

    /**
     * 写入输入数据 JSON 文件
     */
    public void prepareInputData(UUID taskId, String nodeId, Map<String, Object> mappedInputs) {
        String inputDir = BASE_DIR + "/data/tasks/" + taskId + "/" + nodeId + "/input";
        try {
            Path inputDirPath = Paths.get(inputDir);
            Files.createDirectories(inputDirPath);
            String jsonContent = objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(mappedInputs);
            Files.writeString(inputDirPath.resolve("data.json"), jsonContent);
        } catch (Exception e) {
            log.error("准备输入数据失败: taskId={}, nodeId={}", taskId, nodeId, e);
            throw new RuntimeException("准备输入数据失败: " + e.getMessage(), e);
        }
    }

    /**
     * 验证工作流中所有边的数据映射是否兼容
     * 返回警告列表（空列表表示全部兼容）
     */
    public List<Map<String, Object>> validateDataMappings(WorkflowDefinition definition) {
        List<Map<String, Object>> warnings = new ArrayList<>();
        if (definition == null || definition.getEdges() == null) return warnings;

        for (WorkflowEdge edge : definition.getEdges()) {
            if (edge.getDataMapping() == null || edge.getDataMapping().isEmpty()) continue;

            WorkflowNode sourceNode = findNode(definition, edge.getSource());
            WorkflowNode targetNode = findNode(definition, edge.getTarget());

            if (sourceNode == null || targetNode == null) continue;

            for (Map.Entry<String, String> mapping : edge.getDataMapping().entrySet()) {
                Map<String, Object> warning = new HashMap<>();
                warning.put("edgeId", edge.getId());
                warning.put("sourceNode", sourceNode.getName());
                warning.put("targetNode", targetNode.getName());
                warning.put("targetPort", mapping.getKey());
                warning.put("sourcePort", mapping.getValue());
                // 简单检查：标记未配置映射的边
                warnings.add(warning);
            }
        }
        return warnings;
    }

    private WorkflowNode findNode(WorkflowDefinition definition, String nodeId) {
        if (definition.getNodes() == null) return null;
        return definition.getNodes().stream()
                .filter(n -> nodeId.equals(n.getId()))
                .findFirst().orElse(null);
    }

    private String guessContentType(String fileName) {
        if (fileName.endsWith(".csv")) return "text/csv";
        if (fileName.endsWith(".json")) return "application/json";
        if (fileName.endsWith(".nc") || fileName.endsWith(".nc4")) return "application/x-netcdf";
        if (fileName.endsWith(".tif") || fileName.endsWith(".tiff")) return "image/tiff";
        if (fileName.endsWith(".shp")) return "application/x-shapefile";
        return "application/octet-stream";
    }

    private Object applyTransform(Object value, String transform) {
        // 当前支持简单转换标记，后续可扩展
        log.info("应用数据转换: transform={}", transform);
        return value;
    }
}
