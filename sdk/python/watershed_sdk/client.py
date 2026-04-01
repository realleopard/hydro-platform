"""
平台API客户端模块

用于与流域水系统模拟模型平台进行交互
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, BinaryIO
from urllib.parse import urljoin

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


class PlatformClient:
    """
    平台API客户端

    提供与平台交互的便捷方法
    """

    def __init__(
        self,
        base_url: str,
        token: Optional[str] = None,
        timeout: int = 30
    ):
        """
        初始化客户端

        Args:
            base_url: 平台基础URL
            token: API访问令牌
            timeout: 请求超时时间
        """
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.timeout = timeout

        # 创建会话
        self.session = requests.Session()

        # 配置重试策略
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # 设置默认请求头
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })

        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"

    def login(self, username: str, password: str) -> str:
        """
        用户登录

        Args:
            username: 用户名
            password: 密码

        Returns:
            访问令牌
        """
        response = self.session.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"username": username, "password": password},
            timeout=self.timeout
        )
        response.raise_for_status()

        data = response.json()
        self.token = data["data"]["accessToken"]
        self.session.headers["Authorization"] = f"Bearer {self.token}"

        logger.info(f"用户 {username} 登录成功")
        return self.token

    # ==================== 模型管理 ====================

    def create_model(
        self,
        name: str,
        description: str,
        category_id: str,
        **kwargs
    ) -> Dict:
        """
        创建模型

        Args:
            name: 模型名称
            description: 模型描述
            category_id: 分类ID
            **kwargs: 其他模型属性

        Returns:
            创建的模型信息
        """
        payload = {
            "name": name,
            "description": description,
            "categoryId": category_id,
            **kwargs
        }

        response = self.session.post(
            f"{self.base_url}/api/v1/models",
            json=payload,
            timeout=self.timeout
        )
        response.raise_for_status()

        return response.json()["data"]

    def get_model(self, model_id: str) -> Dict:
        """获取模型详情"""
        response = self.session.get(
            f"{self.base_url}/api/v1/models/{model_id}",
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    def list_models(
        self,
        page: int = 1,
        page_size: int = 20,
        category: Optional[str] = None
    ) -> Dict:
        """获取模型列表"""
        params = {"page": page, "page_size": page_size}
        if category:
            params["category"] = category

        response = self.session.get(
            f"{self.base_url}/api/v1/models",
            params=params,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    def update_model(self, model_id: str, **kwargs) -> Dict:
        """更新模型"""
        response = self.session.put(
            f"{self.base_url}/api/v1/models/{model_id}",
            json=kwargs,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    def delete_model(self, model_id: str) -> bool:
        """删除模型"""
        response = self.session.delete(
            f"{self.base_url}/api/v1/models/{model_id}",
            timeout=self.timeout
        )
        response.raise_for_status()
        return True

    # ==================== 工作流管理 ====================

    def create_workflow(
        self,
        name: str,
        description: str,
        nodes: List[Dict],
        edges: List[Dict]
    ) -> Dict:
        """
        创建工作流

        Args:
            name: 工作流名称
            description: 工作流描述
            nodes: 节点列表
            edges: 边列表

        Returns:
            创建的工作流信息
        """
        payload = {
            "name": name,
            "description": description,
            "nodes": nodes,
            "edges": edges
        }

        response = self.session.post(
            f"{self.base_url}/api/v1/workflows",
            json=payload,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    def get_workflow(self, workflow_id: str) -> Dict:
        """获取工作流详情"""
        response = self.session.get(
            f"{self.base_url}/api/v1/workflows/{workflow_id}",
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    # ==================== 任务执行 ====================

    def submit_task(
        self,
        workflow_id: str,
        inputs: Optional[Dict] = None,
        parameters: Optional[Dict] = None
    ) -> Dict:
        """
        提交任务

        Args:
            workflow_id: 工作流ID
            inputs: 输入数据
            parameters: 运行参数

        Returns:
            任务信息
        """
        payload = {"workflowId": workflow_id}
        if inputs:
            payload["inputs"] = inputs
        if parameters:
            payload["parameters"] = parameters

        response = self.session.post(
            f"{self.base_url}/api/v1/tasks",
            json=payload,
            timeout=self.timeout
        )
        response.raise_for_status()

        result = response.json()["data"]
        logger.info(f"任务已提交: {result['id']}")
        return result

    def get_task(self, task_id: str) -> Dict:
        """获取任务状态"""
        response = self.session.get(
            f"{self.base_url}/api/v1/tasks/{task_id}",
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        response = self.session.post(
            f"{self.base_url}/api/v1/tasks/{task_id}/cancel",
            timeout=self.timeout
        )
        response.raise_for_status()
        logger.info(f"任务已取消: {task_id}")
        return True

    def list_tasks(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None
    ) -> Dict:
        """获取任务列表"""
        params = {"page": page, "page_size": page_size}
        if status:
            params["status"] = status

        response = self.session.get(
            f"{self.base_url}/api/v1/tasks",
            params=params,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    def get_task_outputs(self, task_id: str) -> List[Dict]:
        """获取任务输出"""
        response = self.session.get(
            f"{self.base_url}/api/v1/tasks/{task_id}/outputs",
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    def download_output(
        self,
        task_id: str,
        output_name: str,
        save_path: str
    ) -> Path:
        """
        下载任务输出文件

        Args:
            task_id: 任务ID
            output_name: 输出名称
            save_path: 保存路径

        Returns:
            保存的文件路径
        """
        response = self.session.get(
            f"{self.base_url}/api/v1/tasks/{task_id}/outputs/{output_name}/download",
            stream=True,
            timeout=self.timeout
        )
        response.raise_for_status()

        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)

        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        logger.info(f"文件已下载: {save_path}")
        return save_path

    # ==================== 数据集管理 ====================

    def upload_dataset(
        self,
        file_path: str,
        name: str,
        description: str = "",
        tags: Optional[List[str]] = None
    ) -> Dict:
        """
        上传数据集

        Args:
            file_path: 文件路径
            name: 数据集名称
            description: 描述
            tags: 标签列表

        Returns:
            数据集信息
        """
        file_path = Path(file_path)

        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f)}
            data = {
                'name': name,
                'description': description
            }
            if tags:
                data['tags'] = ','.join(tags)

            # 临时移除JSON content-type
            headers = self.session.headers.pop('Content-Type', None)

            response = self.session.post(
                f"{self.base_url}/api/v1/datasets",
                files=files,
                data=data,
                timeout=self.timeout * 5  # 上传超时更长
            )

            if headers:
                self.session.headers['Content-Type'] = headers

        response.raise_for_status()
        return response.json()["data"]

    def get_dataset(self, dataset_id: str) -> Dict:
        """获取数据集详情"""
        response = self.session.get(
            f"{self.base_url}/api/v1/datasets/{dataset_id}",
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    # ==================== 敏感性分析 ====================

    def run_sensitivity_analysis(
        self,
        model_id: str,
        parameters: List[Dict],
        output_variable: str,
        sample_size: int = 100,
        method: str = "lhs"
    ) -> Dict:
        """
        运行敏感性分析

        Args:
            model_id: 模型ID
            parameters: 参数配置
            output_variable: 输出变量
            sample_size: 样本数量
            method: 采样方法

        Returns:
            分析结果
        """
        payload = {
            "modelId": model_id,
            "parameters": parameters,
            "outputVariable": output_variable,
            "sampleSize": sample_size,
            "method": method
        }

        response = self.session.post(
            f"{self.base_url}/api/v1/analysis/sensitivity",
            json=payload,
            timeout=self.timeout * 10  # 分析可能需要更长时间
        )
        response.raise_for_status()
        return response.json()["data"]

    def get_analysis_result(self, analysis_id: str) -> Dict:
        """获取分析结果"""
        response = self.session.get(
            f"{self.base_url}/api/v1/analysis/{analysis_id}",
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()["data"]

    # ==================== WebSocket ====================

    def connect_websocket(self, task_id: str, on_message=None, on_error=None):
        """
        连接任务WebSocket

        Args:
            task_id: 任务ID
            on_message: 消息回调函数
            on_error: 错误回调函数

        Returns:
            WebSocket连接
        """
        try:
            import websocket
        except ImportError:
            raise ImportError("WebSocket支持需要安装 websocket-client")

        ws_url = self.base_url.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{ws_url}/ws/v1/tasks/{task_id}"

        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        def on_open(ws):
            logger.info(f"WebSocket连接已建立: {task_id}")

        def on_close(ws, close_status_code, close_msg):
            logger.info(f"WebSocket连接已关闭: {task_id}")

        def on_ws_message(ws, message):
            data = json.loads(message)
            if on_message:
                on_message(data)

        def on_ws_error(ws, error):
            logger.error(f"WebSocket错误: {error}")
            if on_error:
                on_error(error)

        ws = websocket.WebSocketApp(
            ws_url,
            header=headers,
            on_open=on_open,
            on_message=on_ws_message,
            on_error=on_ws_error,
            on_close=on_close
        )

        return ws
