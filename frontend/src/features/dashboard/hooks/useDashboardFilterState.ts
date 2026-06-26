// @ts-nocheck
import { usePersistentState } from '../../../hooks/usePersistentState';

export function useDashboardFilterState(remoteSettings = null) {
  const [datePreset, setDatePreset] = usePersistentState('filter_datePreset', 'all', remoteSettings);
  const [dateStart, setDateStart] = usePersistentState('filter_dateStart', '', remoteSettings);
  const [dateEnd, setDateEnd] = usePersistentState('filter_dateEnd', '', remoteSettings);
  const [excludeWeekends, setExcludeWeekends] = usePersistentState('filter_excludeWeekends', false, remoteSettings);
  const [selectedFiles, setSelectedFiles] = usePersistentState('filter_selectedFiles', [], remoteSettings);
  const [selectedSheets, setSelectedSheets] = usePersistentState('filter_selectedSheets', [], remoteSettings);
  const [systemDatePreset, setSystemDatePreset] = usePersistentState('system_filter_datePreset', 'all', remoteSettings);
  const [systemDateStart, setSystemDateStart] = usePersistentState('system_filter_dateStart', '', remoteSettings);
  const [systemDateEnd, setSystemDateEnd] = usePersistentState('system_filter_dateEnd', '', remoteSettings);
  const [systemExcludeWeekends, setSystemExcludeWeekends] = usePersistentState('system_filter_excludeWeekends', false, remoteSettings);
  const [systemSelectedFiles, setSystemSelectedFiles] = usePersistentState('system_filter_selectedFiles', [], remoteSettings);
  const [systemSelectedSheets, setSystemSelectedSheets] = usePersistentState('system_filter_selectedSheets', [], remoteSettings);
  const [selectedUsers, setSelectedUsers] = usePersistentState('filter_selectedUsers', [], remoteSettings);
  const [selectedSegmentTypes, setSelectedSegmentTypes] = usePersistentState('filter_selectedSegmentTypes', [], remoteSettings);
  const [showIdle, setShowIdle] = usePersistentState('filter_showIdle', true, remoteSettings);
  const [showWorkloadIdle, setShowWorkloadIdle] = usePersistentState('filter_showWorkloadIdle', false, remoteSettings);
  const [showWorkloadSystem, setShowWorkloadSystem] = usePersistentState('filter_showWorkloadSystem', false, remoteSettings);
  const [pinnedFiles, setPinnedFiles] = usePersistentState('filter_pinnedFiles', [], remoteSettings);
  const [pinnedSheets, setPinnedSheets] = usePersistentState('filter_pinnedSheets', [], remoteSettings);
  const [activeDocumentFile, setActiveDocumentFile] = usePersistentState('filter_activeDocumentFile', '', remoteSettings);
  const [systemPinnedFiles, setSystemPinnedFiles] = usePersistentState('system_filter_pinnedFiles', [], remoteSettings);
  const [systemPinnedSheets, setSystemPinnedSheets] = usePersistentState('system_filter_pinnedSheets', [], remoteSettings);
  const [systemActiveDocumentFile, setSystemActiveDocumentFile] = usePersistentState('system_filter_activeDocumentFile', '', remoteSettings);
  const [systemSecondSelectedFiles, setSystemSecondSelectedFiles] = usePersistentState('system_filter_secondSelectedFiles', [], remoteSettings);
  const [systemSecondSelectedSheets, setSystemSecondSelectedSheets] = usePersistentState('system_filter_secondSelectedSheets', [], remoteSettings);
  const [systemSecondPinnedFiles, setSystemSecondPinnedFiles] = usePersistentState('system_filter_secondPinnedFiles', [], remoteSettings);
  const [systemSecondPinnedSheets, setSystemSecondPinnedSheets] = usePersistentState('system_filter_secondPinnedSheets', [], remoteSettings);
  const [systemSecondActiveDocumentFile, setSystemSecondActiveDocumentFile] = usePersistentState('system_filter_secondActiveDocumentFile', '', remoteSettings);
  const [systemFirstDocumentFilterName, setSystemFirstDocumentFilterName] = usePersistentState('system_filter_firstDocumentFilterName', 'First documents', remoteSettings);
  const [systemSecondDocumentFilterName, setSystemSecondDocumentFilterName] = usePersistentState('system_filter_secondDocumentFilterName', 'Second Documents', remoteSettings);
  const [systemSelectedSheetsSet2, setSystemSelectedSheetsSet2] = usePersistentState('system_filter_selectedSheetsSet2', [], remoteSettings);
  const [systemSecondSelectedSheetsSet2, setSystemSecondSelectedSheetsSet2] = usePersistentState('system_filter_secondSelectedSheetsSet2', [], remoteSettings);
  const [systemDocument1Set1Name, setSystemDocument1Set1Name] = usePersistentState('system_filter_document1Set1Name', 'Set 1', remoteSettings);
  const [systemDocument1Set2Name, setSystemDocument1Set2Name] = usePersistentState('system_filter_document1Set2Name', 'Set 2', remoteSettings);
  const [systemDocument2Set1Name, setSystemDocument2Set1Name] = usePersistentState('system_filter_document2Set1Name', 'Set 1', remoteSettings);
  const [systemDocument2Set2Name, setSystemDocument2Set2Name] = usePersistentState('system_filter_document2Set2Name', 'Set 2', remoteSettings);
  const [systemDocumentsSwapped, setSystemDocumentsSwapped] = usePersistentState('system_filter_documentsSwapped', false, remoteSettings);
  const [systemDocumentPresets, setSystemDocumentPresets] = usePersistentState('system_filter_documentPresets', [], remoteSettings);
  const [fileDisplayNames, setFileDisplayNames] = usePersistentState('filter_fileDisplayNames', {}, remoteSettings);
  const [pageDisplayNames, setPageDisplayNames] = usePersistentState('filter_pageDisplayNames', {}, remoteSettings);

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
    systemSelectedSheetsSet2, setSystemSelectedSheetsSet2,
    systemSecondSelectedSheetsSet2, setSystemSecondSelectedSheetsSet2,
    systemDocument1Set1Name, setSystemDocument1Set1Name,
    systemDocument1Set2Name, setSystemDocument1Set2Name,
    systemDocument2Set1Name, setSystemDocument2Set1Name,
    systemDocument2Set2Name, setSystemDocument2Set2Name,
    systemDocumentsSwapped, setSystemDocumentsSwapped,
    systemDocumentPresets, setSystemDocumentPresets,
    fileDisplayNames, setFileDisplayNames,
    pageDisplayNames, setPageDisplayNames,
  };
}
