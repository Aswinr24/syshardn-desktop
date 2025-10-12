import {
  Button,
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Select,
  Input,
  Modal,
  App,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useAppStore } from '../store';
import { RuleCheck, SeverityLevel } from '../types';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const getSeverityColor = (severity: SeverityLevel) => {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'gold';
    case 'low':
      return 'green';
  }
};

export const ScanResultsPage = () => {
  const { message } = App.useApp();
  const { currentScanResult, setCurrentPage, setSelectedRules: setStoreSelectedRules } = useAppStore();
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('failed');
  const [searchText, setSearchText] = useState('');
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [showFixModal, setShowFixModal] = useState(false);

  if (!currentScanResult) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text>No scan results available</Text>
        <br />
        <Button onClick={() => setCurrentPage('home')} style={{ marginTop: 16 }}>
          Go Home
        </Button>
      </div>
    );
  }

  const filteredRules = currentScanResult.rules.filter((rule) => {
    const matchesSeverity = filterSeverity === 'all' || rule.severity === filterSeverity;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'failed' && rule.status === 'fail') ||
      (filterStatus === 'passed' && rule.status === 'pass') ||
      (filterStatus === 'warning' && rule.status === 'warning');
    const matchesSearch =
      searchText === '' ||
      rule.title.toLowerCase().includes(searchText.toLowerCase()) ||
      rule.id.toLowerCase().includes(searchText.toLowerCase());

    return matchesSeverity && matchesStatus && matchesSearch;
  });

  const handleFixAll = () => {
    const failedRules = currentScanResult.rules
      .filter((r) => r.status === 'fail')
      .map((r) => r.id);
    setSelectedRules(failedRules);
    setShowFixModal(true);
  };

  const handleFixSelected = (ruleId: string) => {
    setSelectedRules([ruleId]);
    setShowFixModal(true);
  };

  const handleConfirmFix = () => {
    setShowFixModal(false);
    // Save selected rules to store so ApplyingHardeningPage can use them
    setStoreSelectedRules(selectedRules);
    setCurrentPage('applying');
  };

  const handleDownloadReport = async () => {
    const hideLoading = message.loading('Generating and downloading report...', 0);
    try {
      const result = await window.api.generateReport(currentScanResult.id, 'pdf');
      hideLoading();
      
      if (result.success) {
        message.success({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Report Downloaded!</div>
              {/* <div style={{ fontSize: 12 }}>
                File saved to Downloads folder and opened in Finder
              </div> */}
            </div>
          ),
          duration: 5
        });
      } else {
        message.error({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>❌ Download Failed</div>
              <div style={{ fontSize: 12 }}>{result.error || 'Unknown error'}</div>
            </div>
          ),
          duration: 8
        });
      }
    } catch (error) {
      hideLoading();
      console.error('Failed to generate report:', error);
      message.error(`Failed to download report: ${error}`);
    }
  };

  const handleNewScan = () => {
    setCurrentPage('config');
  };

  const handleGoHome = () => {
    setCurrentPage('home');
  };

  const columns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        if (status === 'pass')
          return <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />;
        if (status === 'fail')
          return <CloseCircleOutlined style={{ fontSize: 20, color: '#f5222d' }} />;
        return <WarningOutlined style={{ fontSize: 20, color: '#faad14' }} />;
      },
    },
    {
      title: 'Rule ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: SeverityLevel) => (
        <Tag color={getSeverityColor(severity)}>{severity.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 150,
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: any, record: RuleCheck) => (
        <Space>
          {record.status === 'fail' && (
            <Button
              type="link"
              size="small"
              icon={<ToolOutlined />}
              onClick={() => handleFixSelected(record.id)}
            >
              Fix
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<HomeOutlined />} onClick={handleGoHome}>
          Home
        </Button>
      </Space>

      <Title level={2}>
        <CheckCircleOutlined /> Scan Results
      </Title>
      <Text type="secondary">
        Scan completed on {new Date(currentScanResult.timestamp).toLocaleString()}
      </Text>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
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
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card>
            <Statistic
              title="Total Rules"
              value={currentScanResult.totalRules}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card>
            <Statistic
              title="Passed"
              value={currentScanResult.passedRules}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card>
            <Statistic
              title="Failed"
              value={currentScanResult.failedRules}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card>
            <Statistic
              title="Warnings"
              value={currentScanResult.warningRules}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Issues by Severity */}
      <Card title="Issues by Severity" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Critical"
              value={currentScanResult.summary.critical}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="High"
              value={currentScanResult.summary.high}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Medium"
              value={currentScanResult.summary.medium}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Low"
              value={currentScanResult.summary.low}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Action Buttons */}
      <Space style={{ marginTop: 24 }} size="middle">
        <Button
          type="primary"
          size="large"
          icon={<ToolOutlined />}
          onClick={handleFixAll}
          disabled={currentScanResult.failedRules === 0}
        >
          Fix All Issues
        </Button>
        <Button size="large" icon={<DownloadOutlined />} onClick={handleDownloadReport}>
          Download Report
        </Button>
        <Button size="large" icon={<ReloadOutlined />} onClick={handleNewScan}>
          New Scan
        </Button>
      </Space>

      {/* Filters and Table */}
      <Card style={{ marginTop: 24 }}>
        <Space style={{ marginBottom: 16 }} size="middle" wrap>
          <Search
            placeholder="Search rules..."
            style={{ width: 250 }}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 150 }}
            options={[
              { label: 'Failed Only', value: 'failed' },
              { label: 'All Statuses', value: 'all' },
              { label: 'Passed', value: 'passed' },
              { label: 'Warnings', value: 'warning' },
            ]}
          />
          <Select
            value={filterSeverity}
            onChange={setFilterSeverity}
            style={{ width: 150 }}
            options={[
              { label: 'All Severities', value: 'all' },
              { label: 'Critical', value: 'critical' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' },
            ]}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredRules}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: 16 }}>
                <Paragraph>
                  <Text strong>Description: </Text>
                  {record.description}
                </Paragraph>
                {record.currentValue && (
                  <Paragraph>
                    <Text strong>Current Value: </Text>
                    <Text code>{record.currentValue}</Text>
                  </Paragraph>
                )}
                {record.expectedValue && (
                  <Paragraph>
                    <Text strong>Expected Value: </Text>
                    <Text code>{record.expectedValue}</Text>
                  </Paragraph>
                )}
                {/* <Paragraph>
                  <Text strong>Impact: </Text>
                  {record.impact}
                </Paragraph> */}
                {record.remediation && (
                  <Paragraph>
                    <Text strong>Remediation: </Text>
                    {record.remediation}
                  </Paragraph>
                )}
              </div>
            ),
          }}
        />
      </Card>

      {/* Fix Confirmation Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            Confirm Hardening
          </Space>
        }
        open={showFixModal}
        onOk={handleConfirmFix}
        onCancel={() => setShowFixModal(false)}
        okText="Apply Changes"
        cancelText="Cancel"
        width={600}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph>
            You are about to apply hardening fixes to <Text strong>{selectedRules.length}</Text>{' '}
            rule(s).
          </Paragraph>

          <Card size="small" style={{ backgroundColor: '#fffbe6' }}>
            <Space direction="vertical" size="small">
              <Text>
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> A system backup will be
                created automatically
              </Text>
              <Text>
                <WarningOutlined style={{ color: '#faad14' }} /> Some services may be restarted
              </Text>
              <Text>
                <ReloadOutlined /> Changes can be reversed using the rollback feature
              </Text>
            </Space>
          </Card>

          <div>
            <Text strong>Rules to be fixed:</Text>
            <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
              {selectedRules.map((ruleId) => {
                const rule = currentScanResult.rules.find((r) => r.id === ruleId);
                return (
                  <div key={ruleId} style={{ padding: '4px 0' }}>
                    <Text>
                      {ruleId} - {rule?.description || rule?.message || ''}
                    </Text>
                  </div>
                );
              })}
            </div>
          </div>

          <Paragraph type="warning" style={{ marginTop: 16 }}>
            Please ensure you have reviewed the changes and have appropriate backups before
            proceeding.
          </Paragraph>
        </Space>
      </Modal>
    </div>
  );
};
