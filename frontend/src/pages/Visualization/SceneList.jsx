import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Empty,
  Spin,
  message,
  Popconfirm,
  Typography,
  Pagination,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  GlobalOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getScenes, deleteScene } from '../../services/visualizationService';
import { SCENE_TYPE_OPTIONS, SCENE_STATUS_OPTIONS, SCENE_TYPE_MAP, SCENE_STATUS_MAP } from '../../types';

const { Title, Text } = Typography;

const SceneList = () => {
  const navigate = useNavigate();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 12,
    sceneType: undefined,
    status: undefined,
  });

  const fetchScenes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: query.page,
        pageSize: query.pageSize,
        sceneType: query.sceneType,
        status: query.status,
      };
      const response = await getScenes(params);
      const records = response.records || response || [];
      setScenes(Array.isArray(records) ? records : []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to fetch scenes:', error);
      message.error('加载场景列表失败');
      setScenes([]);
    } finally {
      setLoading(false);
    }
  }, [query.page, query.pageSize, query.sceneType, query.status]);

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  const handleDelete = async (id) => {
    try {
      await deleteScene(id);
      message.success('场景已删除');
      fetchScenes();
    } catch (error) {
      message.error('删除失败: ' + (error.message || ''));
    }
  };

  const handleCreate = () => {
    navigate('/visualization?create=true');
  };

  const handleOpenScene = (scene) => {
    navigate(`/visualization?sceneId=${scene.id}`);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <GlobalOutlined /> 可视化场景
        </Title>
        <Space>
          <Select
            allowClear
            placeholder="场景类型"
            style={{ width: 130 }}
            value={query.sceneType}
            onChange={(val) => setQuery({ ...query, sceneType: val, page: 1 })}
          >
            {SCENE_TYPE_OPTIONS.map(({ value, label }) => (
              <Select.Option key={value} value={value}>{label}</Select.Option>
            ))}
          </Select>
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 100 }}
            value={query.status}
            onChange={(val) => setQuery({ ...query, status: val, page: 1 })}
          >
            {SCENE_STATUS_OPTIONS.map(({ value, label }) => (
              <Select.Option key={value} value={value}>{label}</Select.Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchScenes}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建场景
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {scenes.length === 0 && !loading ? (
          <Empty description="暂无场景，点击新建场景开始" />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {scenes.map((scene) => {
                const typeInfo = SCENE_TYPE_MAP[scene.sceneType] || SCENE_TYPE_MAP.custom;
                const statusInfo = SCENE_STATUS_MAP[scene.status] || SCENE_STATUS_MAP.draft;
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={scene.id}>
                    <Card
                      hoverable
                      cover={
                        <div
                          style={{
                            height: 160,
                            background: 'linear-gradient(135deg, #1a2a3a 0%, #2d4a5a 50%, #1a3a4a 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#4db8ff',
                            fontSize: 48,
                          }}
                        >
                          <GlobalOutlined />
                        </div>
                      }
                      actions={[
                        <EyeOutlined key="view" title="打开场景" onClick={() => handleOpenScene(scene)} />,
                        <Popconfirm
                          key="delete"
                          title="确定删除该场景？"
                          onConfirm={() => handleDelete(scene.id)}
                        >
                          <DeleteOutlined title="删除" />
                        </Popconfirm>,
                      ]}
                    >
                      <Card.Meta
                        title={
                          <Space>
                            <span style={{ fontSize: 14 }}>{scene.name || '未命名场景'}</span>
                            <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                            <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <Text type="secondary" ellipsis style={{ display: 'block' }}>
                              {scene.description || '暂无描述'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {scene.createdAt ? new Date(scene.createdAt).toLocaleString('zh-CN') : ''}
                            </Text>
                          </div>
                        }
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
            {total > query.pageSize && (
              <div style={{ textAlign: 'right', marginTop: 24 }}>
                <Pagination
                  current={query.page}
                  pageSize={query.pageSize}
                  total={total}
                  onChange={(page, pageSize) => setQuery({ ...query, page, pageSize })}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </Spin>
    </div>
  );
};

export default SceneList;
