import { Button, Card, Typography, Progress, Space, List, Tag, Result } from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store';

const { Title, Text } = Typography;

interface ApplyStatus {
  ruleId: string;
  title: string;
  status: 'pending' | 'applying' | 'success' | 'failure';
  message?: string;
}

export const ApplyingHardeningPage = () => {
  const {
    applyProgress,
    currentScanResult,
    selectedRules,
    setCurrentPage,
    setApplyProgress,
  } = useAppStore();

  const [applyStatuses, setApplyStatuses] = useState<ApplyStatus[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  useEffect(() => {
    if (!currentScanResult) return;

    // Use selectedRules from store instead of all failed rules
    const rulesToApply = currentScanResult.rules.filter((r) => selectedRules.includes(r.id));
    
    console.log('Rules to apply:', rulesToApply);
    console.log('Selected rule IDs:', selectedRules);
    
    const initialStatuses: ApplyStatus[] = rulesToApply.map((rule) => ({
      ruleId: rule.id,
      title: rule.title,
      status: 'pending',
    }));
    setApplyStatuses(initialStatuses);

    // Actually apply fixes using the API
    const applyFixes = async () => {
      const ruleIds = rulesToApply.map(r => r.id);
      
      // Update all to applying status
      setApplyStatuses((prev) => prev.map(status => ({ ...status, status: 'applying' })));
      
      try {
        console.log('Applying hardening for rules:', ruleIds);
        const result = await window.api.applyHardening(ruleIds);
        
        console.log('Apply result:', result);
        
        if (result.success) {
          // Parse text output to determine success/failure for each rule
          const output = result.data || '';
          console.log('Apply output:', output);
          
          // Look for the summary line: "Summary: X applied, Y failed, Z skipped"
          const summaryMatch = output.match(/Summary:\s*(\d+)\s*applied,\s*(\d+)\s*failed/i);
          
          let appliedCount = 0;
          
          if (summaryMatch) {
            appliedCount = parseInt(summaryMatch[1]);
          }
          
          // Parse per-rule status from the table
          // Look for lines like: │ LNX-300 │ ✓ SUCCESS │ Applied and verified │
          const statusLines = output.match(/│\s*(\S+)\s*│\s*([✓✗])\s*(\w+)\s*│([^│]+)│/g);
          
          if (statusLines) {
            setApplyStatuses((prev) => {
              return prev.map(status => {
                // Find this rule in the output
                const ruleLine = statusLines.find(line => line.includes(status.ruleId));
                if (ruleLine) {
                  const success = ruleLine.includes('✓') || ruleLine.includes('SUCCESS');
                  const messageMatch = ruleLine.match(/│([^│]+)│\s*$/);
                  const message = messageMatch ? messageMatch[1].trim() : (success ? 'Applied successfully' : 'Failed to apply');
                  
                  if (success) {
                    setSuccessCount(c => c + 1);
                  } else {
                    setFailureCount(c => c + 1);
                  }
                  
                  return {
                    ...status,
                    status: success ? 'success' : 'failure',
                    message,
                  };
                }
                // If not found in output, assume success if we have applied count
                if (appliedCount > 0) {
                  setSuccessCount(c => c + 1);
                  return {
                    ...status,
                    status: 'success',
                    message: 'Applied successfully',
                  };
                }
                return status;
              });
            });
          } else {
            // No table found, use summary counts
            if (appliedCount > 0) {
              setApplyStatuses((prev) => prev.map(status => ({
                ...status,
                status: 'success',
                message: 'Applied successfully',
              })));
              setSuccessCount(appliedCount);
            } else {
              setApplyStatuses((prev) => prev.map(status => ({
                ...status,
                status: 'failure',
                message: 'Failed to apply',
              })));
              setFailureCount(ruleIds.length);
            }
          }
        } else {
          // Command failed
          setApplyStatuses((prev) => prev.map(status => ({
            ...status,
            status: 'failure',
            message: result.error || 'Failed to apply',
          })));
          setFailureCount(ruleIds.length);
        }
        
        setApplyProgress(100);
        setIsComplete(true);
      } catch (error) {
        console.error('Apply error:', error);
        setApplyStatuses((prev) => prev.map(status => ({
          ...status,
          status: 'failure',
          message: String(error),
        })));
        setFailureCount(ruleIds.length);
        setApplyProgress(100);
        setIsComplete(true);
      }
    };

    applyFixes();
  }, []);

  const handleGoToResults = () => {
    setCurrentPage('results');
  };

  const handleGoHome = () => {
    setCurrentPage('home');
  };

  const getStatusIcon = (status: ApplyStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
      case 'failure':
        return <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 16 }} />;
      case 'applying':
        return <LoadingOutlined style={{ color: '#1890ff', fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const getStatusTag = (status: ApplyStatus['status']) => {
    switch (status) {
      case 'success':
        return <Tag color="success">SUCCESS</Tag>;
      case 'failure':
        return <Tag color="error">FAILED</Tag>;
      case 'applying':
        return <Tag color="processing">APPLYING</Tag>;
      default:
        return <Tag>PENDING</Tag>;
    }
  };

  if (isComplete) {
    return (
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <Result
          status={failureCount === 0 ? 'success' : 'warning'}
          title={
            failureCount === 0
              ? 'Hardening Applied Successfully!'
              : 'Hardening Partially Applied'
          }
          subTitle={
            failureCount === 0
              ? `All ${successCount} rules have been successfully applied. Your system is now more secure.`
              : `${successCount} rules applied successfully, ${failureCount} failed. Review the details below.`
          }
          extra={[
            <Button type="primary" key="home" icon={<SafetyOutlined />} onClick={handleGoHome}>
              Go to Dashboard
            </Button>,
            <Button key="results" onClick={handleGoToResults}>
              View Scan Results
            </Button>,
          ]}
        />

        <Card title="Application Details" style={{ marginTop: 24 }}>
          <List
            dataSource={applyStatuses}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={getStatusIcon(item.status)}
                  title={
                    <Space>
                      <Text>{item.title}</Text>
                      {getStatusTag(item.status)}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.ruleId}
                      </Text>
                      {item.message && (
                        <Text type={item.status === 'failure' ? 'danger' : 'secondary'}>
                          {item.message}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <ToolOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={3} style={{ marginTop: 16 }}>
              Applying Hardening Changes...
            </Title>
            <Text type="secondary">
              Please wait while security fixes are being applied to your system
            </Text>
          </div>

          <div>
            <Progress
              percent={Math.floor(applyProgress)}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {Math.floor(applyProgress)}% Complete • {successCount} applied, {failureCount} failed
            </Text>
          </div>

          <Card size="small" title="Status" style={{ maxHeight: 400, overflow: 'auto' }}>
            <List
              dataSource={applyStatuses}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={getStatusIcon(item.status)}
                    title={
                      <Space>
                        <Text
                          style={{
                            fontWeight: item.status === 'applying' ? 'bold' : 'normal',
                          }}
                        >
                          {item.title}
                        </Text>
                        {getStatusTag(item.status)}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.ruleId}
                        </Text>
                        {item.message && (
                          <Text type={item.status === 'failure' ? 'danger' : 'secondary'}>
                            {item.message}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              <SafetyOutlined /> A backup has been created. Changes can be reverted using the
              rollback feature.
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};
