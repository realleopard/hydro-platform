import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Tabs,
  Timeline,
  Empty,
  message,
  Divider,
  Row,
  Col,
  Statistic,
  Badge,
  Skeleton,
  Alert
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  StarOutlined,
  HistoryOutlined,
  FileTextOutlined,
  BranchesOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { modelService } from '../../services/modelService';
import {
  MODEL_CATEGORY_OPTIONS,
  MODEL_STATUS_OPTIONS,
  DATA_TYPE_OPTIONS
} from '../../types';
import styles from './ModelDetail.module.css';

const { TabPane } = Tabs;

const ModelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [versions, setVersions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  // 获取模型详情
  const fetchModelDetail = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const [modelData, versionsData] = await Promise.all([
        modelService.getModelById(id),
        modelService.getVersions(id).catch(() => [])
      ]);

      // 解析 JSON 字符串字段
      if (typeof modelData.interfaces === 'string') {
        try { modelData.interfaces = JSON.parse(modelData.interfaces); } catch { modelData.interfaces = []; }
      }
      if (typeof modelData.resources === 'string') {
        try { modelData.resources = JSON.parse(modelData.resources); } catch { modelData.resources = {}; }
      }
      if (typeof modelData.parameters === 'string') {
        try { modelData.parameters = JSON.parse(modelData.parameters); } catch { modelData.parameters = []; }
      }
      // 确保 interfaces 是数组
      if (!Array.isArray(modelData.interfaces)) {
        // 可能是 {input: [...], output: [...]} 格式，展平
        const raw = modelData.interfaces;
        if (raw && typeof raw === 'object') {
          const inputs = (raw.input || raw.inputs || []).map(i => ({ ...i, type: 'input' }));
          const outputs = (raw.output || raw.outputs || []).map(i => ({ ...i, type: 'output' }));
          modelData.interfaces = [...inputs, ...outputs];
        } else {
          modelData.interfaces = [];
        }
      }

      setModel(modelData);
      setVersions(versionsData || []);
    } catch (err) {
      console.error('Failed to fetch model detail:', err);
      setError(err.message || '加载模型详情失败');
      message.error('加载模型详情失败: ' + (err.message || '请稍后重试'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchModelDetail();
  }, [fetchModelDetail]);

  // 获取状态标签
  const getStatusTag = (status) => {
    const option = MODEL_STATUS_OPTIONS.find(o => o.value === status);
    return <Tag color={option?.color || 'default'}>{option?.label || status}</Tag>;
  };

  // 获取分类标签
  const getCategoryTag = (category) => {
    const option = MODEL_CATEGORY_OPTIONS.find(o => o.value === category);
    return <Tag color="blue">{option?.label || category}</Tag>;
  };

  // 获取数据类型标签
  const getDataTypeTag = (dataType) => {
    const option = DATA_TYPE_OPTIONS.find(o => o.value === dataType);
    return <Tag size="small">{option?.label || dataType}</Tag>;
  };

  // 渲染评分星星
  const renderRating = (rating) => {
    return (
      <Space>
        <StarOutlined style={{ color: '#faad14' }} />
        <span style={{ fontSize: 16, fontWeight: 500, color: '#faad14' }}>{rating?.toFixed(1) || '0.0'}</span>
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>({model?.reviewCount || 0} 条评价)</span>
      </Space>
    );
  };

  // 复制模型
  const handleCopy = async () => {
    try {
      const copyData = {
        name: `${model.name} (复制)`,
        description: model.description,
        category: model.category,
        dockerImage: model.dockerImage,
        interfaces: model.interfaces || [],
        resources: model.resources,
        tags: model.tags,
        readme: model.readme
      };
      await modelService.createModel(copyData);
      message.success('模型复制成功');
      navigate('/models');
    } catch (error) {
      console.error('Failed to copy model:', error);
      message.error('复制失败: ' + (error.message || '请稍后重试'));
    }
  };

  // 运行模型 - navigate to workflow editor to create a workflow using this model
  const handleRun = () => {
    navigate(`/workflows/create?modelId=${id}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Card>
          <Skeleton active avatar paragraph={{ rows: 4 }} />
        </Card>
        <Card style={{ marginTop: 24 }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={fetchModelDetail} icon={<ReloadOutlined />}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  if (!model) {
    return (
      <div className={styles.container}>
        <Empty description="模型不存在或已被删除">
          <Button type="primary" onClick={() => navigate('/models')}>
            返回列表
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 头部导航 */}
      <Card className={styles.headerCard}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/models')}
          className={styles.backButton}
        >
          返回列表
        </Button>
      </Card>

      {/* 模型标题区 */}
      <Card className={styles.titleCard}>
        <Row justify="space-between" align="middle">
          <Col xs={24} md={16}>
            <Space direction="vertical" size="small" className={styles.titleSection}>
              <Space>
                <h1 className={styles.modelName}>{model.name}</h1>
                {getStatusTag(model.status)}
              </Space>
              <Space wrap>
                {getCategoryTag(model.category)}
                <Tag icon={<DownloadOutlined />}>{model.downloadCount || 0} 次下载</Tag>
                {renderRating(model.rating)}
              </Space>
              <p className={styles.description}>{model.description}</p>
              <Space wrap className={styles.tags}>
                {model.tags?.map(tag => (
                  <Tag key={tag} color="processing">{tag}</Tag>
                ))}
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={8} className={styles.actionSection}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                block
                onClick={handleRun}
              >
                运行模型
              </Button>
              <Space style={{ width: '100%' }}>
                <Button icon={<EditOutlined />} block onClick={() => navigate(`/models/${id}/edit`)}>
                  编辑
                </Button>
                <Button icon={<CopyOutlined />} block onClick={handleCopy}>
                  复制
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 统计信息 */}
      <Row gutter={16} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="当前版本"
              value={`v${model.currentVersion || '1.0.0'}`}
              prefix={<BranchesOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="下载次数"
              value={model.downloadCount || 0}
              prefix={<DownloadOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="评价数量"
              value={model.reviewCount || 0}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="平均评分"
              value={model.rating || 0}
              precision={1}
              prefix={<StarOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 标签页内容 */}
      <Card className={styles.contentCard}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="概览" key="overview" icon={<FileTextOutlined />}>
            <Row gutter={24}>
              <Col xs={24} lg={16}>
                <Descriptions title="基本信息" bordered column={{ xs: 1, sm: 2 }}>
                  <Descriptions.Item label="模型ID">{model.id}</Descriptions.Item>
                  <Descriptions.Item label="Docker镜像">
                    <code className={styles.dockerImage}>{model.dockerImage}</code>
                  </Descriptions.Item>
                  <Descriptions.Item label="作者">{model.authorName}</Descriptions.Item>
                  <Descriptions.Item label="所属机构">{model.organizationName}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {model.createdAt ? new Date(model.createdAt).toLocaleString('zh-CN') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {model.updatedAt ? new Date(model.updatedAt).toLocaleString('zh-CN') : '-'}
                  </Descriptions.Item>
                  {model.publishedAt && (
                    <Descriptions.Item label="发布时间">
                      {new Date(model.publishedAt).toLocaleString('zh-CN')}
                    </Descriptions.Item>
                  )}
                </Descriptions>

                <Divider />

                <Descriptions title="资源需求" bordered column={{ xs: 1, sm: 2 }}>
                  <Descriptions.Item label="CPU">{model.resources?.cpu || '-'} 核</Descriptions.Item>
                  <Descriptions.Item label="内存">{model.resources?.memory || '-'}</Descriptions.Item>
                  <Descriptions.Item label="存储">{model.resources?.storage || '-'}</Descriptions.Item>
                  <Descriptions.Item label="超时时间">{model.resources?.timeout ? `${model.resources.timeout} 秒` : '-'}</Descriptions.Item>
                </Descriptions>

                {model.validationMetrics && (
                  <>
                    <Divider />
                    <Descriptions title="验证指标" bordered column={{ xs: 1, sm: 2 }}>
                      <Descriptions.Item label="NSE">{model.validationMetrics.nse}</Descriptions.Item>
                      <Descriptions.Item label="RMSE">{model.validationMetrics.rmse}</Descriptions.Item>
                      <Descriptions.Item label="MAE">{model.validationMetrics.mae}</Descriptions.Item>
                      <Descriptions.Item label="R²">{model.validationMetrics.r2}</Descriptions.Item>
                    </Descriptions>
                  </>
                )}
              </Col>

              <Col xs={24} lg={8}>
                <Card title="接口定义" className={styles.interfaceCard}>
                  <div className={styles.interfaceSection}>
                    <h4>输入接口</h4>
                    {model.interfaces?.filter(i => i.type === 'input').length > 0 ? (
                      model.interfaces.filter(i => i.type === 'input').map(iface => (
                        <div key={iface.name} className={styles.interfaceItem}>
                          <Space>
                            <Badge status="processing" />
                            <span className={styles.interfaceName}>{iface.name}</span>
                            {getDataTypeTag(iface.dataType)}
                            {iface.required && <Tag color="red" size="small">必填</Tag>}
                          </Space>
                          <p className={styles.interfaceDesc}>{iface.description}</p>
                        </div>
                      ))
                    ) : (
                      <Empty description="暂无输入接口" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                  </div>

                  <Divider />

                  <div className={styles.interfaceSection}>
                    <h4>输出接口</h4>
                    {model.interfaces?.filter(i => i.type === 'output').length > 0 ? (
                      model.interfaces.filter(i => i.type === 'output').map(iface => (
                        <div key={iface.name} className={styles.interfaceItem}>
                          <Space>
                            <Badge status="success" />
                            <span className={styles.interfaceName}>{iface.name}</span>
                            {getDataTypeTag(iface.dataType)}
                          </Space>
                          <p className={styles.interfaceDesc}>{iface.description}</p>
                        </div>
                      ))
                    ) : (
                      <Empty description="暂无输出接口" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="README" key="readme" icon={<FileTextOutlined />}>
            <div className={styles.readmeContent}>
              {model.readme ? (
                <pre className={styles.markdownContent}>{model.readme}</pre>
              ) : (
                <Empty description="暂无文档" />
              )}
            </div>
          </TabPane>

          <TabPane tab="版本历史" key="versions" icon={<HistoryOutlined />}>
            {versions.length > 0 ? (
              <Timeline mode="left">
                {versions.map((version, index) => (
                  <Timeline.Item key={index}>
                    <Card size="small" className={styles.versionCard}>
                      <div className={styles.versionHeader}>
                        <Space>
                          <Tag color="blue">v{version.version}</Tag>
                          <span className={styles.versionDate}>
                            {version.createdAt ? new Date(version.createdAt).toLocaleString('zh-CN') : '-'}
                          </span>
                        </Space>
                      </div>
                      <p className={styles.changelog}>{version.changelog || '无变更说明'}</p>
                      <code className={styles.dockerTag}>{model.dockerImage?.split(':')[0]}:{version.version}</code>
                    </Card>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="暂无版本历史" />
            )}
          </TabPane>

          <TabPane tab="评价" key="reviews" icon={<StarOutlined />}>
            <Empty description="暂无评价" />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ModelDetail;
