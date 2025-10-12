import { Button, Card, Row, Col, Typography, Statistic, Space, List, Tag } from 'antd';
import {
  SafetyOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  HistoryOutlined,
  RollbackOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useEffect } from 'react';
import { useAppStore } from '../store';

const { Title, Text } = Typography;

export const HomePage = () => {
  const {
    systemInfo,
    setSystemInfo,
    currentScanResult,
    scanHistory,
    setCurrentPage,
  } = useAppStore();

  useEffect(() => {
    window.api.getSystemInfo().then((result) => {
      if (result.success && result.data) {
        setSystemInfo({
          ...result.data,
          lastScanTime: currentScanResult?.timestamp,
          complianceScore: currentScanResult?.complianceScore,
        });
      }
    });
  }, []);

  const hasScans = currentScanResult !== null || scanHistory.length > 0;

  const handleStartScan = () => {
    setCurrentPage('config');
  };

  const handleViewResults = () => {
    setCurrentPage('results');
  };

  const handleRollback = () => {
    setCurrentPage('rollback');
  };

  const handleSettings = () => {
    setCurrentPage('settings');
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Settings button in top right */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <Button icon={<SettingOutlined />} onClick={handleSettings}>
          Settings
        </Button>
      </div>

      {!hasScans ? (
        <div style={{ textAlign: 'center', marginTop: '15%' }}>
          <SafetyOutlined style={{ fontSize: 80, color: '#1890ff', marginBottom: 24 }} />
          <Title level={2}>Welcome to SysHardn</Title>
          <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 32 }}>
            Secure your system with CIS Benchmark compliance scanning
          </Text>
          <Button
            type="primary"
            size="large"
            icon={<SafetyOutlined />}
            onClick={handleStartScan}
            style={{ height: 60, fontSize: 18, paddingLeft: 40, paddingRight: 40 }}
          >
            Start System Scan
          </Button>

          {systemInfo && (
            <Card
              style={{
                position: 'absolute',
                bottom: 24,
                left: 24,
                width: 300,
                textAlign: 'left',
              }}
              size="small"
            >
              <Space direction="vertical" size="small">
                <Text strong>System Information {systemInfo.isRemote && <Tag color="blue">Remote</Tag>}</Text>
                <Text>OS: {systemInfo.os}</Text>
                <Text>Hostname: {systemInfo.hostname}</Text>
                {systemInfo.uptime && <Text>Uptime: {systemInfo.uptime}</Text>}
                {systemInfo.memory && <Text>Memory: {systemInfo.memory}</Text>}
              </Space>
            </Card>
          )}
        </div>
      ) : (
        <div>
          <Title level={2}>
            <DashboardOutlined /> System Security Dashboard
          </Title>

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            {/* Compliance Score Card */}
            {currentScanResult && (
              <Col xs={24} sm={12} lg={8}>
                <Card>
                  <Statistic
                    title="Compliance Score"
                    value={currentScanResult.complianceScore}
                    suffix="%"
                    valueStyle={{
                      color:
                        currentScanResult.complianceScore >= 80
                          ? '#3f8600'
                          : currentScanResult.complianceScore >= 60
                          ? '#faad14'
                          : '#cf1322',
                    }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Last scan: {new Date(currentScanResult.timestamp).toLocaleString()}
                  </Text>
                </Card>
              </Col>
            )}

            {/* System Info Card */}
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>System Information {systemInfo?.isRemote && <Tag color="blue">Remote</Tag>}</Text>
                  <Text>OS: {systemInfo?.os}</Text>
                  <Text>Hostname: {systemInfo?.hostname}</Text>
                  <Text>Uptime: {systemInfo?.uptime}</Text>
                  <Text>Memory: {systemInfo?.memory}</Text>
                </Space>
              </Card>
            </Col>

            {/* Last Scan Time Card */}
            {currentScanResult && (
              <Col xs={24} sm={12} lg={8}>
                <Card>
                  <Statistic
                    title="Last Scan"
                    value={new Date(currentScanResult.timestamp).toLocaleDateString()}
                    prefix={<ClockCircleOutlined />}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Profile: {currentScanResult.profile.charAt(0).toUpperCase() + currentScanResult.profile.slice(1)}
                  </Text>
                </Card>
              </Col>
            )}
          </Row>

          {/* Issue Summary */}
          {currentScanResult && (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic
                    title="Critical"
                    value={currentScanResult.summary.critical}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic
                    title="High"
                    value={currentScanResult.summary.high}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic
                    title="Medium"
                    value={currentScanResult.summary.medium}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic
                    title="Low"
                    value={currentScanResult.summary.low}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* Action Buttons */}
          <Row gutter={16} style={{ marginTop: 24 }}>
            <Col>
              <Button
                type="primary"
                size="large"
                icon={<SafetyOutlined />}
                onClick={handleStartScan}
              >
                New Scan
              </Button>
            </Col>
            {currentScanResult && (
              <Col>
                <Button size="large" icon={<DashboardOutlined />} onClick={handleViewResults}>
                  View Results
                </Button>
              </Col>
            )}
            <Col>
              <Button size="large" icon={<RollbackOutlined />} onClick={handleRollback}>
                Rollback
              </Button>
            </Col>
          </Row>

          {/* Recent Scans */}
          {scanHistory.length > 0 && (
            <Card title={<><HistoryOutlined /> Recent Scans</>} style={{ marginTop: 24 }}>
              <List
                dataSource={scanHistory.slice(0, 5)}
                renderItem={(scan) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text>{new Date(scan.timestamp).toLocaleString()}</Text>
                          <Tag color={scan.complianceScore >= 80 ? 'green' : scan.complianceScore >= 60 ? 'orange' : 'red'}>
                            {scan.complianceScore}% Compliant
                          </Tag>
                        </Space>
                      }
                      description={`Profile: ${scan.profile} • Duration: ${scan.duration}s • ${scan.failedRules} issues found`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
