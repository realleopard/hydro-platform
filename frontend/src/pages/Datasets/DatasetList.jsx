import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
  Modal,
  Form,
  Row,
  Col,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { datasetService } from '../../services/datasetService';
import PageHeader from '../../components/Common/PageHeader';
import {
  DATASET_DATA_TYPE_OPTIONS,
  DATASET_DATA_TYPE_MAP,
  DATASET_VISIBILITY_OPTIONS,
  DATASET_VISIBILITY_MAP,
} from '../../types';

const DatasetList = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 10,
    keyword: '',
    dataType: undefined,
    visibility: undefined,
  });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: query.page, size: query.pageSize };
      const response = await datasetService.getDatasets(params);
      const records = response.records || response || [];
      setDatasets(Array.isArray(records) ? records : []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
      message.error('加载数据集列表失败');
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }, [query.page, query.pageSize]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const filteredDatasets = datasets.filter((ds) => {
    if (query.keyword && !ds.name?.toLowerCase().includes(query.keyword.toLowerCase())) return false;
    if (query.dataType && ds.dataType !== query.dataType) return false;
    if (query.visibility && ds.visibility !== query.visibility) return false;
    return true;
  });

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await datasetService.createDataset(values);
      message.success('数据集创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchDatasets();
    } catch (error) {
      if (error.message) message.error('创建失败: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await datasetService.deleteDataset(id);
      message.success('数据集已删除');
      fetchDatasets();
    } catch (error) {
      message.error('删除失败: ' + (error.message || ''));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '--';
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Button type="link" onClick={() => navigate(`/datasets/${record.id}`)} style={{ padding: 0 }}>
          {text || '未命名'}
        </Button>
      ),
    },
    {
      title: '类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (type) => {
        const info = DATASET_DATA_TYPE_MAP[type];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>{type}</Tag>;
      },
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (size) => formatFileSize(size),
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 100,
      render: (v) => {
        const info = DATASET_VISIBILITY_MAP[v] || DATASET_VISIBILITY_MAP.private;
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '下载次数',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      width: 100,
      render: (count) => count || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (t) => (t ? new Date(t).toLocaleString('zh-CN') : '--'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/datasets/${record.id}`)}>
            详情
          </Button>
          <Popconfirm title="确定删除该数据集？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="数据集管理"
        icon={<DatabaseOutlined />}
        breadcrumbs={[{ label: '数据集管理' }]}
        extra={
          <Space>
            <Input
              placeholder="搜索数据集"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
              value={query.keyword}
              onChange={(e) => setQuery({ ...query, keyword: e.target.value })}
            />
            <Select
              allowClear
              placeholder="数据类型"
              style={{ width: 130 }}
              value={query.dataType}
              onChange={(val) => setQuery({ ...query, dataType: val })}
            >
              {DATASET_DATA_TYPE_OPTIONS.map(({ value, label }) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
            <Select
              allowClear
              placeholder="可见性"
              style={{ width: 100 }}
              value={query.visibility}
              onChange={(val) => setQuery({ ...query, visibility: val })}
            >
              {DATASET_VISIBILITY_OPTIONS.map(({ value, label }) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchDatasets}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
              新建数据集
            </Button>
          </Space>
        }
      />

      <Card>
        <Table
          dataSource={filteredDatasets}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: (
              <Empty description="暂无数据集">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
                  新建数据集
                </Button>
              </Empty>
            ),
          }}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total: total || filteredDatasets.length,
            onChange: (page, pageSize) => setQuery({ ...query, page, pageSize }),
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>

      <Modal
        title="新建数据集"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => { setCreateModalVisible(false); createForm.resetFields(); }}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        <Form form={createForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="数据集名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dataType" label="数据类型" rules={[{ required: true, message: '请选择类型' }]}>
                <Select placeholder="选择数据类型">
                  {DATASET_DATA_TYPE_OPTIONS.map(({ value, label }) => (
                    <Select.Option key={value} value={value}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="数据集描述（可选）" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="visibility" label="可见性" initialValue="private">
                <Select>
                  {DATASET_VISIBILITY_OPTIONS.map(({ value, label }) => (
                    <Select.Option key={value} value={value}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="storageType" label="存储类型" initialValue="local">
                <Select>
                  <Select.Option value="local">本地存储</Select.Option>
                  <Select.Option value="s3">S3对象存储</Select.Option>
                  <Select.Option value="nfs">NFS共享</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="storagePath" label="存储路径" rules={[{ required: true, message: '请输入存储路径' }]}>
            <Input placeholder="例如: /data/hydrology/rainfall_2024.csv" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DatasetList;
