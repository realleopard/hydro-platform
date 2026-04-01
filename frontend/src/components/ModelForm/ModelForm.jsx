import React, { useState } from 'react';
import './ModelForm.css';

const ModelForm = ({ model, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: model?.name || '',
    description: model?.description || '',
    dockerImage: model?.dockerImage || '',
    categoryId: model?.categoryId || '',
    visibility: model?.visibility || 'private',
    tags: model?.tags || [],
    interfaces: model?.interfaces || { input: [], output: [] },
    resources: model?.resources || { cpu: 1, memory: '2Gi', storage: '10Gi' },
    ...model
  });

  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = '请输入模型名称';
    }
    if (!formData.dockerImage.trim()) {
      newErrors.dockerImage = '请输入Docker镜像';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit?.(formData);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  return (
    <form className="model-form" onSubmit={handleSubmit}>
      <h2>{model ? '编辑模型' : '创建模型'}</h2>

      <div className="form-group">
        <label>模型名称 *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="输入模型名称"
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label>描述</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="输入模型描述"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Docker 镜像 *</label>
        <input
          type="text"
          value={formData.dockerImage}
          onChange={(e) => setFormData({ ...formData, dockerImage: e.target.value })}
          placeholder="例如: my-registry/model:v1.0"
        />
        {errors.dockerImage && <span className="error">{errors.dockerImage}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>可见性</label>
          <select
            value={formData.visibility}
            onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
          >
            <option value="private">私有 🔒</option>
            <option value="organization">组织内 🏢</option>
            <option value="public">公开 🌐</option>
          </select>
        </div>

        <div className="form-group">
          <label>分类</label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          >
            <option value="">选择分类</option>
            <option value="hydrological">水文模型</option>
            <option value="hydraulic">水力学模型</option>
            <option value="water_quality">水质模型</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>标签</label>
        <div className="tag-input-wrapper">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="输入标签后按回车"
          />
          <button type="button" onClick={addTag}>添加</button>
        </div>
        <div className="tags-list">
          {formData.tags.map((tag) => (
            <span key={tag} className="tag-item">
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>资源需求</h3>
        <div className="form-row">
          <div className="form-group">
            <label>CPU (核)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={formData.resources.cpu}
              onChange={(e) => setFormData({
                ...formData,
                resources: { ...formData.resources, cpu: parseFloat(e.target.value) }
              })}
            />
          </div>

          <div className="form-group">
            <label>内存</label>
            <input
              type="text"
              value={formData.resources.memory}
              onChange={(e) => setFormData({
                ...formData,
                resources: { ...formData.resources, memory: e.target.value }
              })}
              placeholder="例如: 2Gi"
            />
          </div>

          <div className="form-group">
            <label>存储</label>
            <input
              type="text"
              value={formData.resources.storage}
              onChange={(e) => setFormData({
                ...formData,
                resources: { ...formData.resources, storage: e.target.value }
              })}
              placeholder="例如: 10Gi"
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          {model ? '保存' : '创建'}
        </button>
      </div>
    </form>
  );
};

export default ModelForm;
