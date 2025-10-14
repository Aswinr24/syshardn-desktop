import { Button, Card, Typography, Space, Row, Col, Checkbox, Alert } from 'antd';
import {
  SafetyOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useAppStore } from '../store';
import { HardeningProfile } from '../types';

const { Title, Text, Paragraph } = Typography;

const PROFILE_INFO = {
  basic: {
    icon: <SafetyOutlined />,
    title: 'Basic',
    description: 'Essential security settings with minimal system impact',
    color: '#52c41a',
    features: ['Low-risk changes', 'Quick scan', 'Minimal service disruption'],
  },
  moderate: {
    icon: <ExperimentOutlined />,
    title: 'Moderate',
    description: 'Balanced security with reasonable system hardening',
    color: '#1890ff',
    features: ['Medium-risk changes', 'Recommended for most systems', 'Some services may restart'],
  },
  strict: {
    icon: <ThunderboltOutlined />,
    title: 'Strict',
    description: 'Maximum security with comprehensive CIS compliance',
    color: '#fa8c16',
    features: ['High-risk changes', 'Thorough scan', 'Multiple service restarts'],
  },
};

const CATEGORIES = [
  { key: 'filesystem', label: 'Filesystem Configuration' },
  { key: 'services', label: 'Services' },
  { key: 'network', label: 'Network Configuration' },
  { key: 'logging', label: 'Logging and Auditing' },
  { key: 'access', label: 'Access Control' },
  { key: 'authentication', label: 'Authentication' },
];

export const ScanConfigPage = () => {
  const { selectedProfile, setSelectedProfile, setCurrentPage } = useAppStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleProfileSelect = (profile: HardeningProfile) => {
    setSelectedProfile(profile);
  };

  const handleStartScan = async () => {
    // Navigate to scanning page - it will handle the actual scan
    setCurrentPage('scanning');
  };

  const handleBack = () => {
    setCurrentPage('home');
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={handleBack}
        style={{ marginBottom: 16 }}
      >
        Back
      </Button>

      <Title level={2}>
        <SafetyOutlined /> Configure System Scan
      </Title>
      <Paragraph type="secondary">
        Select a hardening profile to determine the scope and intensity of the security scan.
      </Paragraph>

      <Title level={4} style={{ marginTop: 32 }}>
        Select Hardening Profile
      </Title>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {(Object.keys(PROFILE_INFO) as HardeningProfile[]).map((profile) => {
          const info = PROFILE_INFO[profile];
          const isSelected = selectedProfile === profile;

          return (
            <Col xs={24} md={8} key={profile}>
              <Card
                hoverable
                onClick={() => handleProfileSelect(profile)}
                style={{
                  borderColor: isSelected ? info.color : undefined,
                  borderWidth: isSelected ? 2 : 1,
                  height: '100%',
                }}
                bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div style={{ fontSize: 48, color: info.color, textAlign: 'center' }}>
                    {info.icon}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: info.color }}>
                      {info.title}
                    </Title>
                    <Text type="secondary">{info.description}</Text>
                  </div>
                  <ul style={{ paddingLeft: 20, marginTop: 12 }}>
                    {info.features.map((feature, idx) => (
                      <li key={idx}>
                        <Text>{feature}</Text>
                      </li>
                    ))}
                  </ul>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Alert
        message="Profile Information"
        description={`You've selected the ${PROFILE_INFO[selectedProfile].title} profile. ${PROFILE_INFO[selectedProfile].description}`}
        type="info"
        showIcon
        style={{ marginTop: 24 }}
      />

      {/* Advanced Options */}
      <div style={{ marginTop: 32 }}>
        <Button type="link" onClick={() => setShowAdvanced(!showAdvanced)} style={{ padding: 0 }}>
          {showAdvanced ? '▼' : '▶'} Advanced Options (Optional)
        </Button>

        {showAdvanced && (
          <Card style={{ marginTop: 16 }}>
            <Title level={5}>Select Specific Categories</Title>
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Leave unchecked to scan all categories
            </Paragraph>
            <Checkbox.Group
              value={selectedCategories}
              onChange={(values) => setSelectedCategories(values as string[])}
              style={{ width: '100%' }}
            >
              <Row gutter={[16, 8]}>
                {CATEGORIES.map((cat) => (
                  <Col xs={24} sm={12} key={cat.key}>
                    <Checkbox value={cat.key}>{cat.label}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Card>
        )}
      </div>

      {/* Start Scan Button */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          icon={<SafetyOutlined />}
          onClick={handleStartScan}
          style={{ paddingLeft: 48, paddingRight: 48 }}
        >
          Start Scan
        </Button>
      </div>
    </div>
  );
};
