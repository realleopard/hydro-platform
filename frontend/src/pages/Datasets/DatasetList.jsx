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
  Upload,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  InboxOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { datasetService } from '../../services/datasetService';
import PageHeader from '../../components/Common/PageHeader';
import {
  DATASET_DATA_TYPE_OPTIONS,
  DATASET_DATA_TYPE_MAP,
  DATASET_VISIBILITY_OPTIONS,
  DATASET_VISIBILITY_MAP,
  FILE_EXTENSION_DATA_TYPE_MAP,
} from '../../types';

const { Dragger } = Upload;

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
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: query.page,
        size: query.pageSize,
      };
      if (query.keyword) params.keyword = query.keyword;
      if (query.dataType) params.dataType = query.dataType;
      if (query.visibility) params.visibility = query.visibility;

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
  }, [query.page, query.pageSize, query.keyword, query.dataType, query.visibility]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleKeywordSearch = (value) => {
    setQuery((prev) => ({ ...prev, keyword: value, page: 1 }));
  };

  const handleFilterChange = (field, value) => {
    setQuery((prev) => ({ ...prev, [field]: value, page: 1 }));
  };

  // 从文件名自动推断数据类型
  const detectDataType = (filename) => {
    if (!filename) return undefined;
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return FILE_EXTENSION_DATA_TYPE_MAP[ext] || undefined;
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    // 自动检测并填充 dataType
    const detectedType = detectDataType(file.name);
    if (detectedType) {
      createForm.setFieldsValue({ dataType: detectedType });
    }
    return false; // 阻止自动上传
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();

      if (!selectedFile) {
        message.warning('请选择要上传的文件');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('metadata', JSON.stringify({
        name: values.name,
        description: values.description || '',
        dataType: values.dataType,
        visibility: values.visibility || 'private',
      }));

      await datasetService.uploadDataset(formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
      });

      message.success('数据集上传成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      setSelectedFile(null);
      setUploadProgress(0);
      fetchDatasets();
    } catch (error) {
      if (error.message) message.error('上传失败: ' + error.message);
    } finally {
      setUploading(false);
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
            <Input.Search
              placeholder="搜索数据集"
              allowClear
              style={{ width: 200 }}
              onSearch={handleKeywordSearch}
              onChange={(e) => !e.target.value && handleKeywordSearch('')}
            />
            <Select
              allowClear
              placeholder="数据类型"
              style={{ width: 130 }}
              value={query.dataType}
              onChange={(val) => handleFilterChange('dataType', val)}
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
              onChange={(val) => handleFilterChange('visibility', val)}
            >
              {DATASET_VISIBILITY_OPTIONS.map(({ value, label }) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchDatasets}>刷新</Button>
            <Button type="primary" icon={<UploadOutlined />} onClick={() => {
              setCreateModalVisible(true);
              setSelectedFile(null);
              createForm.resetFields();
            }}>
              上传数据集
            </Button>
          </Space>
        }
      />

      <Card>
        <Table
          dataSource={datasets}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: (
              <Empty description="暂无数据集">
                <Button type="primary" icon={<UploadOutlined />} onClick={() => {
                  setCreateModalVisible(true);
                  setSelectedFile(null);
                  createForm.resetFields();
                }}>
                  上传数据集
                </Button>
              </Empty>
            ),
          }}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total: total,
            onChange: (page, pageSize) => setQuery((prev) => ({ ...prev, page, pageSize })),
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>

      <Modal
        title="上传数据集"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
          setSelectedFile(null);
          setUploadProgress(0);
        }}
        okText="上传"
        cancelText="取消"
        confirmLoading={uploading}
        width={640}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="选择文件" required>
            <Dragger
              beforeUpload={handleFileSelect}
              onRemove={handleRemoveFile}
              maxCount={1}
              accept=".csv,.nc,.nc4,.tif,.tiff,.shp,.ts,.asc"
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">支持 CSV、NetCDF、GeoTIFF、Shapefile 等格式</p>
            </Dragger>
            {selectedFile && (
              <div style={{ marginTop: 8, color: '#8c8c8c' }}>
                已选择: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </div>
            )}
          </Form.Item>
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
            <Input.TextArea rows={2} placeholder="数据集描述（可选）" />
          </Form.Item>
          <Form.Item name="visibility" label="可见性" initialValue="private">
            <Select>
              {DATASET_VISIBILITY_OPTIONS.map(({ value, label }) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          {uploading && (
            <Progress percent={uploadProgress} status="active" />
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default DatasetList;
