import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  message,
  Popconfirm,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { datasetService } from '../../services/datasetService';
import { DATASET_DATA_TYPE_MAP, DATASET_DATA_TYPE_OPTIONS, DATASET_VISIBILITY_MAP, DATASET_VISIBILITY_OPTIONS } from '../../types';

const { Title, Text } = Typography;

const DatasetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();

  useEffect(() => {
    const fetchDataset = async () => {
      setLoading(true);
      try {
        const data = await datasetService.getDataset(id);
        setDataset(data);
      } catch (error) {
        message.error('加载数据集失败: ' + (error.message || ''));
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDataset();
  }, [id]);

  const handleEdit = () => {
    if (!dataset) return;
    editForm.setFieldsValue({
      name: dataset.name,
      description: dataset.description,
      dataType: dataset.dataType,
      visibility: dataset.visibility,
      storagePath: dataset.storagePath,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await datasetService.updateDataset(id, values);
      message.success('数据集已更新');
      setEditModalVisible(false);
      const updated = await datasetService.getDataset(id);
      setDataset(updated);
    } catch (error) {
      if (error.message) message.error('更新失败: ' + error.message);
    }
  };

  const handleDelete = async () => {
    try {
      await datasetService.deleteDataset(id);
      message.success('数据集已删除');
      navigate('/datasets');
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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (!dataset) {
    return <div style={{ padding: 24 }}><Text type="secondary">数据集不存在或已被删除</Text></div>;
  }

  const typeInfo = DATASET_DATA_TYPE_MAP[dataset.dataType];
  const visInfo = DATASET_VISIBILITY_MAP[dataset.visibility] || DATASET_VISIBILITY_MAP.private;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/datasets')}>返回</Button>
          <Title level={3} style={{ margin: 0 }}>
            <DatabaseOutlined /> {dataset.name || '未命名数据集'}
          </Title>
          {typeInfo && <Tag color={typeInfo.color}>{typeInfo.label}</Tag>}
          <Tag color={visInfo.color}>{visInfo.label}</Tag>
        </Space>
        <Space>
          <Button icon={<EditOutlined />} onClick={handleEdit}>编辑</Button>
          <Popconfirm title="确定删除该数据集？" onConfirm={handleDelete}>
            <Button danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="名称">{dataset.name}</Descriptions.Item>
          <Descriptions.Item label="数据类型">
            {typeInfo ? <Tag color={typeInfo.color}>{typeInfo.label}</Tag> : dataset.dataType}
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>{dataset.description || '--'}</Descriptions.Item>
          <Descriptions.Item label="存储类型">{dataset.storageType || '--'}</Descriptions.Item>
          <Descriptions.Item label="存储路径">
            <Text code>{dataset.storagePath || '--'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="文件大小">{formatFileSize(dataset.fileSize)}</Descriptions.Item>
          <Descriptions.Item label="校验和">
            <Text code style={{ fontSize: 11 }}>{dataset.checksum || '--'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="可见性">
            <Tag color={visInfo.color}>{visInfo.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="下载次数">
            <Space><DownloadOutlined /> {dataset.downloadCount || 0}</Space>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dataset.createdAt ? new Date(dataset.createdAt).toLocaleString('zh-CN') : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {dataset.updatedAt ? new Date(dataset.updatedAt).toLocaleString('zh-CN') : '--'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {(dataset.temporalStart || dataset.temporalEnd || dataset.spatialBounds) && (
        <Card title="时空范围" style={{ marginBottom: 16 }}>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="时间起点">
              {dataset.temporalStart ? new Date(dataset.temporalStart).toLocaleString('zh-CN') : '--'}
            </Descriptions.Item>
            <Descriptions.Item label="时间终点">
              {dataset.temporalEnd ? new Date(dataset.temporalEnd).toLocaleString('zh-CN') : '--'}
            </Descriptions.Item>
            <Descriptions.Item label="空间范围" span={2}>
              <Text code>{dataset.spatialBounds || '--'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Modal
        title="编辑数据集"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dataType" label="数据类型" rules={[{ required: true }]}>
                <Select>
                  {DATASET_DATA_TYPE_OPTIONS.map(({ value, label }) => (
                    <Select.Option key={value} value={value}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="visibility" label="可见性">
                <Select>
                  {DATASET_VISIBILITY_OPTIONS.map(({ value, label }) => (
                    <Select.Option key={value} value={value}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="storagePath" label="存储路径" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default DatasetDetail;
