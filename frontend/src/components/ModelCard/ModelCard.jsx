import React from 'react';
import './ModelCard.css';

const ModelCard = ({ model, onClick, onEdit, onDelete }) => {
  const getStatusBadge = (status) => {
    const statusMap = {
      'published': { label: '已发布', className: 'status-published' },
      'draft': { label: '草稿', className: 'status-draft' },
      'pending_review': { label: '审核中', className: 'status-pending' },
      'deprecated': { label: '已弃用', className: 'status-deprecated' }
    };
    return statusMap[status] || { label: status, className: 'status-default' };
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'public':
        return '🌐';
      case 'organization':
        return '🏢';
      case 'private':
      default:
        return '🔒';
    }
  };

  const status = getStatusBadge(model.status);

  return (
    <div className="model-card" onClick={() => onClick?.(model)}>
      <div className="model-card-header">
        <div className="model-icon">
          {model.dockerImage?.includes('python') ? '🐍' :
           model.dockerImage?.includes('java') ? '☕' :
           model.dockerImage?.includes('cpp') ? '⚡' : '🔧'}
        </div>
        <div className="model-info">
          <h4 className="model-name">{model.name}</h4>
          <span className="model-visibility">
            {getVisibilityIcon(model.visibility)} {model.visibility}
          </span>
        </div>
        <span className={`status-badge ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="model-card-body">
        <p className="model-description">
          {model.description || '暂无描述'}
        </p>

        <div className="model-tags">
          {model.tags?.map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>

        <div className="model-meta">
          <span className="meta-item">
            📦 {model.currentVersion || 'v0.1.0'}
          </span>
          <span className="meta-item">
            ▶️ {model.runCount || 0} 次运行
          </span>
          <span className="meta-item">
            ⭐ {model.ratingAvg?.toFixed(1) || '0.0'}
          </span>
        </div>
      </div>

      <div className="model-card-footer">
        <span className="model-owner">
          {model.ownerName || model.ownerId}
        </span>
        <div className="model-actions">
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(model);
            }}
          >
            ✏️
          </button>
          <button
            className="action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(model);
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
