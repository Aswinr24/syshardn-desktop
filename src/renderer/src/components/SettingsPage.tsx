import { Button, Card, Typography, Input, Space, Switch, Form, message, Alert } from 'antd';
import { SettingOutlined, ArrowLeftOutlined, SaveOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useAppStore } from '../store';

const { Title, Paragraph } = Typography;

interface SSHConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  syshardnPath: string;
}

export const SettingsPage = () => {
  const { setCurrentPage } = useAppStore();
  const [form] = Form.useForm();
  const [sshEnabled, setSshEnabled] = useState(false);
  const [usePassword, setUsePassword] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  useEffect(() => {
    // Load saved settings
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await window.api.getSettings();
      console.log('Loaded settings:', settings);
      if (settings.success && settings.data) {
        const ssh = settings.data.ssh || {};
        const localPath = settings.data.localSyshardnPath || './syshardn';
        
        setSshEnabled(ssh.enabled || false);
        setUsePassword(!!ssh.password);
        
        form.setFieldsValue({
          host: ssh.host || '',
          port: ssh.port || 22,
          username: ssh.username || '',
          password: ssh.password || '',
          privateKeyPath: ssh.privateKeyPath || '~/.ssh/id_rsa',
          syshardnPath: ssh.syshardnPath || 'syshardn',
          localSyshardnPath: localPath,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      message.error(`Failed to load settings: ${error}`);
    }
  };

  const handleSave = async () => {
    setSavingSettings(true);
    
    try {
      const values = form.getFieldsValue();
      
      console.log('Saving settings with values:', values);
      
      const sshConfig: SSHConfig = {
        enabled: sshEnabled,
        host: values.host || '',
        port: values.port || 22,
        username: values.username || '',
        password: usePassword ? values.password : undefined,
        privateKeyPath: !usePassword ? values.privateKeyPath : undefined,
        syshardnPath: values.syshardnPath || 'syshardn',
      };

      const settings = {
        ssh: sshConfig,
        localSyshardnPath: values.localSyshardnPath || './syshardn',
      };

      console.log('Sending settings to backend:', settings);
      
      const result = await window.api.saveSettings(settings);
      
      console.log('Save result:', result);
      
      if (result.success) {
        message.success({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>✅ Settings Saved Successfully!</div>
              <div style={{ fontSize: 12 }}>
                {sshEnabled 
                  ? `SSH enabled for ${values.host}` 
                  : 'Using local SysHardn execution'}
              </div>
            </div>
          ),
          duration: 4,
        });
      } else {
        message.error({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>❌ Failed to Save Settings</div>
              <div style={{ fontSize: 12 }}>{result.error || 'Unknown error'}</div>
            </div>
          ),
          duration: 6,
        });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      message.error({
        content: (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>❌ Error</div>
            <div style={{ fontSize: 12 }}>{String(error)}</div>
          </div>
        ),
        duration: 6,
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTest = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    
    try {
      const values = form.getFieldsValue();
      
      // Basic validation
      if (!values.host) {
        message.error('⚠️ Please enter SSH host');
        setTestingConnection(false);
        return;
      }
      if (!values.username) {
        message.error('⚠️ Please enter username');
        setTestingConnection(false);
        return;
      }
      if (usePassword && !values.password) {
        message.error('⚠️ Please enter password');
        setTestingConnection(false);
        return;
      }
      if (!usePassword && !values.privateKeyPath) {
        message.error('⚠️ Please enter private key path');
        setTestingConnection(false);
        return;
      }
      
      const testConfig = {
        enabled: true,
        host: values.host,
        port: values.port || 22,
        username: values.username,
        password: usePassword ? values.password : undefined,
        privateKeyPath: !usePassword ? values.privateKeyPath : undefined,
        syshardnPath: values.syshardnPath || 'syshardn',
      };

      console.log('Testing SSH connection with config:', testConfig);
      
      message.loading({ content: '🔄 Testing SSH connection...', key: 'test' });
      
      const result = await window.api.testSSHConnection(testConfig);
      
      console.log('Test result:', result);
      
      if (result.success) {
        setConnectionStatus('success');
        setConnectionMessage(`Successfully connected to ${values.username}@${values.host}`);
        message.success({ 
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>✅ Connection Successful!</div>
              <div style={{ fontSize: 12 }}>
                Connected to {values.username}@{values.host}:{values.port || 22}
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: '#52c41a' }}>
                You can now save settings and run scans on this remote machine
              </div>
            </div>
          ),
          key: 'test', 
          duration: 5 
        });
      } else {
        setConnectionStatus('error');
        setConnectionMessage(result.error || 'Connection failed');
        message.error({ 
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>❌ Connection Failed</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                {result.error || 'Unknown error'}
              </div>
              <div style={{ fontSize: 11, color: '#ff4d4f' }}>
                Check your credentials and ensure SSH server is running
              </div>
            </div>
          ),
          key: 'test', 
          duration: 8 
        });
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      setConnectionMessage(String(error));
      message.error({ 
        content: (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>❌ Test Failed</div>
            <div style={{ fontSize: 12 }}>{String(error)}</div>
          </div>
        ),
        key: 'test', 
        duration: 8 
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleBack = () => {
    setCurrentPage('home');
  };

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Back
        </Button>
        <Button 
          type="default" 
          onClick={() => setCurrentPage('logs')}
        >
          📋 View Logs
        </Button>
      </div>

      <Title level={2}>
        <SettingOutlined /> Settings
      </Title>

      <Card title="Remote Execution (SSH)" style={{ marginTop: 24 }}>
        <Paragraph type="secondary">
          Configure SSH connection to run SysHardn on a remote Linux machine.
          This is useful when your local machine doesn't have CIS rules available.
        </Paragraph>

        <Form form={form} layout="vertical">
          <Form.Item label="Enable SSH Remote Execution">
            <Switch
              checked={sshEnabled}
              onChange={setSshEnabled}
              checkedChildren="Enabled"
              unCheckedChildren="Disabled"
            />
          </Form.Item>

          {sshEnabled && (
            <>
              <Form.Item
                label="SSH Host"
                name="host"
                rules={[{ required: sshEnabled, message: 'Please enter SSH host' }]}
              >
                <Input placeholder="e.g., 192.168.1.100 or server.example.com" />
              </Form.Item>

              <Form.Item
                label="SSH Port"
                name="port"
                initialValue={22}
                rules={[{ required: sshEnabled, message: 'Please enter SSH port' }]}
              >
                <Input type="number" placeholder="22" />
              </Form.Item>

              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: sshEnabled, message: 'Please enter username' }]}
              >
                <Input placeholder="e.g., root or your-username" />
              </Form.Item>

              <Form.Item label="Authentication Method">
                <Space>
                  <Button
                    type={usePassword ? 'primary' : 'default'}
                    onClick={() => setUsePassword(true)}
                  >
                    Password
                  </Button>
                  <Button
                    type={!usePassword ? 'primary' : 'default'}
                    onClick={() => setUsePassword(false)}
                  >
                    Private Key
                  </Button>
                </Space>
              </Form.Item>

              {usePassword ? (
                <Form.Item
                  label="Password"
                  name="password"
                  rules={[{ required: sshEnabled && usePassword, message: 'Please enter password' }]}
                >
                  <Input.Password placeholder="Your SSH password" />
                </Form.Item>
              ) : (
                <Form.Item
                  label="Private Key Path"
                  name="privateKeyPath"
                  rules={[
                    { required: sshEnabled && !usePassword, message: 'Please enter private key path' },
                  ]}
                >
                  <Input placeholder="e.g., ~/.ssh/id_rsa or /path/to/key.pem" />
                </Form.Item>
              )}

              <Form.Item
                label="SysHardn Path on Remote"
                name="syshardnPath"
                initialValue="syshardn"
                rules={[{ required: sshEnabled, message: 'Please enter SysHardn path' }]}
              >
                <Input placeholder="e.g., syshardn or /usr/local/bin/syshardn" />
              </Form.Item>

              {/* Connection Status Alert */}
              {connectionStatus !== 'idle' && (
                <Alert
                  message={connectionStatus === 'success' ? 'Connection Test Successful' : 'Connection Test Failed'}
                  description={connectionMessage}
                  type={connectionStatus === 'success' ? 'success' : 'error'}
                  showIcon
                  icon={connectionStatus === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  closable
                  onClose={() => {
                    setConnectionStatus('idle');
                    setConnectionMessage('');
                  }}
                  style={{ marginBottom: 16 }}
                />
              )}

              <Space style={{ marginTop: 16 }}>
                <Button 
                  onClick={handleTest} 
                  loading={testingConnection}
                  disabled={savingSettings}
                  icon={<ApiOutlined />}
                >
                  Test Connection
                </Button>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />} 
                  onClick={handleSave}
                  loading={savingSettings}
                  disabled={testingConnection}
                >
                  Save Settings
                </Button>
              </Space>
            </>
          )}

          {!sshEnabled && (
            <Form.Item>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
                loading={savingSettings}
              >
                Save Settings
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>

      <Card title="Local Execution" style={{ marginTop: 16 }}>
        <Paragraph type="secondary">
          When SSH is disabled, SysHardn will be executed locally on this machine.
        </Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item
            label="Local SysHardn Path"
            name="localSyshardnPath"
            initialValue="./syshardn"
          >
            <Input placeholder="e.g., ./syshardn or python3 /path/to/syshardn" />
          </Form.Item>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSave}
            loading={savingSettings}
          >
            Save Settings
          </Button>
        </Form>
      </Card>
    </div>
  );
};
