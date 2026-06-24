export interface Segment {
  segment_id: string;
  document_id: string;
  source_file: string;
  user_name: string;
  segment_type: string;
  timestamp: string;
  duration_ms: number;
  [key: string]: any; // Catch-all for other fields
}

export interface KpiData {
  totalDocs: number;
  activeUsers: number;
  totalTimeMs: number;
  averageTimeMs: number;
  averageTimePerDocMs: number;
  totalSegments: number;
  docsCreated: number;
  docsModified: number;
  docsReviewed: number;
  reworkCount: number;
  idleTimeMs: number;
  processingTimeMs: number;
  typingTimeMs: number;
  weekendExcludedCount: number;
  [key: string]: any;
}

export interface DashboardState {
  sources: any[];
  gsheetConnections: any[];
  settings: Record<string, any>;
  performance: any;
  healthInfo: any;
  debugInfo: any;
  loading: boolean;
  syncing: boolean;
  errorMessage: string | null;
  supabaseError: string | null;
  backendWarning: string | null;
  isInitialLoadDone: boolean;

  // Filter State
  datePreset: string;
  dateStart: string | null;
  dateEnd: string | null;
  selectedFiles: string[];
  selectedSheets: string[];
  selectedUsers: string[];
  selectedSegmentTypes: string[];
  showIdle: boolean;
  showWorkloadIdle: boolean;
  
  systemDatePreset: string;
  systemDateStart: string | null;
  systemDateEnd: string | null;
  systemSelectedFiles: string[];
  systemSelectedSheets: string[];
  systemSecondSelectedFiles: string[];
  systemSecondSelectedSheets: string[];
  systemExcludeWeekends: boolean;

  // Worker Computed Data
  parsedSegments: Segment[];
  filteredBaseSegments: Segment[];
  chartBaseSegments: Segment[];
  kpiData: KpiData;
  dateRangeBounds: { minTs: number; maxTs: number };
  segmentTypeOptions: string[];
  userOptions: { files: string[]; sheets: string[]; users: string[] };
  
  refreshAll: () => Promise<void>;
  syncGSheet: (params?: any) => Promise<any>;
  [key: string]: any;
}

export interface DashboardUIState {
  currentView: 'dashboard' | 'data-management' | 'system-performance' | 'sheet-performance';
  setCurrentView: (view: 'dashboard' | 'data-management' | 'system-performance' | 'sheet-performance') => void;
  expandedChart: string | null;
  setExpandedChart: (chartId: string | null) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}
