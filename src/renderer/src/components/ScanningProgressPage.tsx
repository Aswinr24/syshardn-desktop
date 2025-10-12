import { Button, Card, Typography, Progress, Space, List, Tag, Spin } from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { RuleCheck } from '../types';

const { Title, Text } = Typography;

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pass':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'fail':
      return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
    case 'warning':
      return <WarningOutlined style={{ color: '#faad14' }} />;
    default:
      return <LoadingOutlined />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pass':
      return 'success';
    case 'fail':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'processing';
  }
};

export const ScanningProgressPage = () => {
  const {
    scanProgress,
    currentScanRule,
    setCurrentPage,
    setCurrentScanResult,
    addScanToHistory,
    setScanProgress,
    setCurrentScanRule,
  } = useAppStore();

  const [estimatedTime] = useState('Running scan...');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recentChecks, setRecentChecks] = useState<RuleCheck[]>([]);

  useEffect(() => {
    // Track elapsed time
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    // Simulate progress while scanning (visual feedback)
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + Math.random() * 5, 95); // Stop at 95%, complete when done
      setScanProgress(progress);
    }, 1000);

    // Actually run the scan
    const runScan = async () => {
      try {
        // Start the scan with the selected configuration
        const { selectedProfile, selectedCategories } = useAppStore.getState();
        const config = {
          profile: selectedProfile,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        };

        // Call the actual API
        const result = await window.api.startScan(config);
        
        clearInterval(timerInterval);
        clearInterval(progressInterval);
        
        if (result.success && result.data) {
          // Parse the actual scan results
          const scanData = result.data;
          
          console.log('Received scan data:', scanData);
          
          // Parse the rules from scan data - API returns "results" not "rules"
          const rawResults = scanData.results || scanData.rules || [];
          
          // Map the API response format to our internal RuleCheck format
          const rules: RuleCheck[] = rawResults.map((item: any) => ({
            id: item.rule_id || item.id,
            title: item.title || item.rule_id || 'Unknown',
            description: item.description || item.message,
            status: item.status, // 'pass', 'fail', 'error'
            severity: item.severity || 'medium', // If not provided, default to medium
            category: item.category || 'general',
            message: item.message || '',
            currentValue: item.current_value,
            expectedValue: item.expected_value,
          }));
          
          console.log('Parsed rules:', rules);
          
          // Update recent checks with actual data
          setRecentChecks(rules.slice(-5));
          if (rules.length > 0) {
            setCurrentScanRule(rules[rules.length - 1]);
          }
          
          // Calculate statistics from summary if available, otherwise calculate
          const passedRules = scanData.summary?.passed || rules.filter(r => r.status === 'pass').length;
          const failedRules = scanData.summary?.failed || rules.filter(r => r.status === 'fail').length;
          const warningRules = scanData.summary?.warnings || 0;
          const totalRules = scanData.summary?.total || rules.length;
          
          // Calculate compliance score
          const complianceScore = scanData.summary?.compliance_rate || 
            (totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0);
          
          // Count by severity
          const summary = {
            critical: rules.filter(r => r.severity === 'critical' && r.status === 'fail').length,
            high: rules.filter(r => r.severity === 'high' && r.status === 'fail').length,
            medium: rules.filter(r => r.severity === 'medium' && r.status === 'fail').length,
            low: rules.filter(r => r.severity === 'low' && r.status === 'fail').length,
          };
          
          const duration = Math.floor((Date.now() - startTime) / 1000);
          
          const scanResult = {
            id: `scan-${Date.now()}`,
            timestamp: new Date().toISOString(),
            profile: selectedProfile,
            duration,
            complianceScore,
            totalRules,
            passedRules,
            failedRules,
            warningRules,
            rules,
            summary,
          };
          
          setScanProgress(100);
          setCurrentScanResult(scanResult);
          addScanToHistory(scanResult);
          
          setTimeout(() => {
            setCurrentPage('results');
          }, 1000);
        } else {
          // Handle error
          console.error('Scan failed:', result.error);
          alert(`Scan failed: ${result.error || 'Unknown error'}\n\nMake sure SysHardn CLI is installed and accessible.`);
          setCurrentPage('config');
        }
      } catch (error) {
        clearInterval(timerInterval);
        clearInterval(progressInterval);
        console.error('Scan error:', error);
        alert(`Scan error: ${error}\n\nMake sure SysHardn CLI is installed and accessible.`);
        setCurrentPage('config');
      }
    };

    runScan();

    return () => {
      clearInterval(timerInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const handleCancel = async () => {
    await window.api.cancelOperation();
    setCurrentPage('home');
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            <Title level={3} style={{ marginTop: 16 }}>
              Scanning System...
            </Title>
            <Text type="secondary">{estimatedTime}</Text>
          </div>

          <div>
            <Progress
              percent={Math.floor(scanProgress)}
              status={scanProgress >= 100 ? 'success' : 'active'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Elapsed time: {elapsedTime}s
            </Text>
          </div>

          {currentScanRule && (
            <Card size="small" title="Currently Checking">
              <Space direction="vertical">
                <Text strong>{currentScanRule.title}</Text>
                <Text type="secondary">{currentScanRule.description}</Text>
                <Space>
                  <Tag>{currentScanRule.category}</Tag>
                  <Tag color={
                    currentScanRule.severity === 'critical' ? 'red' :
                    currentScanRule.severity === 'high' ? 'orange' :
                    currentScanRule.severity === 'medium' ? 'gold' : 'green'
                  }>
                    {currentScanRule.severity}
                  </Tag>
                </Space>
              </Space>
            </Card>
          )}

          <div>
            <Title level={5}>Recent Checks</Title>
            <List
              size="small"
              dataSource={recentChecks.slice(0, 5)}
              renderItem={(rule) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={getStatusIcon(rule.status)}
                    title={
                      <Space>
                        <Text>{rule.title}</Text>
                        <Tag color={getStatusColor(rule.status) as any}>
                          {rule.status.toUpperCase()}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space size="small">
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {rule.id}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          •
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {rule.category}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No checks completed yet' }}
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button
              danger
              icon={<StopOutlined />}
              onClick={handleCancel}
              disabled={scanProgress >= 100}
            >
              Cancel Scan
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};
