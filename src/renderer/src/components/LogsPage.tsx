import { Button, Card, Typography, Space, message } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, FolderOpenOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useAppStore } from '../store';

const { Title, Paragraph, Text } = Typography;

export const LogsPage = () => {
  const { setCurrentPage } = useAppStore();
  const [logs, setLogs] = useState<string>('Loading logs...');
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await window.api.getLogs();
      if (result.success) {
        setLogs(result.data || 'No logs available.');
      } else {
        setLogs(`Error loading logs: ${result.error}`);
      }
    } catch (error) {
      setLogs(`Failed to load logs: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleRefresh = () => {
    loadLogs();
    message.success('Logs refreshed');
  };

  const handleOpenFolder = async () => {
    try {
      const result = await window.api.openLogsFolder();
      if (result.success) {
        message.success('Opened logs folder');
      } else {
        message.error(`Failed to open folder: ${result.error}`);
      }
    } catch (error) {
      message.error(`Error: ${error}`);
    }
  };

  const handleClear = async () => {
    try {
      const result = await window.api.clearLogs();
      if (result.success) {
        message.success('Logs cleared');
        loadLogs();
      } else {
        message.error(`Failed to clear logs: ${result.error}`);
      }
    } catch (error) {
      message.error(`Error: ${error}`);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentPage('settings')}>
            Back to Settings
          </Button>
          <Title level={2} style={{ margin: 0 }}>Application Logs</Title>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
          <Button icon={<FolderOpenOutlined />} onClick={handleOpenFolder}>
            Open Folder
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleClear}>
            Clear Logs
          </Button>
        </Space>
      </div>

      <Card>
        <Paragraph type="secondary">
          View detailed application logs including SSH commands, scan operations, and errors.
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          💡 <Text strong>Pro Tip:</Text> These logs are automatically saved to your application data directory and can help diagnose connection and execution issues.
        </Paragraph>
        
        <div 
          style={{ 
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: 16,
            borderRadius: 4,
            fontFamily: 'Monaco, Menlo, "Courier New", monospace',
            fontSize: 12,
            lineHeight: 1.6,
            maxHeight: '60vh',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {logs}
        </div>
      </Card>
    </div>
  );
};
