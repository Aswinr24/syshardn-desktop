import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process'
import os from 'os'
import fs from 'fs'
const logsPath = join(app.getPath('userData'), 'logs')
const logFilePath = join(logsPath, 'app.log')

function setupLogging(): void {
  try {
    if (!fs.existsSync(logsPath)) {
      fs.mkdirSync(logsPath, { recursive: true })
    }
  } catch (error) {
    console.error('Failed to create logs directory:', error)
  }
}

function logToFile(message: string): void {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  try {
    fs.appendFileSync(logFilePath, logMessage)
    console.log(message) // Also log to console
  } catch (error) {
    console.error('Failed to write to log file:', error)
  }
}

interface AppSettings {
  ssh: {
    enabled: boolean
    host: string
    port: number
    username: string
    password?: string
    privateKeyPath?: string
    syshardnPath: string
  }
  localSyshardnPath: string
}

let appSettings: AppSettings = {
  ssh: {
    enabled: false,
    host: '',
    port: 22,
    username: '',
    syshardnPath: 'syshardn',
  },
  localSyshardnPath: './syshardn',
}

const settingsPath = join(app.getPath('userData'), 'settings.json')

function loadSettings(): void {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      appSettings = { ...appSettings, ...JSON.parse(data) }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

function saveSettingsToFile(): void {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(appSettings, null, 2))
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

let sshCommandInProgress = false;

function executeSSHCommand(
  command: string,
  config: AppSettings['ssh']
): Promise<{ success: boolean; data: any; error?: string }> {
  return new Promise((resolve) => {
    if (sshCommandInProgress) {
      logToFile(`WARNING: SSH command already in progress, potential duplicate call detected!`);
    }
    sshCommandInProgress = true;
    
    logToFile(`=== SSH Command Execution ===`)
    logToFile(`Remote command: ${command}`)
    logToFile(`SSH host: ${config.username}@${config.host}:${config.port}`)
    
    const sshArgs: string[] = [
      '-p',
      config.port.toString(),
      '-o',
      'StrictHostKeyChecking=no',
    ]

    if (config.privateKeyPath) {
      sshArgs.push('-i', config.privateKeyPath)
      logToFile(`Using private key: ${config.privateKeyPath}`)
    }

    sshArgs.push(`${config.username}@${config.host}`)
    sshArgs.push(command)
    
    logToFile(`Full SSH args: ${JSON.stringify(sshArgs)}`)

    const sshCmd = spawn('ssh', sshArgs)
    let stdout = ''
    let stderr = ''

    if (config.password) {
      logToFile('Using password authentication with sshpass')
      const sshpassCmd = spawn('sshpass', ['-p', config.password, 'ssh', ...sshArgs.slice(0, -1), sshArgs[sshArgs.length - 1]])
      
      sshpassCmd.stdout.on('data', (data) => {
        const chunk = data.toString()
        stdout += chunk
        logToFile(`SSH stdout: ${chunk}`)
      })

      sshpassCmd.stderr.on('data', (data) => {
        const chunk = data.toString()
        stderr += chunk
        logToFile(`SSH stderr: ${chunk}`)
      })

      sshpassCmd.on('close', (code) => {
        sshCommandInProgress = false;
        logToFile(`SSH command exited with code: ${code}`)
        if (code === 0 || code === 1) {
          resolve({ success: true, data: stdout })
        } else {
          logToFile(`SSH command failed with stderr: ${stderr}`)
          resolve({ success: false, data: null, error: stderr || 'SSH command failed' })
        }
      })

      sshpassCmd.on('error', (err) => {
        sshCommandInProgress = false;
        logToFile(`SSH process error: ${err.message}`)
        resolve({ success: false, data: null, error: `SSH error: ${err.message}. Make sure sshpass is installed for password authentication.` })
      })
    } else {
      logToFile('Using key-based authentication')
      
      sshCmd.stdout.on('data', (data) => {
        const chunk = data.toString()
        stdout += chunk
        logToFile(`SSH stdout: ${chunk}`)
      })

      sshCmd.stderr.on('data', (data) => {
        const chunk = data.toString()
        stderr += chunk
        logToFile(`SSH stderr: ${chunk}`)
      })

      sshCmd.on('close', (code) => {
        sshCommandInProgress = false;
        logToFile(`SSH command exited with code: ${code}`)
        if (code === 0 || code === 1) {
          resolve({ success: true, data: stdout })
        } else {
          logToFile(`SSH command failed with stderr: ${stderr}`)
          resolve({ success: false, data: null, error: stderr || 'SSH command failed' })
        }
      })

      sshCmd.on('error', (err) => {
        sshCommandInProgress = false;
        logToFile(`SSH process error: ${err.message}`)
        resolve({ success: false, data: null, error: `SSH error: ${err.message}` })
      })
    }
  })
}

function executeSyshardnCommand(
  command: string,
  args: string[] = [],
  reportPath?: string
): Promise<{ success: boolean; data: any; error?: string }> {
  const fullArgs = [command, ...args]
  
  if (appSettings.ssh.enabled) {
    const quotedArgs = fullArgs.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ')
    
    const needsSudo = command === 'apply' || command === 'rollback'
    const sshCommand = needsSudo 
      ? `sudo ./${appSettings.ssh.syshardnPath} ${quotedArgs}`
      : `./${appSettings.ssh.syshardnPath} ${quotedArgs}`
    
    logToFile(`Executing SSH command: ${sshCommand}`)
    logToFile(`SSH Config: ${JSON.stringify(appSettings.ssh, null, 2)}`)
    
    return new Promise(async (resolve) => {
      try {
        const result = await executeSSHCommand(sshCommand, appSettings.ssh)
        
        if (reportPath) {
          logToFile(`Checking for report file at: ${reportPath}`)
          
          const checkCommand = `test -f ${reportPath} && echo "EXISTS" || echo "NOT_FOUND"`
          const checkResult = await executeSSHCommand(checkCommand, appSettings.ssh)
          
          if (checkResult.success && checkResult.data.includes('EXISTS')) {
            logToFile(`Report file exists, reading: ${reportPath}`)
            const catCommand = `cat ${reportPath}`
            const reportResult = await executeSSHCommand(catCommand, appSettings.ssh)
            
            if (reportResult.success) {
              try {
                const reportData = JSON.parse(reportResult.data)
                logToFile('Successfully read and parsed report file')
                logToFile(`Report summary: ${reportData.summary?.total || 'N/A'} checks`)
                resolve({ success: true, data: reportData })
                return
              } catch (e) {
                logToFile(`Failed to parse report JSON: ${e}`)
                logToFile(`Raw report data (first 200 chars): ${reportResult.data.substring(0, 200)}`)
              }
            } else {
              logToFile(`Failed to read report file: ${reportResult.error}`)
            }
          } else {
            logToFile(`Report file not found at: ${reportPath}`)
          }
          
          if (result.success) {
            resolve(result)
          } else {
            resolve({ success: false, data: null, error: `Command failed and report not found: ${result.error}` })
          }
        } else {
          resolve(result)
        }
      } catch (error: any) {
        logToFile(`SSH execution error: ${error.message}`)
        resolve({ success: false, data: null, error: error.message })
      }
    })
  }

  return new Promise((resolve) => {
    const cmdParts = appSettings.localSyshardnPath.split(' ')
    const baseCmd = cmdParts[0]
    const baseCmdArgs = cmdParts.slice(1)
    
    logToFile(`Executing local command: ${baseCmd} ${[...baseCmdArgs, ...fullArgs].join(' ')}`)
    if (reportPath) {
      logToFile(`Report path provided: ${reportPath}`)
    }
    
    // Set UTF-8 encoding for Windows to prevent Unicode errors
    const spawnEnv = { ...process.env };
    if (process.platform === 'win32') {
      spawnEnv.PYTHONIOENCODING = 'utf-8';
      spawnEnv.PYTHONUTF8 = '1';
      logToFile('Windows detected - setting UTF-8 environment variables');
    }
    
    const syshardn = spawn(baseCmd, [...baseCmdArgs, ...fullArgs], {
      env: spawnEnv
    })
    let stdout = ''
    let stderr = ''
    let stdoutClosed = false;
    let stderrClosed = false;
    let processExited = false;

    syshardn.stdout.on('data', (data) => {
      const chunk = data.toString()
      stdout += chunk
      logToFile(`Local stdout: ${chunk}`)
      
      // Look for "Report saved to:" or similar messages in output
      if (chunk.includes('report') || chunk.includes('Report') || chunk.includes('saved')) {
        logToFile(`[REPORT INFO] ${chunk.trim()}`);
      }
    })

    syshardn.stdout.on('close', () => {
      stdoutClosed = true;
      logToFile('stdout stream closed');
    });

    syshardn.stderr.on('data', (data) => {
      const chunk = data.toString()
      stderr += chunk
      logToFile(`Local stderr: ${chunk}`)
    })

    syshardn.stderr.on('close', () => {
      stderrClosed = true;
      logToFile('stderr stream closed');
    });

    syshardn.on('exit', (code) => {
      processExited = true;
      logToFile(`Process exited with code: ${code}`);
    });

    syshardn.on('close', (code) => {
      logToFile(`All streams closed, final exit code: ${code}`)
      logToFile(`Stdout length: ${stdout.length} chars`)
      logToFile(`Stdout preview (first 500 chars): ${stdout.substring(0, 500)}`)
      logToFile(`Stdout preview (last 500 chars): ${stdout.substring(Math.max(0, stdout.length - 500))}`)
      logToFile(`Process state: exit=${processExited}, stdout=${stdoutClosed}, stderr=${stderrClosed}`)
      
      if (code === 0 || code === 1) {
        if (reportPath) {
          // On Windows, the file might take longer to be flushed to disk
          // Wait for process to fully complete and file to be written
          const isWindows = process.platform === 'win32';
          const waitTime = isWindows ? 3000 : 500;
          const maxRetries = isWindows ? 10 : 1;
          
          logToFile(`Waiting ${waitTime}ms before checking for report file (Windows: ${isWindows})`);
          
          const checkFileWithRetry = (retryCount: number) => {
            setTimeout(() => {
              try {
                // Normalize path for Windows - resolve to absolute path
                const normalizedPath = require('path').resolve(reportPath);
                logToFile(`Normalized report path: ${normalizedPath} (attempt ${retryCount + 1}/${maxRetries})`);
                
                // Check if file exists
                if (fs.existsSync(normalizedPath)) {
                  logToFile(`Report file found at: ${normalizedPath}`);
                  const reportData = fs.readFileSync(normalizedPath, 'utf8')
                  const jsonData = JSON.parse(reportData)
                  logToFile('Successfully read and parsed local report file')
                  logToFile(`Report summary: ${jsonData.summary?.total || 'N/A'} checks`)
                  resolve({ success: true, data: jsonData })
                } else if (retryCount < maxRetries - 1) {
                  // Retry
                  logToFile(`File not found, retrying... (${retryCount + 1}/${maxRetries})`);
                  checkFileWithRetry(retryCount + 1);
                } else {
                  // Final attempt - exhausted retries
                  const tempDir = require('path').dirname(normalizedPath);
                  logToFile(`Report file not found at: ${normalizedPath} after ${maxRetries} attempts`);
                  logToFile(`Temp directory: ${tempDir}`);
                  
                  try {
                    const files = fs.readdirSync(tempDir);
                    const reportFiles = files.filter(f => f.startsWith('syshardn-report-'));
                    logToFile(`Found ${reportFiles.length} syshardn report files in temp dir:`);
                    reportFiles.forEach(f => logToFile(`  - ${f}`));
                    
                    // Try to find a report file with similar timestamp
                    const expectedFilename = require('path').basename(normalizedPath);
                    const foundFile = files.find(f => f.toLowerCase() === expectedFilename.toLowerCase());
                    
                    if (foundFile) {
                      const actualPath = require('path').join(tempDir, foundFile);
                      logToFile(`Found file with case-insensitive match: ${actualPath}`);
                      const reportData = fs.readFileSync(actualPath, 'utf8');
                      const jsonData = JSON.parse(reportData);
                      logToFile('Successfully read and parsed report file with corrected path');
                      resolve({ success: true, data: jsonData });
                      return;
                    }
                  } catch (listError) {
                    logToFile(`Failed to list temp directory: ${listError}`);
                  }
                  
                  // File not found - try to parse stdout instead
                  logToFile('Report file not found, attempting to parse stdout for JSON');
                  try {
                    // Try to find JSON in stdout
                    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                      const jsonData = JSON.parse(jsonMatch[0]);
                      logToFile('Successfully parsed JSON from stdout');
                      resolve({ success: true, data: jsonData });
                      return;
                    }
                  } catch (parseError) {
                    logToFile(`Failed to parse JSON from stdout: ${parseError}`);
                  }
                  
                  resolve({ success: false, data: null, error: 'Report file not found and no JSON in stdout' })
                }
              } catch (e) {
                logToFile(`Failed to read/parse report: ${e}`)
                resolve({ success: false, data: null, error: 'Failed to read report file' })
              }
            }, waitTime);
          };
          
          // Start the retry process
          checkFileWithRetry(0);
        } else {
          // No report path - parse from stdout
          logToFile('No report path provided, parsing stdout for JSON');
          try {
            // First try to parse the entire stdout as JSON
            try {
              const jsonData = JSON.parse(stdout);
              logToFile('Successfully parsed entire stdout as JSON');
              resolve({ success: true, data: jsonData });
              return;
            } catch (e) {
              // Not pure JSON, try to extract JSON from mixed output
              logToFile('Stdout is not pure JSON, attempting to extract JSON object');
            }
            
            // Look for JSON object in the output (could be after table output)
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonData = JSON.parse(jsonMatch[0]);
              logToFile('Successfully extracted and parsed JSON from stdout');
              resolve({ success: true, data: jsonData });
              return;
            }
            
            logToFile('No JSON found in stdout');
            resolve({ success: false, data: stdout, error: 'No JSON output found in command output' });
          } catch (e) {
            logToFile(`Failed to parse JSON from stdout: ${e}`);
            resolve({ success: false, data: stdout, error: 'Failed to parse JSON output' });
          }
        }
      } else {
        logToFile(`Command failed with exit code ${code}, stderr: ${stderr}`)
        resolve({ success: false, data: null, error: stderr || `Command failed with exit code ${code}` })
      }
    })

    syshardn.on('error', (err) => {
      logToFile(`Local process error: ${err.message}`)
      resolve({ success: false, data: null, error: err.message })
    })
  })
}

function setupIPCHandlers(): void {
  ipcMain.handle('get-system-info', async () => {
    try {
      if (appSettings.ssh.enabled && appSettings.ssh.host && appSettings.ssh.username) {
        try {
          const commands = [
            'uname -sr',
            'hostname',
            'uptime -p 2>/dev/null || echo "N/A"',
            'free -h 2>/dev/null | grep Mem | awk \'{print $2}\' || echo "N/A"',
            'df -h / 2>/dev/null | tail -1 | awk \'{print $2}\' || echo "N/A"'
          ]
          
          const results = await Promise.all(
            commands.map(cmd => executeSSHCommand(cmd, appSettings.ssh))
          )
          
          const [os, hostname, uptime, memory, disk] = results.map(r => 
            r.success && r.data ? r.data.trim() : 'N/A'
          )
          
          return {
            success: true,
            data: {
              os,
              hostname,
              uptime: uptime.replace('up ', ''),
              memory,
              disk,
              isRemote: true
            }
          }
        } catch (error: any) {
          logToFile(`Failed to get remote system info, using local: ${error.message}`)
        }
      }
      
      return {
        success: true,
        data: {
          os: `${os.type()} ${os.release()}`,
          hostname: os.hostname(),
          uptime: `${Math.floor(os.uptime() / 3600)} hours`,
          memory: `${(os.totalmem() / (1024 ** 3)).toFixed(1)} GB`,
          disk: 'N/A',
          isRemote: false
        }
      }
    } catch (error: any) {
      logToFile(`Error getting system info: ${error.message}`)
      return { success: false, error: error.message }
    }
  })

  let scanInProgress = false;
  
  ipcMain.handle('start-scan', async (_event, config: any) => {
    // Prevent concurrent scans
    if (scanInProgress) {
      logToFile('Scan already in progress, ignoring duplicate request');
      return { success: false, error: 'Scan already in progress' };
    }
    
    scanInProgress = true;
    logToFile('=== STARTING NEW SCAN ===');
    
    try {
      const args: string[] = []
      
      if (config.profile) {
        args.push('--level', config.profile)
      }
      
      if (config.categories && config.categories.length > 0) {
        args.push('--categories', config.categories.join(','))
      }
      
      if (config.rules && config.rules.length > 0) {
        args.push('--rules', config.rules.join(','))
      }

      const reportFileName = `syshardn-report-${Date.now()}.json`
      const reportPath = appSettings.ssh.enabled 
        ? `/tmp/${reportFileName}`
        : join(app.getPath('userData'), reportFileName)
      
      args.push('--report', reportPath)
      
      logToFile(`Scan config: ${JSON.stringify(config, null, 2)}`)
      logToFile(`Platform: ${process.platform}`)
      logToFile(`Report will be saved to: ${reportPath}`)
      logToFile(`userData directory: ${app.getPath('userData')}`)

      const result = await executeSyshardnCommand('check', args, reportPath);
      
      logToFile('=== SCAN COMPLETED ===');
      return result;
    } finally {
      scanInProgress = false;
    }
  })

  ipcMain.on('scan-progress-subscribe', (event) => {
    const interval = setInterval(() => {
      event.reply('scan-progress-update', {
        current: Math.floor(Math.random() * 100),
        total: 100
      })
    }, 1000)

    ipcMain.once('scan-progress-unsubscribe', () => {
      clearInterval(interval)
    })
  })

  ipcMain.handle('apply-hardening', async (_event, ruleIds: string[]) => {
    logToFile(`Applying hardening for rules: ${ruleIds.join(', ')}`)
    
    const args = ['--rules', ruleIds.join(','), '--force']
    
    logToFile(`Apply command args: ${JSON.stringify(args)}`)
    
    return executeSyshardnCommand('apply', args)
  })

  ipcMain.handle('list-rules', async () => {
    return executeSyshardnCommand('list-rules')
  })

  ipcMain.handle('get-backups', async () => {
    try {
      logToFile('Getting list of backups...')
      
      if (appSettings.ssh.enabled) {
        const listCommand = 'ls -1 ./backups/*.json 2>/dev/null || echo ""'
        const result = await executeSSHCommand(listCommand, appSettings.ssh)
        
        if (!result.success || !result.data) {
          return { success: true, data: [] }
        }
        
        const backupFiles = result.data.trim().split('\n').filter(f => f && f.endsWith('.json'))
        
        const backups = backupFiles.map(file => {
          const basename = file.split('/').pop()?.replace('.json', '') || ''
          const parts = basename.split('_')
          const ruleId = parts[0]
          const timestamp = parts.slice(1).join('_')
          
          return {
            id: basename,
            ruleId,
            timestamp,
            displayName: `${ruleId} - ${timestamp}`
          }
        }).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        
        logToFile(`Found ${backups.length} backup(s)`)
        return { success: true, data: backups }
      } else {
        const backupsDir = './backups'
        if (!fs.existsSync(backupsDir)) {
          return { success: true, data: [] }
        }
        
        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.json'))
        const backups = files.map(file => {
          const basename = file.replace('.json', '')
          const parts = basename.split('_')
          const ruleId = parts[0]
          const timestamp = parts.slice(1).join('_')
          
          return {
            id: basename,
            ruleId,
            timestamp,
            displayName: `${ruleId} - ${timestamp}`
          }
        }).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        
        return { success: true, data: backups }
      }
    } catch (error: any) {
      logToFile(`Error getting backups: ${error.message}`)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('rollback', async (_event, ruleId: string) => {
    const args = ['--rule-id', ruleId, '--latest', '--force']
    return executeSyshardnCommand('rollback', args)
  })

  ipcMain.handle('generate-report', async (_event, _scanId: string, format: string) => {
    try {
      const timestamp = Date.now()
      const outputFileName = `syshardn-report-${timestamp}.${format}`
      
      const outputPath = appSettings.ssh.enabled 
        ? `/tmp/${outputFileName}`
        : join(app.getPath('userData'), outputFileName)
      
      const args = ['--format', format, '--output', outputPath]
      
      logToFile(`Generating report: format=${format}, output=${outputPath}`)
      
      const result = await executeSyshardnCommand('report', args)
      
      if (!result.success) {
        return result
      }
      
      if (appSettings.ssh.enabled) {
        logToFile(`Downloading report from remote: ${outputPath}`)
        
        const localPath = join(app.getPath('downloads'), outputFileName)
        const scpCommand = `scp -P ${appSettings.ssh.port} -o StrictHostKeyChecking=no ${appSettings.ssh.privateKeyPath ? `-i ${appSettings.ssh.privateKeyPath}` : ''} ${appSettings.ssh.username}@${appSettings.ssh.host}:${outputPath} ${localPath}`
        
        logToFile(`SCP command: ${scpCommand}`)
        
        return new Promise((resolve) => {
          const scp = spawn('scp', [
            '-P', appSettings.ssh.port.toString(),
            '-o', 'StrictHostKeyChecking=no',
            ...(appSettings.ssh.privateKeyPath ? ['-i', appSettings.ssh.privateKeyPath] : []),
            `${appSettings.ssh.username}@${appSettings.ssh.host}:${outputPath}`,
            localPath
          ])
          
          let stderr = ''
          
          scp.stderr.on('data', (data) => {
            stderr += data.toString()
            logToFile(`SCP stderr: ${data.toString()}`)
          })
          
          scp.on('close', (code) => {
            if (code === 0) {
              logToFile(`Report downloaded to: ${localPath}`)
              shell.showItemInFolder(localPath)
              resolve({ success: true, data: { path: localPath, format } })
            } else {
              logToFile(`SCP failed: ${stderr}`)
              resolve({ success: false, error: `Failed to download report: ${stderr}` })
            }
          })
          
          scp.on('error', (err) => {
            logToFile(`SCP error: ${err.message}`)
            resolve({ success: false, error: err.message })
          })
        })
      } else {
        shell.showItemInFolder(outputPath)
        return { success: true, data: { path: outputPath, format } }
      }
    } catch (error: any) {
      logToFile(`Report generation error: ${error.message}`)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cancel-operation', async () => {
    return { success: true }
  })

  ipcMain.handle('get-settings', async () => {
    try {
      console.log('Getting settings:', appSettings);
      return { success: true, data: appSettings };
    } catch (error: any) {
      console.error('Failed to get settings:', error);
      return { success: false, error: error.message };
    }
  })

  ipcMain.handle('save-settings', async (_event, settings: Partial<AppSettings>) => {
    try {
      console.log('Saving settings:', settings);
      appSettings = { ...appSettings, ...settings };
      saveSettingsToFile();
      console.log('Settings saved to:', settingsPath);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      return { success: false, error: error.message };
    }
  })

  ipcMain.handle('test-ssh-connection', async (_event, config: AppSettings['ssh']) => {
    return new Promise((resolve) => {
      try {
        console.log('Testing SSH connection with config:', { 
          host: config.host, 
          port: config.port, 
          username: config.username,
          hasPassword: !!config.password,
          hasKey: !!config.privateKeyPath 
        });

        const testCommand = 'echo "SSH_TEST_OK"';
        
        const sshArgs: string[] = [
          '-p', config.port.toString(),
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10',
          '-o', 'BatchMode=yes'
        ];

        if (config.privateKeyPath && !config.password) {
          const expandedPath = config.privateKeyPath.replace('~', process.env.HOME || '');
          sshArgs.push('-i', expandedPath);
        }

        sshArgs.push(`${config.username}@${config.host}`);
        sshArgs.push(testCommand);

        let stdout = '';
        let stderr = '';

        if (config.password) {
          const sshpassArgs = ['-p', config.password, 'ssh', ...sshArgs];
          const sshpassCmd = spawn('sshpass', sshpassArgs);
          
          sshpassCmd.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          sshpassCmd.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          sshpassCmd.on('close', (code) => {
            console.log('sshpass result:', { code, stdout, stderr });
            if (code === 0 && stdout.includes('SSH_TEST_OK')) {
              resolve({ success: true });
            } else {
              resolve({ 
                success: false, 
                error: stderr || `Connection failed (code: ${code}). Make sure sshpass is installed: brew install hudochenkov/sshpass/sshpass` 
              });
            }
          });

          sshpassCmd.on('error', (err) => {
            console.error('sshpass error:', err);
            resolve({ 
              success: false, 
              error: `sshpass error: ${err.message}. Install with: brew install hudochenkov/sshpass/sshpass` 
            });
          });
        } else {
          const sshCmd = spawn('ssh', sshArgs);
          
          sshCmd.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          sshCmd.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          sshCmd.on('close', (code) => {
            console.log('ssh result:', { code, stdout, stderr });
            if (code === 0 && stdout.includes('SSH_TEST_OK')) {
              resolve({ success: true });
            } else {
              resolve({ 
                success: false, 
                error: stderr || `Connection failed (code: ${code}). Check your SSH key permissions: chmod 600 ${config.privateKeyPath}` 
              });
            }
          });

          sshCmd.on('error', (err) => {
            console.error('ssh error:', err);
            resolve({ success: false, error: `SSH error: ${err.message}` });
          });
        }
      } catch (error: any) {
        console.error('Test connection error:', error);
        resolve({ success: false, error: error.message });
      }
    });
  })

  ipcMain.handle('get-logs', async () => {
    try {
      if (fs.existsSync(logFilePath)) {
        const logs = fs.readFileSync(logFilePath, 'utf8')
        return { success: true, data: logs }
      }
      return { success: true, data: 'No logs available yet.' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('open-logs-folder', async () => {
    try {
      await shell.openPath(logsPath)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('clear-logs', async () => {
    try {
      if (fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, '')
        logToFile('=== Logs Cleared ===')
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  setupLogging()
  logToFile('=== Application Started ===')
  
  loadSettings()
  logToFile(`Settings loaded: ${JSON.stringify(appSettings, null, 2)}`)

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  setupIPCHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
