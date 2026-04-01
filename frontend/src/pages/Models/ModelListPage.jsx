import React, { useEffect, useState } from 'react';
import ModelCard from '../../components/ModelCard/ModelCard';
import ModelForm from '../../components/ModelForm/ModelForm';
import { useModelStore } from '../../stores';
import './ModelListPage.css';

const ModelListPage = () => {
  const {
    models,
    myModels,
    loading,
    error,
    fetchModels,
    fetchMyModels,
    createModel,
    deleteModel
  } = useModelStore();

  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchModels();
    fetchMyModels();
  }, [fetchModels, fetchMyModels]);

  const handleCreate = async (data) => {
    try {
      await createModel(data);
      setShowCreateModal(false);
    } catch (error) {
      alert('创建失败: ' + error.message);
    }
  };

  const handleDelete = async (model) => {
    if (window.confirm(`确定要删除模型 "${model.name}" 吗？`)) {
      try {
        await deleteModel(model.id);
      } catch (error) {
        alert('删除失败: ' + error.message);
      }
    }
  };

  const filteredModels = (activeTab === 'my' ? myModels : models).filter(model => {
    const matchesSearch = !searchQuery ||
      model.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || model.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="model-list-page">
      <div className="page-header">
        <h1>模型库</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + 创建模型
        </button>
      </div>

      <div className="filter-bar">
        <div className="tabs">
          <button
            className={activeTab === 'all' ? 'active' : ''}
            onClick={() => setActiveTab('all')}
          >
            全部模型
          </button>
          <button
            className={activeTab === 'my' ? 'active' : ''}
            onClick={() => setActiveTab('my')}
          >
            我的模型
          </button>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder="搜索模型..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">全部分类</option>
            <option value="hydrological">水文模型</option>
            <option value="hydraulic">水力学模型</option>
            <option value="water_quality">水质模型</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="model-grid">
          {filteredModels.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              onClick={(m) => window.location.href = `/models/${m.id}`}
              onEdit={(m) => window.location.href = `/models/${m.id}/edit`}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!loading && filteredModels.length === 0 && (
        <div className="empty-state">
          <p>暂无模型</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            创建第一个模型
          </button>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <ModelForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelListPage;
