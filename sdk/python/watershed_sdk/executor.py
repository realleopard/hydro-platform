"""
本地执行器模块

用于在本地运行模型，便于开发和测试
"""

import json
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
import time

from .model import BaseModel, ModelConfig
from .io import InputHandler, OutputHandler
from .validation import Validator, ValidationMetrics

logger = logging.getLogger(__name__)


class LocalExecutor:
    """
    本地模型执行器

    支持在本地运行模型，用于开发和测试
    """

    def __init__(
        self,
        working_dir: Optional[str] = None,
        output_dir: Optional[str] = None
    ):
        """
        初始化执行器

        Args:
            working_dir: 工作目录
            output_dir: 输出目录
        """
        self.working_dir = Path(working_dir) if working_dir else Path.cwd()
        self.output_dir = Path(output_dir) if output_dir else self.working_dir / "outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.history: List[Dict] = []

    def run(
        self,
        model: BaseModel,
        inputs: Optional[Dict[str, Any]] = None,
        parameters: Optional[Dict[str, Any]] = None,
        validate: bool = False,
        observed_data: Optional[Any] = None
    ) -> Dict:
        """
        运行模型

        Args:
            model: 模型实例
            inputs: 输入数据
            parameters: 模型参数
            validate: 是否验证结果
            observed_data: 观测数据（用于验证）

        Returns:
            运行结果
        """
        run_id = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        run_output_dir = self.output_dir / run_id
        run_output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"开始运行: {run_id}")
        start_time = time.time()

        try:
            # 设置参数
            if parameters:
                model.set_parameters(**parameters)

            # 设置输入
            if inputs:
                model.set_inputs(**inputs)

            # 运行模型
            model.run()

            # 获取输出
            outputs = model.get_outputs()

            # 保存输出
            output_handler = OutputHandler(str(run_output_dir))
            for name, data in outputs.items():
                output_handler.save(name, data, model.config.outputs[name].type)

            # 验证
            validation_results = None
            if validate and observed_data is not None:
                validation_results = self._validate_outputs(
                    outputs, observed_data, model.config
                )

            # 记录运行历史
            run_record = {
                "run_id": run_id,
                "model_name": model.config.name,
                "model_version": model.config.version,
                "start_time": model.metadata.get("start_time"),
                "end_time": model.metadata.get("end_time"),
                "duration": time.time() - start_time,
                "status": "success",
                "output_dir": str(run_output_dir),
                "parameters": model.parameters,
                "validation": validation_results.to_dict() if validation_results else None
            }
            self.history.append(run_record)

            logger.info(f"运行完成: {run_id}, 耗时: {run_record['duration']:.2f}s")

            return {
                "run_id": run_id,
                "outputs": outputs,
                "output_dir": str(run_output_dir),
                "validation": validation_results,
                "metadata": model.get_metadata()
            }

        except Exception as e:
            logger.error(f"运行失败: {e}")

            run_record = {
                "run_id": run_id,
                "model_name": model.config.name,
                "status": "failed",
                "error": str(e),
                "duration": time.time() - start_time
            }
            self.history.append(run_record)

            raise

    def run_script(
        self,
        script_path: str,
        args: Optional[List[str]] = None,
        env: Optional[Dict[str, str]] = None,
        capture_output: bool = True
    ) -> subprocess.CompletedProcess:
        """
        运行外部脚本

        Args:
            script_path: 脚本路径
            args: 命令行参数
            env: 环境变量
            capture_output: 是否捕获输出

        Returns:
            运行结果
        """
        cmd = ["python", script_path]
        if args:
            cmd.extend(args)

        logger.info(f"运行脚本: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            cwd=str(self.working_dir),
            env=env,
            capture_output=capture_output,
            text=True
        )

        if result.returncode != 0:
            logger.error(f"脚本执行失败: {result.stderr}")
            raise subprocess.CalledProcessError(
                result.returncode, cmd, result.stdout, result.stderr
            )

        return result

    def batch_run(
        self,
        model: BaseModel,
        parameter_sets: List[Dict[str, Any]],
        inputs: Optional[Dict[str, Any]] = None,
        n_jobs: int = 1
    ) -> List[Dict]:
        """
        批量运行模型

        Args:
            model: 模型实例
            parameter_sets: 参数集合列表
            inputs: 输入数据（共用）
            n_jobs: 并行任务数

        Returns:
            运行结果列表
        """
        results = []

        if n_jobs == 1:
            # 串行执行
            for i, params in enumerate(parameter_sets):
                logger.info(f"批量运行: {i+1}/{len(parameter_sets)}")
                result = self.run(model, inputs, params)
                results.append(result)
        else:
            # 并行执行
            try:
                from joblib import Parallel, delayed

                results = Parallel(n_jobs=n_jobs)(
                    delayed(self._run_single)(model, inputs, params, i)
                    for i, params in enumerate(parameter_sets)
                )
            except ImportError:
                logger.warning("并行执行需要安装 joblib，使用串行模式")
                for i, params in enumerate(parameter_sets):
                    result = self.run(model, inputs, params)
                    results.append(result)

        return results

    def _run_single(
        self,
        model: BaseModel,
        inputs: Optional[Dict],
        parameters: Dict,
        index: int
    ) -> Dict:
        """单次运行（用于并行）"""
        logger.info(f"批量运行: {index+1}")
        # 为每个任务创建新的模型实例
        # 这里假设 model 类可以无参数实例化
        new_model = model.__class__(model.config)
        return self.run(new_model, inputs, parameters)

    def _validate_outputs(
        self,
        outputs: Dict[str, Any],
        observed_data: Any,
        config: ModelConfig
    ) -> Optional[ValidationMetrics]:
        """验证输出"""
        # 找到第一个输出变量进行验证
        for output_def in config.outputs:
            if output_def.name in outputs:
                simulated = outputs[output_def.name]
                if hasattr(simulated, 'values'):
                    simulated = simulated.values

                return Validator.calculate_all(simulated, observed_data)

        return None

    def get_history(self) -> List[Dict]:
        """获取运行历史"""
        return self.history.copy()

    def clear_history(self):
        """清除运行历史"""
        self.history.clear()

    def export_history(self, path: str):
        """导出运行历史"""
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, indent=2, ensure_ascii=False, default=str)


class DockerExecutor:
    """
    Docker 模型执行器

    在 Docker 容器中运行模型，使用与后端 TaskScheduler 相同的协议:
    - 工作目录: /workspace
    - 挂载: /workspace/data, /workspace/output, /workspace/input/data.json
    - 环境变量: INPUT_<NAME>, INPUT_DATA_FILE, TASK_ID, NODE_ID
    - 输出: stdout 解析为 JSON
    """

    def __init__(
        self,
        image: str,
        tag: str = "latest",
        working_dir: str = "/workspace"
    ):
        """
        初始化Docker执行器

        Args:
            image: Docker镜像名
            tag: 镜像标签
            working_dir: 容器内工作目录
        """
        self.image = image
        self.tag = tag
        self.working_dir = working_dir

    def run(
        self,
        input_data: Optional[Dict[str, Any]] = None,
        input_dir: Optional[str] = None,
        output_dir: Optional[str] = None,
        data_dir: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None,
        task_id: Optional[str] = None,
        node_id: Optional[str] = None,
        remove: bool = True
    ) -> subprocess.CompletedProcess:
        """
        在Docker中运行模型（与后端 TaskScheduler 协议一致）

        Args:
            input_data: 输入数据字典，写入 data.json 挂载到 /workspace/input/data.json
            input_dir: 输入目录（可选，自动创建临时目录）
            output_dir: 输出目录（挂载到 /workspace/output）
            data_dir: 数据目录（挂载到 /workspace/data）
            parameters: 模型参数，设为 INPUT_<NAME> 环境变量
            task_id: 任务 ID
            node_id: 节点 ID
            remove: 运行后是否删除容器

        Returns:
            运行结果
        """
        import tempfile

        cmd = ["docker", "run"]

        if remove:
            cmd.append("--rm")

        # 创建临时目录
        tmp_input = None
        tmp_output = None
        tmp_data = None
        if input_dir is None:
            tmp_input = tempfile.mkdtemp(prefix="watershed_input_")
            input_dir = tmp_input
        if output_dir is None:
            tmp_output = tempfile.mkdtemp(prefix="watershed_output_")
            output_dir = tmp_output
        if data_dir is None:
            tmp_data = tempfile.mkdtemp(prefix="watershed_data_")
            data_dir = tmp_data

        # 确保 output 和 data 目录存在
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        Path(data_dir).mkdir(parents=True, exist_ok=True)
        Path(input_dir).mkdir(parents=True, exist_ok=True)

        # 挂载卷（与后端 TaskScheduler.buildVolumeMounts 一致）
        cmd.extend(["-v", f"{data_dir}:/workspace/data"])
        cmd.extend(["-v", f"{output_dir}:/workspace/output"])

        # 写入 data.json 并挂载
        if input_data:
            input_file = Path(input_dir) / "data.json"
            input_file.parent.mkdir(parents=True, exist_ok=True)
            input_file.write_text(json.dumps(input_data, ensure_ascii=False), encoding="utf-8")
            cmd.extend(["-v", f"{input_file}:/workspace/input/data.json"])
            cmd.extend(["-e", "INPUT_DATA_FILE=/workspace/input/data.json"])

        # 环境变量
        cmd.extend(["-e", f"WORKING_DIR={self.working_dir}"])

        if task_id:
            cmd.extend(["-e", f"TASK_ID={task_id}"])
        if node_id:
            cmd.extend(["-e", f"NODE_ID={node_id}"])

        # 参数设为 INPUT_<NAME> 环境变量（与后端 buildEnvironmentVariables 一致）
        if parameters:
            for name, value in parameters.items():
                env_name = f"INPUT_{name.upper()}"
                if isinstance(value, (dict, list)):
                    cmd.extend(["-e", f"{env_name}={json.dumps(value)}"])
                else:
                    cmd.extend(["-e", f"{env_name}={value}"])

        # 镜像
        cmd.append(f"{self.image}:{self.tag}")

        logger.info(f"运行Docker容器: {' '.join(cmd)}")

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            # 失败时保留输出目录供调试，只清理输入和数据目录
            import shutil
            for tmp_dir in [tmp_input, tmp_data]:
                if tmp_dir:
                    shutil.rmtree(tmp_dir, ignore_errors=True)
            logger.error(f"Docker运行失败: {result.stderr}")
            raise subprocess.CalledProcessError(
                result.returncode, cmd, result.stdout, result.stderr
            )

        # 成功时清理所有临时目录
        import shutil
        for tmp_dir in [tmp_input, tmp_output, tmp_data]:
            if tmp_dir:
                shutil.rmtree(tmp_dir, ignore_errors=True)

        return result

    def build(
        self,
        dockerfile_path: str,
        context_path: str,
        **kwargs
    ) -> subprocess.CompletedProcess:
        """
        构建Docker镜像

        Args:
            dockerfile_path: Dockerfile路径
            context_path: 构建上下文路径
            **kwargs: 传递给docker build的额外参数

        Returns:
            构建结果
        """
        cmd = [
            "docker", "build",
            "-f", dockerfile_path,
            "-t", f"{self.image}:{self.tag}",
            context_path
        ]

        for key, value in kwargs.items():
            cmd.extend([f"--{key}", str(value)])

        logger.info(f"构建Docker镜像: {' '.join(cmd)}")

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"Docker构建失败: {result.stderr}")
            raise subprocess.CalledProcessError(
                result.returncode, cmd, result.stdout, result.stderr
            )

        return result
