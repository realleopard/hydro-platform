import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Steps,
  message,
  Row,
  Col,
  Tag,
  InputNumber,
  Tooltip,
  Divider,
  Alert,
  Spin
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  QuestionCircleOutlined,
  ContainerOutlined,
  CodeOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { modelService } from '../../services/modelService';
import {
  MODEL_CATEGORY_OPTIONS,
  DATA_TYPE_OPTIONS
} from '../../types';
import styles from './ModelCreate.module.css';

const { TextArea } = Input;
const { Option } = Select;

const ModelCreate = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [interfaces, setInterfaces] = useState([]);

  // 步骤内容
  const steps = [
    {
      title: '基本信息',
      icon: <ContainerOutlined />,
      description: '填写模型的基本信息'
    },
    {
      title: '接口定义',
      icon: <CodeOutlined />,
      description: '配置输入输出接口'
    },
    {
      title: '资源配置',
      icon: <FileTextOutlined />,
      description: '设置运行资源需求'
    }
  ];

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 验证接口
      const inputInterfaces = interfaces.filter(i => i.type === 'input');
      const outputInterfaces = interfaces.filter(i => i.type === 'output');

      if (inputInterfaces.length === 0) {
        message.warning('请至少添加一个输入接口');
        setCurrentStep(1);
        setLoading(false);
        return;
      }

      if (outputInterfaces.length === 0) {
        message.warning('请至少添加一个输出接口');
        setCurrentStep(1);
        setLoading(false);
        return;
      }

      // 验证接口完整性
      const invalidInterfaces = interfaces.filter(i => !i.name || !i.dataType);
      if (invalidInterfaces.length > 0) {
        message.warning('请完善所有接口的名称和数据类型');
        setCurrentStep(1);
        setLoading(false);
        return;
      }

      const request = {
        name: values.name,
        description: values.description,
        category: values.category,
        dockerImage: values.dockerImage,
        interfaces: interfaces.map(iface => ({
          name: iface.name,
          type: iface.type,
          dataType: iface.dataType,
          description: iface.description,
          required: iface.type === 'input' ? iface.required : false
        })),
        resources: {
          cpu: values.cpu?.toString() || '2',
          memory: values.memory || '4Gi',
          storage: values.storage || '20Gi',
          timeout: values.timeout || 3600
        },
        tags: values.tags || [],
        readme: values.readme || ''
      };

      await modelService.createModel(request);

      message.success('模型创建成功');
      navigate('/models');
    } catch (error) {
      console.error('Failed to create model:', error);
      if (error instanceof Error) {
        message.error('创建失败: ' + error.message);
      } else {
        message.error('表单验证失败，请检查输入');
      }
    } finally {
      setLoading(false);
    }
  };

  // 添加接口
  const addInterface = (type) => {
    const newInterface = {
      name: '',
      type,
      dataType: 'netcdf',
      description: '',
      required: type === 'input'
    };
    setInterfaces([...interfaces, newInterface]);
  };

  // 更新接口
  const updateInterface = (index, field, value) => {
    const updated = [...interfaces];
    updated[index] = { ...updated[index], [field]: value };
    setInterfaces(updated);
  };

  // 删除接口
  const removeInterface = (index) => {
    setInterfaces(interfaces.filter((_, i) => i !== index));
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className={styles.stepContent}>
            <Form.Item
              name="name"
              label="模型名称"
              rules={[
                { required: true, message: '请输入模型名称' },
                { min: 2, message: '名称至少2个字符' },
                { max: 100, message: '名称最多100个字符' }
              ]}
            >
              <Input placeholder="例如：SWAT水文模型" />
            </Form.Item>

            <Form.Item
              name="category"
              label="模型分类"
              rules={[{ required: true, message: '请选择模型分类' }]}
            >
              <Select placeholder="选择分类">
                {MODEL_CATEGORY_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="dockerImage"
              label={
                <span>
                  Docker镜像
                  <Tooltip title="格式：registry/namespace/image:tag">
                    <QuestionCircleOutlined className={styles.tooltipIcon} />
                  </Tooltip>
                </span>
              }
              rules={[
                { required: true, message: '请输入Docker镜像地址' }
              ]}
            >
              <Input placeholder="例如：hydro-platform/swat:v1.0.0" />
            </Form.Item>

            <Form.Item
              name="description"
              label="模型描述"
              rules={[{ max: 500, message: '描述最多500个字符' }]}
            >
              <TextArea
                rows={4}
                placeholder="简要描述模型的功能、适用场景等"
                showCount
                maxLength={500}
              />
            </Form.Item>

            <Form.Item
              name="tags"
              label="标签"
            >
              <Select
                mode="tags"
                placeholder="添加标签，按回车确认"
                style={{ width: '100%' }}
              >
              </Select>
            </Form.Item>

            <Form.Item
              name="readme"
              label="README文档"
            >
              <TextArea
                rows={8}
                placeholder="支持 Markdown 格式，详细介绍模型的使用方法、参数说明等"
              />
            </Form.Item>
          </div>
        );

      case 1:
        return (
          <div className={styles.stepContent}>
            <Alert
              message="接口定义说明"
              description="定义模型的输入和输出接口，包括数据类型和是否必填。这些接口将用于工作流编排时的数据映射。"
              type="info"
              showIcon
              className={styles.alert}
            />

            <Divider orientation="left">输入接口</Divider>
            {interfaces.filter(i => i.type === 'input').length === 0 && (
              <Alert
                message="请至少添加一个输入接口"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            {interfaces.filter(i => i.type === 'input').map((iface, idx) => {
              const index = interfaces.indexOf(iface);
              return (
                <Card
                  key={index}
                  size="small"
                  className={styles.interfaceCard}
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeInterface(index)}
                    />
                  }
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Input
                        placeholder="接口名称"
                        value={iface.name}
                        onChange={(e) => updateInterface(index, 'name', e.target.value)}
                      />
                    </Col>
                    <Col span={8}>
                      <Select
                        placeholder="数据类型"
                        value={iface.dataType}
                        onChange={(value) => updateInterface(index, 'dataType', value)}
                      >
                        {DATA_TYPE_OPTIONS.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={8}>
                      <Select
                        value={iface.required ? 'required' : 'optional'}
                        onChange={(value) => updateInterface(index, 'required', value === 'required')}
                      >
                        <Option value="required">必填</Option>
                        <Option value="optional">可选</Option>
                      </Select>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col span={24}>
                      <Input
                        placeholder="接口描述"
                        value={iface.description}
                        onChange={(e) => updateInterface(index, 'description', e.target.value)}
                      />
                    </Col>
                  </Row>
                </Card>
              );
            })}
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => addInterface('input')}
              className={styles.addButton}
            >
              添加输入接口
            </Button>

            <Divider orientation="left">输出接口</Divider>
            {interfaces.filter(i => i.type === 'output').length === 0 && (
              <Alert
                message="请至少添加一个输出接口"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            {interfaces.filter(i => i.type === 'output').map((iface, idx) => {
              const index = interfaces.indexOf(iface);
              return (
                <Card
                  key={index}
                  size="small"
                  className={styles.interfaceCard}
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeInterface(index)}
                    />
                  }
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Input
                        placeholder="接口名称"
                        value={iface.name}
                        onChange={(e) => updateInterface(index, 'name', e.target.value)}
                      />
                    </Col>
                    <Col span={8}>
                      <Select
                        placeholder="数据类型"
                        value={iface.dataType}
                        onChange={(value) => updateInterface(index, 'dataType', value)}
                      >
                        {DATA_TYPE_OPTIONS.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={8}>
                      <Tag color="success">输出</Tag>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col span={24}>
                      <Input
                        placeholder="接口描述"
                        value={iface.description}
                        onChange={(e) => updateInterface(index, 'description', e.target.value)}
                      />
                    </Col>
                  </Row>
                </Card>
              );
            })}
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => addInterface('output')}
              className={styles.addButton}
            >
              添加输出接口
            </Button>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContent}>
            <Alert
              message="资源配置说明"
              description="设置模型运行所需的计算资源。请根据模型的实际需求和平台资源情况进行配置。"
              type="info"
              showIcon
              className={styles.alert}
            />

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="cpu"
                  label="CPU核心数"
                  initialValue={2}
                >
                  <InputNumber
                    min={1}
                    max={32}
                    style={{ width: '100%' }}
                    placeholder="例如：2"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="memory"
                  label="内存"
                  initialValue="4Gi"
                >
                  <Select placeholder="选择内存大小">
                    <Option value="1Gi">1 GiB</Option>
                    <Option value="2Gi">2 GiB</Option>
                    <Option value="4Gi">4 GiB</Option>
                    <Option value="8Gi">8 GiB</Option>
                    <Option value="16Gi">16 GiB</Option>
                    <Option value="32Gi">32 GiB</Option>
                    <Option value="64Gi">64 GiB</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="storage"
                  label="存储空间"
                  initialValue="20Gi"
                >
                  <Select placeholder="选择存储大小">
                    <Option value="10Gi">10 GiB</Option>
                    <Option value="20Gi">20 GiB</Option>
                    <Option value="50Gi">50 GiB</Option>
                    <Option value="100Gi">100 GiB</Option>
                    <Option value="200Gi">200 GiB</Option>
                    <Option value="500Gi">500 GiB</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="timeout"
                  label="超时时间（秒）"
                  initialValue={3600}
                >
                  <InputNumber
                    min={60}
                    max={86400}
                    style={{ width: '100%' }}
                    placeholder="例如：3600"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <div className={styles.summary}>
              <h3>配置摘要</h3>
              <div className={styles.summaryContent}>
                <p><strong>模型名称：</strong>{form.getFieldValue('name') || '-'}</p>
                <p><strong>分类：</strong>{MODEL_CATEGORY_OPTIONS.find(o => o.value === form.getFieldValue('category'))?.label || '-'}</p>
                <p><strong>Docker镜像：</strong>{form.getFieldValue('dockerImage') || '-'}</p>
                <p><strong>输入接口：</strong>{interfaces.filter(i => i.type === 'input').length} 个</p>
                <p><strong>输出接口：</strong>{interfaces.filter(i => i.type === 'output').length} 个</p>
                <p><strong>CPU：</strong>{form.getFieldValue('cpu') || 2} 核</p>
                <p><strong>内存：</strong>{form.getFieldValue('memory') || '4Gi'}</p>
                <p><strong>存储：</strong>{form.getFieldValue('storage') || '20Gi'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
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

      <Card className={styles.mainCard}>
        <Spin spinning={loading} tip="创建中...">
          <h1 className={styles.pageTitle}>创建新模型</h1>

          <Steps
            current={currentStep}
            items={steps}
            className={styles.steps}
          />

          <Form
            form={form}
            layout="vertical"
            className={styles.form}
          >
            {renderStepContent()}
          </Form>

          <div className={styles.stepActions}>
            <Space>
              {currentStep > 0 && (
                <Button onClick={() => setCurrentStep(currentStep - 1)}>
                  上一步
                </Button>
              )}
              {currentStep < steps.length - 1 && (
                <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                  下一步
                </Button>
              )}
              {currentStep === steps.length - 1 && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={handleSubmit}
                >
                  创建模型
                </Button>
              )}
            </Space>
          </div>
        </Spin>
      </Card>
    </div>
  );
};

export default ModelCreate;
