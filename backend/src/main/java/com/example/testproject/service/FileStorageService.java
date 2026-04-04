package com.example.testproject.service;

import com.example.testproject.common.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 文件存储服务 — 本地文件系统实现
 */
@Slf4j
@Service
public class FileStorageService {

    private final Path basePath;

    public FileStorageService(@Value("${dataset.storage.local-path:/data/hydro-platform/datasets}") String storagePath) {
        this.basePath = Paths.get(storagePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.basePath);
        } catch (IOException e) {
            log.warn("无法创建存储目录: {}", this.basePath, e);
        }
    }

    /**
     * 存储上传文件到 {basePath}/{datasetId}/{filename}
     * 返回存储路径
     */
    public String storeFile(MultipartFile file, UUID datasetId) {
        String originalFilename = Objects.requireNonNull(file.getOriginalFilename(), "文件名不能为空");
        Path datasetDir = basePath.resolve(datasetId.toString());
        try {
            Files.createDirectories(datasetDir);
            Path targetFile = datasetDir.resolve(originalFilename);
            file.transferTo(targetFile.toFile());
            log.info("文件已存储: {}", targetFile);
            return targetFile.toString();
        } catch (IOException e) {
            throw new BusinessException("文件存储失败: " + e.getMessage());
        }
    }

    /**
     * 加载文件为 Resource 用于下载
     */
    public Resource loadFileAsResource(String storagePath) {
        try {
            Path filePath = Paths.get(storagePath).toAbsolutePath().normalize();
            // 路径安全检查
            if (!filePath.startsWith(basePath)) {
                throw new BusinessException("非法文件路径");
            }
            if (!Files.exists(filePath)) {
                throw new BusinessException("文件不存在");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.isReadable()) {
                throw new BusinessException("文件不可读");
            }
            return resource;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("加载文件失败: " + e.getMessage());
        }
    }

    /**
     * 删除物理文件
     */
    public void deleteFile(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) return;
        try {
            Path filePath = Paths.get(storagePath).toAbsolutePath().normalize();
            if (!filePath.startsWith(basePath)) return;
            Files.deleteIfExists(filePath);
            // 如果父目录为空也删除
            Path parent = filePath.getParent();
            if (parent != null && parent.startsWith(basePath)) {
                try (var entries = Files.list(parent)) {
                    if (entries.findAny().isEmpty()) {
                        Files.deleteIfExists(parent);
                    }
                }
            }
        } catch (IOException e) {
            log.warn("删除文件失败: {}", storagePath, e);
        }
    }

    /**
     * 计算 SHA-256 校验和
     */
    public String calculateChecksum(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            log.warn("计算校验和失败", e);
            return null;
        }
    }

    /**
     * 预览 CSV 文件，返回前 maxRows 行
     */
    public Map<String, Object> previewCsv(String storagePath, int maxRows) {
        try {
            Path filePath = Paths.get(storagePath).toAbsolutePath().normalize();
            if (!filePath.startsWith(basePath)) {
                throw new BusinessException("非法文件路径");
            }
            if (!Files.exists(filePath)) {
                throw new BusinessException("文件不存在");
            }

            List<String> headers = new ArrayList<>();
            List<Map<String, Object>> rows = new ArrayList<>();
            int totalLines = 0;
            int rowCount = 0;

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(Files.newInputStream(filePath)))) {
                String headerLine = reader.readLine();
                if (headerLine == null) {
                    return Map.of("headers", headers, "rows", rows, "totalRows", 0, "previewRows", 0);
                }
                headers = parseCsvLine(headerLine);

                String line;
                while ((line = reader.readLine()) != null) {
                    totalLines++;
                    if (rows.size() < maxRows) {
                        List<String> values = parseCsvLine(line);
                        Map<String, Object> row = new LinkedHashMap<>();
                        for (int i = 0; i < headers.size(); i++) {
                            String val = i < values.size() ? values.get(i) : "";
                            row.put(headers.get(i), tryParseNumber(val));
                        }
                        rows.add(row);
                    }
                }
            }

            return Map.of("headers", headers, "rows", rows, "totalRows", totalLines, "previewRows", rows.size());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("预览文件失败: " + e.getMessage());
        }
    }

    private List<String> parseCsvLine(String line) {
        // 简单 CSV 解析：支持逗号分隔，处理引号
        return Arrays.stream(line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)"))
                .map(s -> s.trim().replaceAll("^\"|\"$", ""))
                .collect(Collectors.toList());
    }

    private Object tryParseNumber(String val) {
        if (val == null || val.isBlank()) return "";
        try {
            if (val.contains(".")) return Double.parseDouble(val);
            return Long.parseLong(val);
        } catch (NumberFormatException e) {
            return val;
        }
    }
}
