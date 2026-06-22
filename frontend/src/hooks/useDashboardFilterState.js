import { usePersistentState } from './usePersistentState.js';

export function useDashboardFilterState() {
  const [datePreset, setDatePreset] = usePersistentState('filter_datePreset', 'all');
  const [dateStart, setDateStart] = usePersistentState('filter_dateStart', '');
  const [dateEnd, setDateEnd] = usePersistentState('filter_dateEnd', '');
  const [excludeWeekends, setExcludeWeekends] = usePersistentState('filter_excludeWeekends', false);
  const [selectedFiles, setSelectedFiles] = usePersistentState('filter_selectedFiles', []);
  const [selectedSheets, setSelectedSheets] = usePersistentState('filter_selectedSheets', []);
  const [systemDatePreset, setSystemDatePreset] = usePersistentState('system_filter_datePreset', 'all');
  const [systemDateStart, setSystemDateStart] = usePersistentState('system_filter_dateStart', '');
  const [systemDateEnd, setSystemDateEnd] = usePersistentState('system_filter_dateEnd', '');
  const [systemExcludeWeekends, setSystemExcludeWeekends] = usePersistentState('system_filter_excludeWeekends', false);
  const [systemSelectedFiles, setSystemSelectedFiles] = usePersistentState('system_filter_selectedFiles', []);
  const [systemSelectedSheets, setSystemSelectedSheets] = usePersistentState('system_filter_selectedSheets', []);
  const [selectedUsers, setSelectedUsers] = usePersistentState('filter_selectedUsers', []);
  const [selectedSegmentTypes, setSelectedSegmentTypes] = usePersistentState('filter_selectedSegmentTypes', []);
  const [showIdle, setShowIdle] = usePersistentState('filter_showIdle', false);
  const [showWorkloadIdle, setShowWorkloadIdle] = usePersistentState('filter_showWorkloadIdle', false);
  const [showWorkloadSystem, setShowWorkloadSystem] = usePersistentState('filter_showWorkloadSystem', false);
  const [pinnedFiles, setPinnedFiles] = usePersistentState('filter_pinnedFiles', []);
  const [pinnedSheets, setPinnedSheets] = usePersistentState('filter_pinnedSheets', []);
  const [activeDocumentFile, setActiveDocumentFile] = usePersistentState('filter_activeDocumentFile', '');
  const [systemPinnedFiles, setSystemPinnedFiles] = usePersistentState('system_filter_pinnedFiles', []);
  const [systemPinnedSheets, setSystemPinnedSheets] = usePersistentState('system_filter_pinnedSheets', []);
  const [systemActiveDocumentFile, setSystemActiveDocumentFile] = usePersistentState('system_filter_activeDocumentFile', '');
  const [systemSecondSelectedFiles, setSystemSecondSelectedFiles] = usePersistentState('system_filter_secondSelectedFiles', []);
  const [systemSecondSelectedSheets, setSystemSecondSelectedSheets] = usePersistentState('system_filter_secondSelectedSheets', []);
  const [systemSecondPinnedFiles, setSystemSecondPinnedFiles] = usePersistentState('system_filter_secondPinnedFiles', []);
  const [systemSecondPinnedSheets, setSystemSecondPinnedSheets] = usePersistentState('system_filter_secondPinnedSheets', []);
  const [systemSecondActiveDocumentFile, setSystemSecondActiveDocumentFile] = usePersistentState('system_filter_secondActiveDocumentFile', '');
  const [systemFirstDocumentFilterName, setSystemFirstDocumentFilterName] = usePersistentState('system_filter_firstDocumentFilterName', 'First documents');
  const [systemSecondDocumentFilterName, setSystemSecondDocumentFilterName] = usePersistentState('system_filter_secondDocumentFilterName', 'Second Documents');
  const [fileDisplayNames, setFileDisplayNames] = usePersistentState('filter_fileDisplayNames', {});
  const [pageDisplayNames, setPageDisplayNames] = usePersistentState('filter_pageDisplayNames', {});

  return {
    datePreset, setDatePreset,
    dateStart, setDateStart,
    dateEnd, setDateEnd,
    excludeWeekends, setExcludeWeekends,
    selectedFiles, setSelectedFiles,
    selectedSheets, setSelectedSheets,
    systemDatePreset, setSystemDatePreset,
    systemDateStart, setSystemDateStart,
    systemDateEnd, setSystemDateEnd,
    systemExcludeWeekends, setSystemExcludeWeekends,
    systemSelectedFiles, setSystemSelectedFiles,
    systemSelectedSheets, setSystemSelectedSheets,
    selectedUsers, setSelectedUsers,
    selectedSegmentTypes, setSelectedSegmentTypes,
    showIdle, setShowIdle,
    showWorkloadIdle, setShowWorkloadIdle,
    showWorkloadSystem, setShowWorkloadSystem,
    pinnedFiles, setPinnedFiles,
    pinnedSheets, setPinnedSheets,
    activeDocumentFile, setActiveDocumentFile,
    systemPinnedFiles, setSystemPinnedFiles,
    systemPinnedSheets, setSystemPinnedSheets,
    systemActiveDocumentFile, setSystemActiveDocumentFile,
    systemSecondSelectedFiles, setSystemSecondSelectedFiles,
    systemSecondSelectedSheets, setSystemSecondSelectedSheets,
    systemSecondPinnedFiles, setSystemSecondPinnedFiles,
    systemSecondPinnedSheets, setSystemSecondPinnedSheets,
    systemSecondActiveDocumentFile, setSystemSecondActiveDocumentFile,
    systemFirstDocumentFilterName, setSystemFirstDocumentFilterName,
    systemSecondDocumentFilterName, setSystemSecondDocumentFilterName,
    fileDisplayNames, setFileDisplayNames,
    pageDisplayNames, setPageDisplayNames,
  };
}
