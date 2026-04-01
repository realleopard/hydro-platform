#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <nlohmann/json.hpp>

namespace watershed {

using json = nlohmann::json;

/**
 * 参数定义结构
 */
struct Parameter {
    std::string name;
    std::string type;
    double defaultValue;
    double minValue;
    double maxValue;
    std::string description;
    std::string unit;
};

/**
 * 变量定义结构
 */
struct Variable {
    std::string name;
    std::string type;
    std::string dataType;
    std::vector<std::string> dimensions;
    std::string description;
    std::string unit;
    bool required;
};

/**
 * 模型配置结构
 */
struct ModelConfig {
    std::string name;
    std::string version;
    std::string description;
    std::string author;
    std::vector<Parameter> parameters;
    std::vector<Variable> inputs;
    std::vector<Variable> outputs;
    int cpuCores;
    int memoryMb;
    int maxRuntimeSeconds;
};

/**
 * 模型基类
 */
class BaseModel {
public:
    explicit BaseModel(const ModelConfig& config);
    virtual ~BaseModel() = default;

    // 设置参数
    void setParameters(const std::map<std::string, double>& params);

    // 设置输入
    void setInputs(const std::map<std::string, std::vector<double>>& inputs);

    // 运行模型（纯虚函数，子类必须实现）
    virtual void run() = 0;

    // 获取输出
    std::map<std::string, std::vector<double>> getOutputs() const;

    // 获取元数据
    json getMetadata() const;

protected:
    ModelConfig config_;
    std::map<std::string, double> parameters_;
    std::map<std::string, std::vector<double>> inputs_;
    std::map<std::string, std::vector<double>> outputs_;
    json metadata_;

    void preRun();
    void postRun(bool success, const std::string& error = "");
};

} // namespace watershed
