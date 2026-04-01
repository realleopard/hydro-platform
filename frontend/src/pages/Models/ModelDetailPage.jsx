import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useModelStore } from '../../stores';
import './ModelDetailPage.css';

const ModelDetailPage = () => {
  const { id } = useParams();
  const { currentModel, loading, fetchModel } = useModelStore();

  useEffect(() => {
    fetchModel(id);
  }, [id, fetchModel]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!currentModel) {
    return <div className="error">模型不存在</div>;
  }

  return (
    <div className="model-detail-page">
      <div className="detail-header">
        <h1>{currentModel.name}</h1>
        <div className="header-actions">
          <button className="btn">编辑</button>
          <button className="btn btn-primary">运行</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-section">
          <h3>基本信息</h3>
          <p>{currentModel.description || '暂无描述'}</p>

          <div className="info-grid">
            <div className="info-item">
              <label>状态</label>
              <span>{currentModel.status}</span>
            </div>
            <div className="info-item">
              <label>版本</label>
              <span>{currentModel.currentVersion}</span>
            </div>
            <div className="info-item">
              <label>Docker镜像</label>
              <code>{currentModel.dockerImage}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelDetailPage;
