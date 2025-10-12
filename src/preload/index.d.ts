import { ElectronAPI } from '@electron-toolkit/preload'

interface SyshardnAPI {
  getSystemInfo: () => Promise<{ success: boolean; data?: { os: string; hostname: string; uptime: string; memory: string; disk: string; isRemote: boolean }; error?: string }>
  startScan: (config: any) => Promise<{ success: boolean; data: any; error?: string }>
  subscribeScanProgress: (callback: (progress: any) => void) => () => void
  applyHardening: (ruleIds: string[]) => Promise<{ success: boolean; data: any; error?: string }>
  listRules: () => Promise<{ success: boolean; data: any; error?: string }>
  getBackups: () => Promise<{ success: boolean; data: any; error?: string }>
  rollback: (backupId: string) => Promise<{ success: boolean; data: any; error?: string }>
  generateReport: (scanId: string, format: string) => Promise<{ success: boolean; data: any; error?: string }>
  cancelOperation: () => Promise<{ success: boolean }>
  getSettings: () => Promise<{ success: boolean; data: any; error?: string }>
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>
  testSSHConnection: (config: any) => Promise<{ success: boolean; error?: string }>
  getLogs: () => Promise<{ success: boolean; data: string; error?: string }>
  openLogsFolder: () => Promise<{ success: boolean; error?: string }>
  clearLogs: () => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: SyshardnAPI
  }
}
