import { useMemo, useState } from 'react';
import { usePersistentState } from './usePersistentState.js';
import { requestJson } from '@/lib/api.js';
import { createDefaultSheetPerformanceChartSettings } from '@/features/dashboard/utils/sheetPerformanceCharts.js';

export function useAppController(dashboard) {
  const {
    workloadContributors,
    showWorkloadSystem,
    refreshAll,
    setErrorMessage,
  } = dashboard;

  const [activeView, setActiveView] = useState('dashboard');
  const [openDropdown, setOpenDropdown] = useState('');
  const [expandedVisualizationId, setExpandedVisualizationId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistentState('sidebar_collapsed', false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [segmentTypeSearchText, setSegmentTypeSearchText] = useState('');
  const [documentFileSearch, setDocumentFileSearch] = useState('');
  const [documentSheetSearch, setDocumentSheetSearch] = useState('');
  const [systemDocumentFileSearch, setSystemDocumentFileSearch] = useState('');
  const [systemDocumentSheetSearch, setSystemDocumentSheetSearch] = useState('');
  const [sheetPerformanceChartSettings, setSheetPerformanceChartSettings] = useState(() => createDefaultSheetPerformanceChartSettings());
  const [showProcessBreakdownIdle, setShowProcessBreakdownIdle] = usePersistentState('filter_showProcessBreakdownIdle', true);
  const [mergeReviewAndEdit, setMergeReviewAndEdit] = usePersistentState('chart_mergeReviewAndEdit', true);
  const [mergeSpread, setMergeSpread] = usePersistentState('chart_mergeSpread', false);
  const [ganttSingleLaneMode, setGanttSingleLaneMode] = usePersistentState('filter_ganttSingleLaneMode', false);
  const [showSystemLane, setShowSystemLane] = usePersistentState('filter_showSystemLane', true);
  const [showStarMarkers, setShowStarMarkers] = usePersistentState('filter_showStarMarkers', true);
  const [ganttCollapseGaps, setGanttCollapseGaps] = usePersistentState('filter_ganttCollapseGaps', false);
  const [showGanttLegend, setShowGanttLegend] = usePersistentState('filter_showGanttLegend', true);

  const workloadVisibleRows = useMemo(() => {
    const filtered = workloadContributors.filter((row) => showWorkloadSystem || row.user !== 'System');
    const total = filtered.reduce((sum, row) => sum + row.totalSeconds, 0);
    return filtered.map((row) => ({ ...row, share: total > 0 ? row.totalSeconds / total : 0 }));
  }, [workloadContributors, showWorkloadSystem]);

  const handleUploadFiles = async (files) => {
    let uploadSucceeded = false;
    setUploading(true);
    try {
      const payloadFiles = await Promise.all(files.map(async (file) => {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.onabort = () => reject(new Error(`File read was aborted: ${file.name}`));
          reader.readAsDataURL(file);
        });
        return { name: file.name, contentBase64: base64 };
      }));
      await requestJson('/api/upload', { method: 'POST', body: JSON.stringify({ files: payloadFiles }) });
      uploadSucceeded = true;
    } catch (error) {
      setErrorMessage(error.message, error);
    } finally {
      setUploading(false);
    }

    if (uploadSucceeded) {
      // Refresh UI after upload without blocking upload state on optional sheet sync.
      refreshAll({ syncFirst: false, backgroundSync: true }).catch((error) => {
        setErrorMessage(error.message || 'Refresh failed', error);
      });
    }
  };

  const handleDeleteSource = async (id) => {
    try {
      await requestJson(`/api/sources/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshAll({ syncFirst: false });
    } catch (error) {
      setErrorMessage(error.message, error);
    }
  };

  const handleConnectGSheet = async (url) => {
    try {
      await requestJson('/api/gsheet/connect', { method: 'POST', body: JSON.stringify({ url }) });
      await refreshAll({ syncFirst: false });
    } catch (error) {
      setErrorMessage(error.message, error);
    }
  };

  const handleDisconnectGSheet = async (id) => {
    try {
      await requestJson(`/api/gsheet/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshAll({ syncFirst: false });
    } catch (error) {
      setErrorMessage(error.message, error);
    }
  };

  return {
    activeView,
    setActiveView,
    openDropdown,
    setOpenDropdown,
    expandedVisualizationId,
    setExpandedVisualizationId,
    uploading,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    userSearchText,
    setUserSearchText,
    segmentTypeSearchText,
    setSegmentTypeSearchText,
    documentFileSearch,
    setDocumentFileSearch,
    documentSheetSearch,
    setDocumentSheetSearch,
    systemDocumentFileSearch,
    setSystemDocumentFileSearch,
    systemDocumentSheetSearch,
    setSystemDocumentSheetSearch,
    sheetPerformanceChartSettings,
    setSheetPerformanceChartSettings,
    showProcessBreakdownIdle,
    setShowProcessBreakdownIdle,
    mergeReviewAndEdit,
    setMergeReviewAndEdit,
    mergeSpread,
    setMergeSpread,
    ganttSingleLaneMode,
    setGanttSingleLaneMode,
    showSystemLane,
    setShowSystemLane,
    showStarMarkers,
    setShowStarMarkers,
    ganttCollapseGaps,
    setGanttCollapseGaps,
    showGanttLegend,
    setShowGanttLegend,
    workloadVisibleRows,
    handleUploadFiles,
    handleDeleteSource,
    handleConnectGSheet,
    handleDisconnectGSheet,
  };
}
