import React from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import { DateRangeFilterPopover } from './filter-bar/DateRangeFilterPopover.jsx';
import { DocumentFilterPopover } from './filter-bar/DocumentFilterPopover.jsx';
import {
  togglePinInList,
  updateSelectionForFile,
  updateSelectionForSheet,
} from './filter-bar/utils.js';

export const FilterBar = React.memo(({
  dashboard,
  openDropdown,
  setOpenDropdown,
  documentFileSearch,
  setDocumentFileSearch,
  documentSheetSearch,
  setDocumentSheetSearch,
  onMenuClick,
}) => {
  const {
    loading,
    syncing,
    refreshAll,
    datePreset,
    setDatePreset,
    dateStart,
    setDateStart,
    dateEnd,
    setDateEnd,
    excludeWeekends,
    setExcludeWeekends,
    weekendExcludedCount,
    selectedFiles,
    setSelectedFiles,
    selectedSheets,
    setSelectedSheets,
    pinnedFiles,
    setPinnedFiles,
    pinnedSheets,
    setPinnedSheets,
    activeDocumentFile,
    setActiveDocumentFile,
    fileDisplayNames,
    setFileDisplayNames,
    pageDisplayNames,
    setPageDisplayNames,
    documentTree,
    invalidSheetCounts,
  } = dashboard;

  const handleToggleFileSelection = (fileName, currentlyChecked = false) => {
    const { nextFiles, nextSheets } = updateSelectionForFile({
      selectedFiles,
      selectedSheets,
      fileName,
      currentlyChecked,
    });
    setSelectedFiles(nextFiles);
    setSelectedSheets(nextSheets);
  };

  const handleToggleSheetSelection = (sheetName) => {
    if (!activeDocumentFile) return;

    const { nextFiles, nextSheets } = updateSelectionForSheet({
      selectedFiles,
      selectedSheets,
      fileName: activeDocumentFile,
      sheetName,
    });
    setSelectedFiles(nextFiles);
    setSelectedSheets(nextSheets);
  };

  const handleTogglePinnedFile = (fileName) => {
    setPinnedFiles((prev) => togglePinInList(prev, fileName));
  };

  const handleTogglePinnedSheet = (sheetKey) => {
    setPinnedSheets((prev) => togglePinInList(prev, sheetKey));
  };

  const handleClearDocumentSelection = () => {
    setSelectedFiles([]);
    setSelectedSheets([]);
  };

  const handleRenameFile = (fileName, nextDisplayName) => {
    setFileDisplayNames((prev) => {
      const trimmed = String(nextDisplayName || '').trim();
      if (!trimmed || trimmed === fileName) {
        if (!(fileName in prev)) return prev;
        const next = { ...prev };
        delete next[fileName];
        return next;
      }
      return { ...prev, [fileName]: trimmed };
    });
  };

  const handleRenamePage = (sheetKey, originalSheetName, nextDisplayName) => {
    setPageDisplayNames((prev) => {
      const trimmed = String(nextDisplayName || '').trim();
      if (!trimmed || trimmed === originalSheetName) {
        if (!(sheetKey in prev)) return prev;
        const next = { ...prev };
        delete next[sheetKey];
        return next;
      }
      return { ...prev, [sheetKey]: trimmed };
    });
  };

  return (
    <header className="scroll-clarity-layer shrink-0 bg-white/95 border-b border-[#d7e8f6] px-4 md:px-8 py-3 z-[80]">
      <div className="max-w-[1600px] mx-auto flex items-center gap-2 md:gap-3">
        <div className="flex-1 flex items-center gap-2 md:gap-3 max-sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-[#3860be] transition-colors shrink-0"
          >
            <Menu className="w-6 h-6" />
          </button>

          <DateRangeFilterPopover
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            dateStart={dateStart}
            setDateStart={setDateStart}
            dateEnd={dateEnd}
            setDateEnd={setDateEnd}
            excludeWeekends={excludeWeekends}
            setExcludeWeekends={setExcludeWeekends}
            weekendExcludedCount={weekendExcludedCount}
          />

          <DocumentFilterPopover
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            documentTree={documentTree}
            selectedFiles={selectedFiles}
            selectedSheets={selectedSheets}
            pinnedFiles={pinnedFiles}
            pinnedSheets={pinnedSheets}
            activeDocumentFile={activeDocumentFile}
            setActiveDocumentFile={setActiveDocumentFile}
            fileDisplayNames={fileDisplayNames}
            pageDisplayNames={pageDisplayNames}
            documentFileSearch={documentFileSearch}
            setDocumentFileSearch={setDocumentFileSearch}
            documentSheetSearch={documentSheetSearch}
            setDocumentSheetSearch={setDocumentSheetSearch}
            invalidSheetCounts={invalidSheetCounts}
            onToggleFileSelection={handleToggleFileSelection}
            onToggleSheetSelection={handleToggleSheetSelection}
            onTogglePinnedFile={handleTogglePinnedFile}
            onTogglePinnedSheet={handleTogglePinnedSheet}
            onRenameFile={handleRenameFile}
            onRenamePage={handleRenamePage}
            onClearSelection={handleClearDocumentSelection}
          />
        </div>

        <div className="shrink-0 flex items-center gap-4 pl-4 border-l border-[#d7e8f6] max-sm:gap-2 max-sm:pl-0 max-sm:border-l-0">
          <button
            onClick={() => refreshAll({
              syncFirst: true,
              syncTimeoutMs: 120000,
              refreshSnapshot: true,
              showRefreshPagePrompt: true,
            })}
            disabled={loading || syncing}
            aria-label={loading || syncing ? 'Refreshing data' : 'Refresh data'}
            className="h-9 w-9 justify-center rounded-full border-0 bg-transparent text-[#3860be] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center shadow-none max-sm:mx-0 md:h-10 md:w-auto md:px-4 md:rounded-xl md:border md:border-[#bfe8f8] md:bg-white md:text-sm md:font-semibold md:hover:bg-[#e8f7fd] md:gap-2 md:shadow-ktb transition-all duration-200 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || syncing) ? 'animate-spin' : ''} transition-transform duration-500`} />
            <span className="hidden md:inline">{loading || syncing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>
    </header>
  );
});
