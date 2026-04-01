import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Pagination,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Typography,
  Row,
  Col,
  Empty,
  Skeleton
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  StarOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { modelService } from '../../services/modelService';
import {
  MODEL_CATEGORY_OPTIONS,
  MODEL_STATUS_OPTIONS
} from '../../types';
import styles from './ModelList.module.css';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const ModelList = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 10,
    keyword: '',
    category: undefined,
    status: undefined
  });

  // 加载模型列表
  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: query.page,
        size: query.pageSize,
        search: query.keyword || undefined,
        category: query.category,
        status: query.status
      };

      const response = await modelService.getModels(params);
      setModels(response.records || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      message.error('加载模型列表失败: ' + (error.message || '请稍后重试'));
      setModels([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query.page, query.pageSize, query.keyword, query.category, query.status]);

  // 初始加载和查询条件变化时重新加载
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.keyword !== undefined) {
        setQuery(prev => ({ ...prev, page: 1 }));
        fetchModels();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query.keyword, fetchModels]);

  // 获取状态标签
  const getStatusTag = (status) => {
    const option = MODEL_STATUS_OPTIONS.find(o => o.value === status);
    return <Tag color={option?.color || 'default'}>{option?.label || status}</Tag>;
  };

  // 获取分类标签
  const getCategoryTag = (category) => {
    const option = MODEL_CATEGORY_OPTIONS.find(o => o.value === category);
    return <Tag>{option?.label || category}</Tag>;
  };

  // 删除模型
  const handleDelete = async (id) => {
    try {
      await modelService.deleteModel(Number(id));
      message.success('删除成功');
      fetchModels();
    } catch (error) {
      console.error('Failed to delete model:', error);
      message.error('删除失败: ' + (error.message || '请稍后重试'));
    }
  };

  // 复制模型
  const handleCopy = async (record) => {
    try {
      const copyData = {
        name: `${record.name} (复制)`,
        description: record.description,
        category: record.category,
        dockerImage: record.dockerImage,
        interfaces: record.interfaces || [],
        resources: record.resources,
        tags: record.tags,
        readme: record.readme
      };
      await modelService.createModel(copyData);
      message.success('模型复制成功');
      fetchModels();
    } catch (error) {
      console.error('Failed to copy model:', error);
      message.error('复制失败: ' + (error.message || '请稍后重试'));
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '模型名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div className={styles.modelName}>{text}</div>
          <Text type="secondary" className={styles.modelDesc}>
            {record.description || '暂无描述'}
          </Text>
        </div>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => getCategoryTag(category)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: '版本',
      dataIndex: 'currentVersion',
      key: 'currentVersion',
      width: 100,
      render: (version) => <Tag color="blue">v{version}</Tag>
    },
    {
      title: '作者',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 120,
      render: (author, record) => (
        <div className={styles.authorInfo}>
          <span>{author}</span>
          <Text type="secondary" className={styles.orgName}>
            {record.organizationName}
          </Text>
        </div>
      )
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating, record) => (
        rating > 0 ? (
          <Space>
            <StarOutlined className={styles.starIcon} />
            <span>{rating.toFixed(1)}</span>
            <Text type="secondary">({record.reviewCount})</Text>
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: '下载',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      width: 80,
      render: (count) => (
        <Space>
          <DownloadOutlined />
          <span>{count || 0}</span>
        </Space>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (date) => date ? new Date(date).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/models/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/models/${record.id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除模型 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 渲染表格内容
  const renderTableContent = () => {
    if (loading && models.length === 0) {
      return <Skeleton active paragraph={{ rows: 5 }} />;
    }

    if (!loading && models.length === 0) {
      return (
        <Empty
          description="暂无模型数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/models/create')}
          >
            创建模型
          </Button>
        </Empty>
      );
    }

    return (
      <>
        <Table
          columns={columns}
          dataSource={models}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
        />
        <div className={styles.pagination}>
          <Pagination
            current={query.page}
            pageSize={query.pageSize}
            total={total}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `共 ${total} 条`}
            onChange={(page, pageSize) => setQuery({ ...query, page, pageSize })}
          />
        </div>
      </>
    );
  };

  return (
    <div className={styles.container}>
      <Card className={styles.headerCard}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} className={styles.pageTitle}>模型管理</Title>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchModels}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/models/create')}
              >
                创建模型
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className={styles.filterCard}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="搜索模型名称、描述或标签"
              allowClear
              enterButton={<SearchOutlined />}
              value={query.keyword}
              onChange={(e) => setQuery({ ...query, keyword: e.target.value })}
              onSearch={() => fetchModels()}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: '100%' }}
              value={query.category}
              onChange={(value) => setQuery({ ...query, category: value, page: 1 })}
            >
              {MODEL_CATEGORY_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={query.status}
              onChange={(value) => setQuery({ ...query, status: value, page: 1 })}
            >
              {MODEL_STATUS_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} style={{ textAlign: 'right' }}>
            <Text type="secondary">
              共 <Badge count={total} showZero className={styles.totalBadge} /> 个模型
            </Text>
          </Col>
        </Row>
      </Card>

      <Card className={styles.tableCard}>
        {renderTableContent()}
      </Card>
    </div>
  );
};

export default ModelList;
