# SysHardn GUI

A modern, cross-platform desktop GUI application for SysHardn - a security hardening tool for CIS Benchmark compliance scanning.

![SysHardn GUI](https://img.shields.io/badge/Electron-React-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

SysHardn GUI provides an intuitive interface for system administrators to scan, analyze, and harden their systems according to CIS Benchmarks. Built with Electron and React, it wraps the SysHardn CLI tool with a user-friendly desktop application.

## Features

### 🏠 **Home Dashboard**
- Clean welcome screen for first-time users
- System information display (OS, version, hostname)
- Compliance score overview after first scan
- Recent scans history
- Quick access to scan and rollback features

### ⚙️ **Scan Configuration**
- Three hardening profiles: Basic, Moderate, Strict
- Optional category filtering (filesystem, services, network, etc.)
- Visual profile cards with feature descriptions

### 📊 **Scanning Progress**
- Real-time progress bar with percentage
- Live feed of recent rule checks
- Cancel scan option

### 📈 **Scan Results**
- Comprehensive summary with compliance score
- Interactive issue table with filtering and search
- Fix All Issues or individual fix buttons
- Download reports

### 🔧 **Fix Confirmation**
- Modal dialog before applying changes
- List of rules to be fixed with warnings

### ⚡ **Applying Hardening**
- Real-time progress and status updates
- Success/failure indicators
- Detailed application log

### 🔄 **Rollback Interface**
- List of available backups
- Confirmation modal with warnings
- Progress indication during rollback

### 🌐 **Remote SSH Support**
- Connect to remote servers via SSH
- Run SysHardn scans and hardening on remote systems
- Manage server security from your desktop

## Tech Stack

- **Framework**: Electron.js with React
- **UI Library**: Ant Design (antd) 
- **State Management**: Zustand
- **Language**: TypeScript
- **Build Tool**: Electron Vite
- **CLI Integration**: Node.js child_process

## Prerequisites

- Node.js 18+ and npm/yarn
- **SysHardn CLI tool** - Download the latest release from [syshardn releases](https://github.com/Aswinr24/syshardn/releases)
  - After downloading, place the `syshardn` executable in your PATH or in the application directory

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm run dev
```

## Building

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```
## IPC Communication

Available APIs via `window.api`:

- `getSystemInfo()` - Retrieve system information
- `startScan(config)` - Start a security scan
- `applyHardening(ruleIds)` - Apply hardening fixes
- `listRules()` - Get available rules
- `getBackups()` - Retrieve backup list
- `rollback(backupId)` - Restore from backup
- `generateReport(scanId, format)` - Generate report
- `cancelOperation()` - Cancel ongoing operation

## Supported Platforms

- **Windows**: 10, 11
- **macOS**: 10.15+
- **Linux**: Ubuntu 20.04+, CentOS/RHEL 8+

## License

[MIT License](LICENSE)

---
