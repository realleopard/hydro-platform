package com.example.testproject.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * 数据转换与验证服务
 * 支持多种数据格式的转换、验证和清洗
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DataTransformationService {

    private final ObjectMapper objectMapper;

    /**
     * 数据格式类型
     */
    public enum DataFormat {
        CSV, JSON, XML, NETCDF, GEOTIFF, SHAPEFILE, HDF5, EXCEL
    }

    /**
     * 数据转换结果
     */
    public record TransformationResult(
            boolean success,
            String output,
            List<String> errors,
            List<String> warnings,
            Map<String, Object> metadata
    ) {}

    /**
     * 验证规则
     */
    public record ValidationRule(
            String field,
            String type, // required, range, pattern, unique
            Object min,
            Object max,
            String pattern,
            String message
    ) {}

    /**
     * 转换数据格式
     */
    public TransformationResult convertFormat(
            MultipartFile file,
            DataFormat sourceFormat,
            DataFormat targetFormat,
            Map<String, String> options) {

        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        try {
            String content = readFileContent(file);

            // 先解析为中间格式 (JSON)
            JsonNode intermediate = parseToIntermediate(content, sourceFormat, options);

            // 转换为目标格式
            String output = convertFromIntermediate(intermediate, targetFormat, options);

            return new TransformationResult(
                    true,
                    output,
                    errors,
                    warnings,
                    Map.of("records", intermediate.size(), "format", targetFormat.name())
            );

        } catch (Exception e) {
            log.error("数据转换失败", e);
            errors.add(e.getMessage());
            return new TransformationResult(false, null, errors, warnings, null);
        }
    }

    /**
     * 验证数据
     */
    public TransformationResult validateData(
            MultipartFile file,
            DataFormat format,
            List<ValidationRule> rules) {

        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        try {
            String content = readFileContent(file);
            JsonNode data = parseToIntermediate(content, format, Map.of());

            if (!data.isArray()) {
                data = objectMapper.createArrayNode().add(data);
            }

            int totalRecords = data.size();
            int validRecords = 0;
            int invalidRecords = 0;

            for (int i = 0; i < data.size(); i++) {
                JsonNode record = data.get(i);
                List<String> recordErrors = validateRecord(record, rules);
                final int recordNum = i + 1;

                if (recordErrors.isEmpty()) {
                    validRecords++;
                } else {
                    invalidRecords++;
                    errors.addAll(recordErrors.stream()
                            .map(e -> "记录 " + recordNum + ": " + e)
                            .toList());
                }
            }

            // 检查唯一性约束
            errors.addAll(checkUniqueConstraints(data, rules));

            Map<String, Object> metadata = Map.of(
                    "totalRecords", totalRecords,
                    "validRecords", validRecords,
                    "invalidRecords", invalidRecords
            );

            return new TransformationResult(
                    errors.isEmpty(),
                    null,
                    errors,
                    warnings,
                    metadata
            );

        } catch (Exception e) {
            log.error("数据验证失败", e);
            errors.add(e.getMessage());
            return new TransformationResult(false, null, errors, warnings, null);
        }
    }

    /**
     * 数据清洗
     */
    public TransformationResult cleanData(
            MultipartFile file,
            DataFormat format,
            Map<String, Object> cleaningOptions) {

        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        try {
            String content = readFileContent(file);
            JsonNode data = parseToIntermediate(content, format, Map.of());

            if (!data.isArray()) {
                data = objectMapper.createArrayNode().add(data);
            }

            ArrayNode cleanedData = objectMapper.createArrayNode();
            int removedCount = 0;
            int filledCount = 0;

            for (JsonNode record : data) {
                ObjectNode cleanedRecord = ((ObjectNode) record).deepCopy();
                boolean shouldRemove = false;

                Iterator<String> fields = cleanedRecord.fieldNames();
                while (fields.hasNext()) {
                    String field = fields.next();
                    JsonNode value = cleanedRecord.get(field);

                    // 处理空值
                    if (value == null || value.isNull() ||
                            (value.isTextual() && value.asText().trim().isEmpty())) {

                        Object fillValue = cleaningOptions.get("fill_" + field);
                        if (fillValue != null) {
                            cleanedRecord.put(field, fillValue.toString());
                            filledCount++;
                        } else if (Boolean.TRUE.equals(cleaningOptions.get("removeEmpty"))) {
                            shouldRemove = true;
                            break;
                        }
                    }

                    // 去除空格
                    if (Boolean.TRUE.equals(cleaningOptions.get("trimStrings")) &&
                            value != null && value.isTextual()) {
                        cleanedRecord.put(field, value.asText().trim());
                    }
                }

                if (!shouldRemove) {
                    cleanedData.add(cleanedRecord);
                } else {
                    removedCount++;
                }
            }

            String output = objectMapper.writeValueAsString(cleanedData);

            Map<String, Object> metadata = Map.of(
                    "originalRecords", data.size(),
                    "cleanedRecords", cleanedData.size(),
                    "removedRecords", removedCount,
                    "filledValues", filledCount
            );

            return new TransformationResult(
                    true,
                    output,
                    errors,
                    warnings,
                    metadata
            );

        } catch (Exception e) {
            log.error("数据清洗失败", e);
            errors.add(e.getMessage());
            return new TransformationResult(false, null, errors, warnings, null);
        }
    }

    /**
     * 解析为中间格式
     */
    private JsonNode parseToIntermediate(String content, DataFormat format, Map<String, String> options) {
        return switch (format) {
            case CSV -> parseCSV(content, options);
            case JSON -> parseJSON(content);
            case XML -> parseXML(content);
            case EXCEL -> parseExcel(content, options);
            default -> throw new UnsupportedOperationException("不支持的格式: " + format);
        };
    }

    /**
     * 从中间格式转换
     */
    private String convertFromIntermediate(JsonNode data, DataFormat format, Map<String, String> options) {
        return switch (format) {
            case CSV -> convertToCSV(data, options);
            case JSON -> convertToJSON(data);
            case XML -> convertToXML(data);
            default -> throw new UnsupportedOperationException("不支持的格式: " + format);
        };
    }

    /**
     * 解析CSV
     */
    private JsonNode parseCSV(String content, Map<String, String> options) {
        String delimiter = options.getOrDefault("delimiter", ",");
        boolean hasHeader = Boolean.parseBoolean(options.getOrDefault("header", "true"));

        String[] lines = content.split("\n");
        ArrayNode result = objectMapper.createArrayNode();

        if (lines.length == 0) {
            return result;
        }

        String[] headers = hasHeader ?
                lines[0].split(delimiter) :
                generateHeaders(lines[0].split(delimiter).length);

        int startLine = hasHeader ? 1 : 0;

        for (int i = startLine; i < lines.length; i++) {
            if (lines[i].trim().isEmpty()) continue;

            String[] values = lines[i].split(delimiter, -1);
            ObjectNode record = objectMapper.createObjectNode();

            for (int j = 0; j < Math.min(headers.length, values.length); j++) {
                String header = headers[j].trim();
                String value = values[j].trim();

                // 尝试解析为数字
                if (value.matches("-?\\d+(\\.\\d+)?")) {
                    if (value.contains(".")) {
                        record.put(header, Double.parseDouble(value));
                    } else {
                        record.put(header, Long.parseLong(value));
                    }
                } else {
                    record.put(header, value);
                }
            }

            result.add(record);
        }

        return result;
    }

    /**
     * 转换为CSV
     */
    private String convertToCSV(JsonNode data, Map<String, String> options) {
        String delimiter = options.getOrDefault("delimiter", ",");
        StringBuilder sb = new StringBuilder();

        if (!data.isEmpty()) {
            // 表头
            JsonNode first = data.get(0);
            Iterator<String> fields = first.fieldNames();
            List<String> headers = new ArrayList<>();
            while (fields.hasNext()) {
                headers.add(fields.next());
            }
            sb.append(String.join(delimiter, headers)).append("\n");

            // 数据
            for (JsonNode record : data) {
                List<String> values = new ArrayList<>();
                for (String header : headers) {
                    JsonNode value = record.get(header);
                    values.add(value != null ? value.asText() : "");
                }
                sb.append(String.join(delimiter, values)).append("\n");
            }
        }

        return sb.toString();
    }

    /**
     * 解析JSON
     */
    private JsonNode parseJSON(String content) {
        try {
            return objectMapper.readTree(content);
        } catch (Exception e) {
            throw new RuntimeException("JSON解析失败: " + e.getMessage());
        }
    }

    /**
     * 转换为JSON
     */
    private String convertToJSON(JsonNode data) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(data);
        } catch (Exception e) {
            throw new RuntimeException("JSON转换失败: " + e.getMessage());
        }
    }

    /**
     * 解析XML（简化实现）
     */
    private JsonNode parseXML(String content) {
        // 实际实现应使用 XML 解析库
        throw new UnsupportedOperationException("XML解析暂不支持");
    }

    /**
     * 转换为XML
     */
    private String convertToXML(JsonNode data) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<records>\n");

        for (JsonNode record : data) {
            sb.append("  <record>\n");
            Iterator<String> fields = record.fieldNames();
            while (fields.hasNext()) {
                String field = fields.next();
                String value = record.get(field).asText();
                sb.append("    <").append(field).append(">")
                        .append(escapeXml(value))
                        .append("</").append(field).append(">\n");
            }
            sb.append("  </record>\n");
        }

        sb.append("</records>");
        return sb.toString();
    }

    /**
     * 解析Excel
     */
    private JsonNode parseExcel(String content, Map<String, String> options) {
        // 实际实现应使用 Apache POI
        throw new UnsupportedOperationException("Excel解析暂不支持");
    }

    /**
     * 验证单条记录
     */
    private List<String> validateRecord(JsonNode record, List<ValidationRule> rules) {
        List<String> errors = new ArrayList<>();

        for (ValidationRule rule : rules) {
            JsonNode value = record.get(rule.field());

            switch (rule.type()) {
                case "required" -> {
                    if (value == null || value.isNull() ||
                            (value.isTextual() && value.asText().trim().isEmpty())) {
                        errors.add(rule.field() + " 不能为空");
                    }
                }
                case "range" -> {
                    if (value != null && value.isNumber()) {
                        double num = value.asDouble();
                        if (rule.min() != null && num < ((Number) rule.min()).doubleValue()) {
                            errors.add(rule.field() + " 不能小于 " + rule.min());
                        }
                        if (rule.max() != null && num > ((Number) rule.max()).doubleValue()) {
                            errors.add(rule.field() + " 不能大于 " + rule.max());
                        }
                    }
                }
                case "pattern" -> {
                    if (value != null && value.isTextual()) {
                        String text = value.asText();
                        if (!text.matches(rule.pattern())) {
                            errors.add(rule.field() + " 格式不正确: " + rule.message());
                        }
                    }
                }
            }
        }

        return errors;
    }

    /**
     * 检查唯一性约束
     */
    private List<String> checkUniqueConstraints(JsonNode data, List<ValidationRule> rules) {
        List<String> errors = new ArrayList<>();

        for (ValidationRule rule : rules) {
            if ("unique".equals(rule.type())) {
                Set<String> seen = new HashSet<>();
                for (JsonNode record : data) {
                    JsonNode value = record.get(rule.field());
                    if (value != null) {
                        String key = value.asText();
                        if (!seen.add(key)) {
                            errors.add("重复值: " + rule.field() + " = " + key);
                        }
                    }
                }
            }
        }

        return errors;
    }

    /**
     * 读取文件内容
     */
    private String readFileContent(MultipartFile file) throws Exception {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        }
    }

    /**
     * 生成默认表头
     */
    private String[] generateHeaders(int count) {
        String[] headers = new String[count];
        for (int i = 0; i < count; i++) {
            headers[i] = "column_" + (i + 1);
        }
        return headers;
    }

    /**
     * XML转义
     */
    private String escapeXml(String text) {
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
