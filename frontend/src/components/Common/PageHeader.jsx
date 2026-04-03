import React from 'react';
import { Typography, Breadcrumb, Button } from 'antd';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const PageHeader = ({ title, icon, breadcrumbs, showBack = false, extra }) => {
  const navigate = useNavigate();

  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumbs && (
        <Breadcrumb style={{ marginBottom: 8 }}>
          <Breadcrumb.Item>
            <HomeOutlined /> <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>控制台</span>
          </Breadcrumb.Item>
          {breadcrumbs.map((item, idx) => (
            <Breadcrumb.Item key={idx}>
              {item.path ? (
                <span style={{ cursor: 'pointer' }} onClick={() => navigate(item.path)}>{item.label}</span>
              ) : item.label}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showBack && (
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        )}
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
        {extra && <div style={{ marginLeft: 'auto' }}>{extra}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
