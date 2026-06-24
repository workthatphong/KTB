// @ts-nocheck
import { useState, useCallback } from 'react';
import {
  togglePinInList,
  updateSelectionForFile,
  updateSelectionForSheet,
} from './utils';

export const useFilterState = ({ dashboard, filterMode }) => {
  const isSystemFilterMode = filterMode === 'system-performance';

  const datePreset = isSystemFilterMode ? dashboard.systemDatePreset : dashboard.datePreset;
  const setDatePreset = isSystemFilterMode ? dashboard.setSystemDatePreset : dashboard.setDatePreset;
  const dateStart = isSystemFilterMode ? dashboard.systemDateStart : dashboard.dateStart;
  const setDateStart = isSystemFilterMode ? dashboard.setSystemDateStart : dashboard.setDateStart;
  const dateEnd = isSystemFilterMode ? dashboard.systemDateEnd : dashboard.dateEnd;
  const setDateEnd = isSystemFilterMode ? dashboard.setSystemDateEnd : dashboard.setDateEnd;
  const excludeWeekends = isSystemFilterMode ? dashboard.systemExcludeWeekends : dashboard.excludeWeekends;
  const setExcludeWeekends = isSystemFilterMode ? dashboard.setSystemExcludeWeekends : dashboard.setExcludeWeekends;
  const weekendExcludedCount = isSystemFilterMode ? dashboard.systemWeekendExcludedCount : dashboard.weekendExcludedCount;

  const selectedFiles = isSystemFilterMode ? dashboard.systemSelectedFiles : dashboard.selectedFiles;
  const setSelectedFiles = isSystemFilterMode ? dashboard.setSystemSelectedFiles : dashboard.setSelectedFiles;
  const selectedSheets = isSystemFilterMode ? dashboard.systemSelectedSheets : dashboard.selectedSheets;
  const setSelectedSheets = isSystemFilterMode ? dashboard.setSystemSelectedSheets : dashboard.setSelectedSheets;
  const pinnedFiles = isSystemFilterMode ? dashboard.systemPinnedFiles : dashboard.pinnedFiles;
  const setPinnedFiles = isSystemFilterMode ? dashboard.setSystemPinnedFiles : dashboard.setPinnedFiles;
  const pinnedSheets = isSystemFilterMode ? dashboard.systemPinnedSheets : dashboard.pinnedSheets;
  const setPinnedSheets = isSystemFilterMode ? dashboard.setSystemPinnedSheets : dashboard.setPinnedSheets;
  const activeDocumentFile = isSystemFilterMode ? dashboard.systemActiveDocumentFile : dashboard.activeDocumentFile;
  const setActiveDocumentFile = isSystemFilterMode ? dashboard.setSystemActiveDocumentFile : dashboard.setActiveDocumentFile;
  const documentTree = isSystemFilterMode ? dashboard.systemDocumentTree : dashboard.documentTree;

  const secondSelectedFiles = dashboard.systemSecondSelectedFiles || [];
  const setSecondSelectedFiles = dashboard.setSystemSecondSelectedFiles;
  const secondSelectedSheets = dashboard.systemSecondSelectedSheets || [];
  const setSecondSelectedSheets = dashboard.setSystemSecondSelectedSheets;
  const secondPinnedFiles = dashboard.systemSecondPinnedFiles || [];
  const setSecondPinnedFiles = dashboard.setSystemSecondPinnedFiles;
  const secondPinnedSheets = dashboard.systemSecondPinnedSheets || [];
  const setSecondPinnedSheets = dashboard.setSystemSecondPinnedSheets;
  const secondActiveDocumentFile = dashboard.systemSecondActiveDocumentFile || '';
  const setSecondActiveDocumentFile = dashboard.setSystemSecondActiveDocumentFile;

  const handleToggleFileSelection = useCallback((fileName, currentlyChecked = false) => {
    const { nextFiles, nextSheets } = updateSelectionForFile({
      selectedFiles,
      selectedSheets,
      fileName,
      currentlyChecked,
    });
    setSelectedFiles(nextFiles);
    if (setSelectedSheets) setSelectedSheets(nextSheets);
  }, [selectedFiles, selectedSheets, setSelectedFiles, setSelectedSheets]);

  const handleToggleSheetSelection = useCallback((sheetName) => {
    if (!activeDocumentFile) return;

    const { nextFiles, nextSheets } = updateSelectionForSheet({
      selectedFiles,
      selectedSheets,
      fileName: activeDocumentFile,
      sheetName,
    });
    setSelectedFiles(nextFiles);
    if (setSelectedSheets) setSelectedSheets(nextSheets);
  }, [activeDocumentFile, selectedFiles, selectedSheets, setSelectedFiles, setSelectedSheets]);

  const handleTogglePinnedFile = useCallback((fileName) => {
    setPinnedFiles((prev) => togglePinInList(prev, fileName));
  }, [setPinnedFiles]);

  const handleTogglePinnedSheet = useCallback((sheetKey) => {
    if (setPinnedSheets) setPinnedSheets((prev) => togglePinInList(prev, sheetKey));
  }, [setPinnedSheets]);

  const handleClearDocumentSelection = useCallback(() => {
    setSelectedFiles([]);
    if (setSelectedSheets) setSelectedSheets([]);
  }, [setSelectedFiles, setSelectedSheets]);

  const handleToggleSecondFileSelection = useCallback((fileName, currentlyChecked = false) => {
    const { nextFiles, nextSheets } = updateSelectionForFile({
      selectedFiles: secondSelectedFiles,
      selectedSheets: secondSelectedSheets,
      fileName,
      currentlyChecked,
    });
    if (setSecondSelectedFiles) setSecondSelectedFiles(nextFiles);
    if (setSecondSelectedSheets) setSecondSelectedSheets(nextSheets);
  }, [secondSelectedFiles, secondSelectedSheets, setSecondSelectedFiles, setSecondSelectedSheets]);

  const handleToggleSecondSheetSelection = useCallback((sheetName) => {
    if (!secondActiveDocumentFile) return;

    const { nextFiles, nextSheets } = updateSelectionForSheet({
      selectedFiles: secondSelectedFiles,
      selectedSheets: secondSelectedSheets,
      fileName: secondActiveDocumentFile,
      sheetName,
    });
    if (setSecondSelectedFiles) setSecondSelectedFiles(nextFiles);
    if (setSecondSelectedSheets) setSecondSelectedSheets(nextSheets);
  }, [secondActiveDocumentFile, secondSelectedFiles, secondSelectedSheets, setSecondSelectedFiles, setSecondSelectedSheets]);

  const handleTogglePinnedSecondFile = useCallback((fileName) => {
    if (setSecondPinnedFiles) setSecondPinnedFiles((prev) => togglePinInList(prev, fileName));
  }, [setSecondPinnedFiles]);

  const handleTogglePinnedSecondSheet = useCallback((sheetKey) => {
    if (setSecondPinnedSheets) setSecondPinnedSheets((prev) => togglePinInList(prev, sheetKey));
  }, [setSecondPinnedSheets]);

  const handleClearSecondDocumentSelection = useCallback(() => {
    if (setSecondSelectedFiles) setSecondSelectedFiles([]);
    if (setSecondSelectedSheets) setSecondSelectedSheets([]);
  }, [setSecondSelectedFiles, setSecondSelectedSheets]);

  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwapDocuments = useCallback(() => {
    setIsSwapping(true);
    setTimeout(() => setIsSwapping(false), 300);

    const tempSelectedFiles = selectedFiles;
    const tempSelectedSheets = selectedSheets;
    const tempPinnedFiles = pinnedFiles;
    const tempPinnedSheets = pinnedSheets;
    const tempActiveDocumentFile = activeDocumentFile;
    const tempFirstName = dashboard.systemFirstDocumentFilterName;
    
    if (dashboard.setSystemDocumentsSwapped) dashboard.setSystemDocumentsSwapped(prev => !prev);
    
    setSelectedFiles(secondSelectedFiles);
    if (setSelectedSheets) setSelectedSheets(secondSelectedSheets);
    setPinnedFiles(secondPinnedFiles);
    if (setPinnedSheets) setPinnedSheets(secondPinnedSheets);
    setActiveDocumentFile(secondActiveDocumentFile);
    if (dashboard.setSystemFirstDocumentFilterName) dashboard.setSystemFirstDocumentFilterName(dashboard.systemSecondDocumentFilterName);
    
    if (setSecondSelectedFiles) setSecondSelectedFiles(tempSelectedFiles);
    if (setSecondSelectedSheets) setSecondSelectedSheets(tempSelectedSheets);
    if (setSecondPinnedFiles) setSecondPinnedFiles(tempPinnedFiles);
    if (setSecondPinnedSheets) setSecondPinnedSheets(tempPinnedSheets);
    if (setSecondActiveDocumentFile) setSecondActiveDocumentFile(tempActiveDocumentFile);
    if (dashboard.setSystemSecondDocumentFilterName) dashboard.setSystemSecondDocumentFilterName(tempFirstName);
  }, [
    selectedFiles, selectedSheets, pinnedFiles, pinnedSheets, activeDocumentFile, dashboard,
    secondSelectedFiles, secondSelectedSheets, secondPinnedFiles, secondPinnedSheets, secondActiveDocumentFile,
    setSelectedFiles, setSelectedSheets, setPinnedFiles, setPinnedSheets, setActiveDocumentFile,
    setSecondSelectedFiles, setSecondSelectedSheets, setSecondPinnedFiles, setSecondPinnedSheets, setSecondActiveDocumentFile
  ]);

  const handleRenameFile = useCallback((fileName, nextDisplayName) => {
    dashboard.setFileDisplayNames((prev) => {
      const trimmed = String(nextDisplayName || '').trim();
      if (!trimmed || trimmed === fileName) {
        if (!(fileName in prev)) return prev;
        const next = { ...prev };
        delete next[fileName];
        return next;
      }
      return { ...prev, [fileName]: trimmed };
    });
  }, [dashboard.setFileDisplayNames]);

  const handleRenamePage = useCallback((sheetKey, originalSheetName, nextDisplayName) => {
    dashboard.setPageDisplayNames((prev) => {
      const trimmed = String(nextDisplayName || '').trim();
      if (!trimmed || trimmed === originalSheetName) {
        if (!(sheetKey in prev)) return prev;
        const next = { ...prev };
        delete next[sheetKey];
        return next;
      }
      return { ...prev, [sheetKey]: trimmed };
    });
  }, [dashboard.setPageDisplayNames]);

  return {
    isSystemFilterMode,
    datePreset, setDatePreset,
    dateStart, setDateStart,
    dateEnd, setDateEnd,
    excludeWeekends, setExcludeWeekends,
    weekendExcludedCount,
    selectedFiles, setSelectedFiles,
    selectedSheets, setSelectedSheets,
    pinnedFiles, setPinnedFiles,
    pinnedSheets, setPinnedSheets,
    activeDocumentFile, setActiveDocumentFile,
    documentTree,
    secondSelectedFiles, setSecondSelectedFiles,
    secondSelectedSheets, setSecondSelectedSheets,
    secondPinnedFiles, setSecondPinnedFiles,
    secondPinnedSheets, setSecondPinnedSheets,
    secondActiveDocumentFile, setSecondActiveDocumentFile,
    isSwapping,
    handleToggleFileSelection,
    handleToggleSheetSelection,
    handleTogglePinnedFile,
    handleTogglePinnedSheet,
    handleClearDocumentSelection,
    handleToggleSecondFileSelection,
    handleToggleSecondSheetSelection,
    handleTogglePinnedSecondFile,
    handleTogglePinnedSecondSheet,
    handleClearSecondDocumentSelection,
    handleSwapDocuments,
    handleRenameFile,
    handleRenamePage,
  };
};
