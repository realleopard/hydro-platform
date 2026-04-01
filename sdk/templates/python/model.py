"""
{{model_name}} - 流域水系统模拟模型

基于 Watershed SDK 的 Python 模型模板
"""

import numpy as np
import pandas as pd
from watershed_sdk import BaseModel, ModelConfig, Parameter, Variable


class {{class_name}}(BaseModel):
    """
    {{model_description}}
    """

    def __init__(self):
        config = ModelConfig(
            name="{{model_name}}",
            version="{{version}}",
            description="{{model_description}}",
            author="{{author}}",
            parameters=[
                {% for param in parameters %}
                Parameter(
                    name="{{param.name}}",
                    type="{{param.type}}",
                    default={{param.default}},
                    min_value={{param.min_value or 'None'}},
                    max_value={{param.max_value or 'None'}},
                    description="{{param.description}}",
                    unit="{{param.unit}}"
                ),
                {% endfor %}
            ],
            inputs=[
                {% for input in inputs %}
                Variable(
                    name="{{input.name}}",
                    type="{{input.type}}",
                    data_type="{{input.data_type}}",
                    description="{{input.description}}",
                    unit="{{input.unit}}",
                    required={{input.required}}
                ),
                {% endfor %}
            ],
            outputs=[
                {% for output in outputs %}
                Variable(
                    name="{{output.name}}",
                    type="{{output.type}}",
                    data_type="{{output.data_type}}",
                    description="{{output.description}}",
                    unit="{{output.unit}}"
                ),
                {% endfor %}
            ],
            cpu_cores={{cpu_cores or 1}},
            memory_mb={{memory_mb or 512}},
            base_image="{{base_image or 'python:3.11-slim'}}"
        )
        super().__init__(config)

    def run(self):
        """
        模型主运行逻辑
        """
        self._pre_run()

        try:
            # 获取输入和参数
            {% for input in inputs %}
            {{input.name}} = self.inputs.get("{{input.name}}")
            {% endfor %}

            {% for param in parameters %}
            {{param.name}} = self.parameters.get("{{param.name}}")
            {% endfor %}

            # TODO: 实现模型计算逻辑
            # ========================================
            # 在这里编写模型的核心计算代码
            # ========================================

            {% for output in outputs %}
            # 计算 {{output.name}}
            self.outputs["{{output.name}}"] = self._calculate_{{output.name}}(
                {% for input in inputs %}{{input.name}}, {% endfor %}
                {% for param in parameters %}{{param.name}}{% if not loop.last %}, {% endif %}{% endfor %}
            )
            {% endfor %}

            self._post_run(success=True)

        except Exception as e:
            self._post_run(success=False, error=str(e))
            raise

        return self

    {% for output in outputs %}
    def _calculate_{{output.name}}(self, {% for input in inputs %}{{input.name}}, {% endfor %}{% for param in parameters %}{{param.name}}{% if not loop.last %}, {% endif %}{% endfor %}):
        """
        计算 {{output.description}}
        """
        # TODO: 实现 {{output.name}} 的计算逻辑
        result = np.zeros_like({{inputs[0].name if inputs else '[]'}})
        return result
    {% endfor %}


if __name__ == "__main__":
    # 本地测试
    model = {{class_name}}()

    # 设置参数
    model.set_parameters(
        {% for param in parameters %}
        {{param.name}}={{param.default}}{% if not loop.last %},{% endif %}
        {% endfor %}
    )

    # 设置输入
    model.set_inputs(
        {% for input in inputs %}
        {{input.name}}=np.array([0.0, 1.0, 2.0])  # TODO: 替换为实际输入数据{% if not loop.last %},{% endif %}
        {% endfor %}
    )

    # 运行模型
    model.run()

    # 输出结果
    print("模型运行完成!")
    for name, data in model.get_outputs().items():
        print(f"{name}: {data}")
