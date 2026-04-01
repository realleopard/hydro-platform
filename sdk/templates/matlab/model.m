function {{model_name}}()
% {{model_name}} - 流域水系统模拟模型
% 基于 Watershed SDK 的 MATLAB 模型模板
%
% 使用方法:
%   {{model_name}}() - 运行模型
%

    %% 初始化
    config = struct();
    config.name = '{{model_name}}';
    config.version = '{{version}}';
    config.description = '{{model_description}}';
    config.author = '{{author}}';

    % 创建模型实例
    model = {{class_name}}(config);

    %% 设置参数
    {% for param in parameters %}
    model.setParameter('{{param.name}}', {{param.default}});
    {% endfor %}

    %% 设置输入
    % TODO: 加载实际输入数据
    {% for input in inputs %}
    model.setInput('{{input.name}}', [0, 1, 2]);  % 示例数据
    {% endfor %}

    %% 运行模型
    model.run();

    %% 获取输出
    outputs = model.getOutputs();
    disp('模型运行完成!');
    disp(outputs);

    %% 保存输出
    outputDir = getenv('OUTPUT_DIR');
    if isempty(outputDir)
        outputDir = 'outputs';
    end
    model.saveOutputs(outputDir);
end

%% 模型类
classdef {{class_name}} < handle
    properties
        config
        parameters
        inputs
        outputs
        metadata
    end

    methods
        function obj = {{class_name}}(config)
            % 构造函数
            obj.config = config;
            obj.parameters = struct();
            obj.inputs = struct();
            obj.outputs = struct();
            obj.metadata = struct('status', 'initialized');

            % 设置默认参数
            {% for param in parameters %}
            obj.parameters.{{param.name}} = {{param.default}};
            {% endfor %}
        end

        function setParameter(obj, name, value)
            % 设置参数
            obj.parameters.(name) = value;
        end

        function setInput(obj, name, value)
            % 设置输入
            obj.inputs.(name) = value;
        end

        function run(obj)
            % 运行模型
            obj.preRun();

            try
                % 获取参数和输入
                {% for param in parameters %}
                {{param.name}} = obj.parameters.{{param.name}};
                {% endfor %}

                {% for input in inputs %}
                {{input.name}} = obj.inputs.{{input.name}};
                {% endfor %}

                % TODO: 实现模型计算逻辑
                % ========================================

                {% for output in outputs %}
                % 计算 {{output.description}}
                obj.outputs.{{output.name}} = obj.calculate{{output.name | capitalize}}(...
                    {% for input in inputs %}{{input.name}}, {% endfor %}{% for param in parameters %}{{param.name}}{% if not loop.last %}, {% endif %}{% endfor %});
                {% endfor %}

                obj.postRun(true);

            catch ME
                obj.postRun(false, ME.message);
                rethrow(ME);
            end
        end

        {% for output in outputs %}
        function result = calculate{{output.name | capitalize}}(obj, {% for input in inputs %}{{input.name}}, {% endfor %}{% for param in parameters %}{{param.name}}{% if not loop.last %}, {% endif %}{% endfor %})
            % 计算 {{output.description}}
            % TODO: 实现具体计算逻辑
            result = zeros(size({{inputs[0].name if inputs else '1'}}));
        end
        {% endfor %}

        function outputs = getOutputs(obj)
            % 获取输出
            outputs = obj.outputs;
        end

        function preRun(obj)
            % 运行前准备
            obj.metadata.startTime = datetime('now');
            obj.metadata.status = 'running';
        end

        function postRun(obj, success, errorMsg)
            % 运行后处理
            obj.metadata.endTime = datetime('now');
            if success
                obj.metadata.status = 'completed';
            else
                obj.metadata.status = 'failed';
                obj.metadata.error = errorMsg;
            end
        end

        function saveOutputs(obj, outputDir)
            % 保存输出到目录
            if ~exist(outputDir, 'dir')
                mkdir(outputDir);
            end

            % 保存每个输出变量
            outputNames = fieldnames(obj.outputs);
            for i = 1:length(outputNames)
                name = outputNames{i};
                data = obj.outputs.(name);
                filename = fullfile(outputDir, [name, '.mat']);
                save(filename, 'data');
            end

            % 保存元数据
            metadata = obj.metadata;
            save(fullfile(outputDir, 'metadata.mat'), 'metadata');

            fprintf('输出已保存到: %s\n', outputDir);
        end
    end
end