import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Scan operations
  startScan: (config: any) => ipcRenderer.invoke('start-scan', config),
  subscribeScanProgress: (callback: (progress: any) => void) => {
    ipcRenderer.send('scan-progress-subscribe')
    ipcRenderer.on('scan-progress-update', (_event, progress) => callback(progress))
    return () => {
      ipcRenderer.send('scan-progress-unsubscribe')
      ipcRenderer.removeAllListeners('scan-progress-update')
    }
  },

  // Apply hardening
  applyHardening: (ruleIds: string[]) => ipcRenderer.invoke('apply-hardening', ruleIds),

  // Rules
  listRules: () => ipcRenderer.invoke('list-rules'),

  // Backups
  getBackups: () => ipcRenderer.invoke('get-backups'),
  rollback: (backupId: string) => ipcRenderer.invoke('rollback', backupId),

  // Reports
  generateReport: (scanId: string, format: string) =>
    ipcRenderer.invoke('generate-report', scanId, format),

  // Operations
  cancelOperation: () => ipcRenderer.invoke('cancel-operation'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  testSSHConnection: (config: any) => ipcRenderer.invoke('test-ssh-connection', config),

  // Logs
  getLogs: () => ipcRenderer.invoke('get-logs'),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
