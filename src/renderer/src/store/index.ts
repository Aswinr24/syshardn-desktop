import { create } from 'zustand';
import { ScanResult, SystemInfo, Backup, RuleCheck, HardeningProfile } from '../types';

interface AppState {
  // System info
  systemInfo: SystemInfo | null;
  setSystemInfo: (info: SystemInfo) => void;

  // Current scan state
  isScanning: boolean;
  scanProgress: number;
  currentScanRule: RuleCheck | null;
  recentChecks: RuleCheck[];
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: number | ((prev: number) => number)) => void;
  setCurrentScanRule: (rule: RuleCheck | null) => void;
  addRecentCheck: (rule: RuleCheck) => void;
  clearRecentChecks: () => void;

  // Scan results
  currentScanResult: ScanResult | null;
  scanHistory: ScanResult[];
  setCurrentScanResult: (result: ScanResult | null) => void;
  addScanToHistory: (result: ScanResult) => void;

  // Apply hardening state
  isApplying: boolean;
  applyProgress: number;
  currentApplyRule: RuleCheck | null;
  setIsApplying: (applying: boolean) => void;
  setApplyProgress: (progress: number) => void;
  setCurrentApplyRule: (rule: RuleCheck | null) => void;

  // Backups
  backups: Backup[];
  setBackups: (backups: Backup[]) => void;

  // UI state
  selectedProfile: HardeningProfile;
  selectedCategories: string[];
  selectedRules: string[];
  setSelectedProfile: (profile: HardeningProfile) => void;
  setSelectedCategories: (categories: string[]) => void;
  setSelectedRules: (rules: string[]) => void;

  // Navigation
  currentPage: 'home' | 'config' | 'scanning' | 'results' | 'applying' | 'rollback' | 'settings' | 'logs';
  setCurrentPage: (page: AppState['currentPage']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // System info
  systemInfo: null,
  setSystemInfo: (info) => set({ systemInfo: info }),

  // Current scan state
  isScanning: false,
  scanProgress: 0,
  currentScanRule: null,
  recentChecks: [],
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanProgress: (progress) =>
    set((state) => ({
      scanProgress: typeof progress === 'function' ? progress(state.scanProgress) : progress,
    })),
  setCurrentScanRule: (rule) => set({ currentScanRule: rule }),
  addRecentCheck: (rule) =>
    set((state) => ({
      recentChecks: [rule, ...state.recentChecks].slice(0, 5),
    })),
  clearRecentChecks: () => set({ recentChecks: [] }),

  // Scan results
  currentScanResult: null,
  scanHistory: [],
  setCurrentScanResult: (result) => set({ currentScanResult: result }),
  addScanToHistory: (result) =>
    set((state) => ({
      scanHistory: [result, ...state.scanHistory].slice(0, 10),
    })),

  // Apply hardening state
  isApplying: false,
  applyProgress: 0,
  currentApplyRule: null,
  setIsApplying: (applying) => set({ isApplying: applying }),
  setApplyProgress: (progress) => set({ applyProgress: progress }),
  setCurrentApplyRule: (rule) => set({ currentApplyRule: rule }),

  // Backups
  backups: [],
  setBackups: (backups) => set({ backups }),

  // UI state
  selectedProfile: 'moderate',
  selectedCategories: [],
  selectedRules: [],
  setSelectedProfile: (profile) => set({ selectedProfile: profile }),
  setSelectedCategories: (categories) => set({ selectedCategories: categories }),
  setSelectedRules: (rules) => set({ selectedRules: rules }),

  // Navigation
  currentPage: 'home',
  setCurrentPage: (page) => set({ currentPage: page }),
}));
