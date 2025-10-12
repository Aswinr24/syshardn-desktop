import { Layout, ConfigProvider, theme, App as AntApp } from 'antd';
import { useAppStore } from './store';
import { HomePage } from './components/HomePage';
import { ScanConfigPage } from './components/ScanConfigPage';
import { ScanningProgressPage } from './components/ScanningProgressPage';
import { ScanResultsPage } from './components/ScanResultsPage';
import { ApplyingHardeningPage } from './components/ApplyingHardeningPage';
import { RollbackInterfacePage } from './components/RollbackInterfacePage';
import { SettingsPage } from './components/SettingsPage';
import { LogsPage } from './components/LogsPage';

const { Content } = Layout;

function App(): React.JSX.Element {
  const { currentPage } = useAppStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'config':
        return <ScanConfigPage />;
      case 'scanning':
        return <ScanningProgressPage />;
      case 'results':
        return <ScanResultsPage />;
      case 'applying':
        return <ApplyingHardeningPage />;
      case 'rollback':
        return <RollbackInterfacePage />;
      case 'settings':
        return <SettingsPage />;
      case 'logs':
        return <LogsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
          <Content>
            {renderPage()}
          </Content>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
