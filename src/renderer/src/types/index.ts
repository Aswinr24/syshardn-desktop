// Type definitions for SysHardn GUI

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type RuleStatus = 'pass' | 'fail' | 'warning' | 'pending' | 'applying' | 'error';
export type HardeningProfile = 'basic' | 'moderate' | 'strict';

export interface SystemInfo {
  os: string;
  version?: string;
  hostname: string;
  uptime?: string;
  memory?: string;
  disk?: string;
  isRemote?: boolean;
  lastScanTime?: string;
  complianceScore?: number;
}

export interface RuleCheck {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: SeverityLevel;
  status: RuleStatus;
  currentValue?: string;
  expectedValue?: string;
  impact: string;
  remediation?: string;
  message?: string; // Optional message field from API
}

export interface ScanResult {
  id: string;
  timestamp: string;
  profile: HardeningProfile;
  duration: number;
  complianceScore: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  rules: RuleCheck[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface Backup {
  id: string;
  timestamp: string;
  description: string;
  rulesCount: number;
  size: string;
}

export interface ScanConfig {
  profile: HardeningProfile;
  categories?: string[];
  rules?: string[];
}

export interface ApplyResult {
  ruleId: string;
  status: 'success' | 'failure' | 'skipped';
  message?: string;
}

export interface ProgressUpdate {
  current: number;
  total: number;
  percentage: number;
  currentRule?: RuleCheck;
  recentChecks?: RuleCheck[];
}

export interface RollbackResult {
  success: boolean;
  message: string;
  rulesRestored?: number;
}
