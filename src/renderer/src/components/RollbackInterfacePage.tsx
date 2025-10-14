import { Button, Card, Typography, Space, List, Tag, Alert, Radio, Modal, Result, App } from 'antd';
import {
  RollbackOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store';

const { Title, Text, Paragraph } = Typography;

interface BackupInfo {
  id: string;
  ruleId: string;
  timestamp: string;
  displayName: string;
}

export const RollbackInterfacePage = () => {
  const { message } = App.useApp();
  const { setCurrentPage } = useAppStore();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackComplete, setRollbackComplete] = useState(false);
  const [rollbackSuccess, setRollbackSuccess] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const result = await window.api.getBackups();
      if (result.success && result.data) {
        setBackups(result.data);
      } else {
        message.error(result.error || 'Failed to load backups');
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
      message.error('Failed to load backups');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleRestore = () => {
    if (!selectedBackup) return;
    setShowConfirmModal(true);
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackup) return;

    setShowConfirmModal(false);
    setIsRollingBack(true);

    try {
      const result = await window.api.rollback(selectedBackup.ruleId);
      
      setRollbackSuccess(result.success);
      setIsRollingBack(false);
      setRollbackComplete(true);
      
      if (result.success) {
        message.success('Rollback completed successfully!');
      } else {
        message.error(result.error || 'Rollback failed');
      }
    } catch (error: any) {
      console.error('Rollback failed:', error);
      setRollbackSuccess(false);
      setIsRollingBack(false);
      setRollbackComplete(true);
      message.error('Rollback failed: ' + error.message);
    }
  };

  const handleBack = () => {
    setCurrentPage('home');
  };

  const handleGoHome = () => {
    setCurrentPage('home');
  };

  if (isRollingBack) {
    return (
      <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <Card>
          <Space direction="vertical" size="large">
            <RollbackOutlined style={{ fontSize: 64, color: '#1890ff' }} />
            <Title level={3}>Rolling Back Changes...</Title>
            <Text type="secondary">
              Please wait while your system is being restored to the previous state.
              <br />
              Do not close this window or restart your system.
            </Text>
          </Space>
        </Card>
      </div>
    );
  }

  if (rollbackComplete) {
    return (
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <Result
          status={rollbackSuccess ? 'success' : 'error'}
          title={
            rollbackSuccess
              ? 'Rollback Completed Successfully'
              : 'Rollback Failed'
          }
          subTitle={
            rollbackSuccess
              ? 'Your system has been restored to the selected backup point. All changes have been reverted.'
              : 'Failed to restore the backup. Your system remains in its current state. Please try again or contact support.'
          }
          extra={[
            <Button type="primary" key="home" onClick={handleGoHome}>
              Go to Dashboard
            </Button>,
            <Button key="try-again" onClick={() => setRollbackComplete(false)}>
              Try Again
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={handleBack} style={{ marginBottom: 16 }}>
        Back
      </Button>

      <Title level={2}>
        <HistoryOutlined /> System Rollback
      </Title>
      <Paragraph type="secondary">
        Restore your system to a previous state by selecting a backup point below.
      </Paragraph>

      <Alert
        message="Important Information"
        description={
          <Space direction="vertical" size="small">
            <Text>
              • Rollback will revert all security hardening changes made after the selected backup
            </Text>
            <Text>• Services affected by the changes will be restarted</Text>
            <Text>• A new backup will be created before rollback begins</Text>
            <Text>• The rollback process cannot be interrupted once started</Text>
          </Space>
        }
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
      />

      {isLoadingBackups ? (
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <Space direction="vertical" size="large" style={{ padding: '40px 0' }}>
            <RollbackOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <div>
              <Title level={4}>Loading Backups...</Title>
              <Text type="secondary">
                Please wait while we fetch available backup points from your system.
              </Text>
            </div>
          </Space>
        </Card>
      ) : backups.length === 0 ? (
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <Space direction="vertical" size="large">
            <HistoryOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <div>
              <Title level={4}>No Backups Available</Title>
              <Text type="secondary">
                Backups are automatically created when you apply hardening fixes.
                <br />
                Start a scan and apply fixes to create your first backup.
              </Text>
            </div>
            <Button type="primary" onClick={() => setCurrentPage('config')}>
              Start New Scan
            </Button>
          </Space>
        </Card>
      ) : (
        <>
          <Card title="Available Backups" style={{ marginTop: 24 }}>
            <Radio.Group
              value={selectedBackup?.id}
              onChange={(e) => {
                const backup = backups.find(b => b.id === e.target.value);
                setSelectedBackup(backup || null);
              }}
              style={{ width: '100%' }}
            >
              <List
                dataSource={backups}
                renderItem={(backup) => {
                  const isSelected = selectedBackup?.id === backup.id;
                  const year = backup.timestamp.substring(0, 4);
                  const month = backup.timestamp.substring(4, 6);
                  const day = backup.timestamp.substring(6, 8);
                  const hour = backup.timestamp.substring(9, 11);
                  const minute = backup.timestamp.substring(11, 13);
                  const second = backup.timestamp.substring(13, 15);
                  const dateStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

                  return (
                    <List.Item
                      style={{
                        backgroundColor: isSelected ? '#e6f7ff' : undefined,
                        padding: '16px',
                        cursor: 'pointer',
                        borderRadius: 4,
                        marginBottom: 8,
                      }}
                      onClick={() => setSelectedBackup(backup)}
                    >
                      <List.Item.Meta
                        avatar={<Radio value={backup.id} />}
                        title={
                          <Space>
                            <Text strong>{backup.ruleId}</Text>
                            <Tag color="blue">{dateStr}</Tag>
                          </Space>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Backup ID: {backup.id}
                          </Text>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </Radio.Group>
          </Card>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<RollbackOutlined />}
              onClick={handleRestore}
              disabled={!selectedBackup}
              danger
            >
              Restore Latest Backup for {selectedBackup?.ruleId || 'Selected Rule'}
            </Button>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            Confirm Rollback
          </Space>
        }
        open={showConfirmModal}
        onOk={handleConfirmRestore}
        onCancel={() => setShowConfirmModal(false)}
        okText="Yes, Rollback Now"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        width={600}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="Warning: This action will revert system changes"
            type="error"
            showIcon
          />

          <Paragraph>
            You are about to rollback the following rule to its latest backup:
          </Paragraph>

          {selectedBackup && (
            <Card size="small">
              <Space direction="vertical" size="small">
                <Text strong>Rule: {selectedBackup.ruleId}</Text>
                <Text>Backup: {selectedBackup.displayName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  This will restore the latest backup for this rule
                </Text>
              </Space>
            </Card>
          )}

          <Card size="small" style={{ backgroundColor: '#fff7e6' }}>
            <Space direction="vertical" size="small">
              <Text>
                <CheckCircleOutlined style={{ color: '#fa8c16' }} /> A new backup will be created
                before rollback
              </Text>
              <Text>
                <ExclamationCircleOutlined style={{ color: '#fa8c16' }} /> All hardening changes
                made after this backup will be reverted
              </Text>
              <Text>
                <ExclamationCircleOutlined style={{ color: '#fa8c16' }} /> Services may be
                restarted during the process
              </Text>
            </Space>
          </Card>

          <Paragraph type="danger">
            Are you sure you want to proceed with the rollback? This action will take a few minutes
            to complete.
          </Paragraph>
        </Space>
      </Modal>
    </div>
  );
};
