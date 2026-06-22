import React, { useState } from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import { DateRangeFilterPopover } from './filter-bar/DateRangeFilterPopover.jsx';
import { DocumentFilterPopover } from './filter-bar/DocumentFilterPopover.jsx';
import { FilterPopover } from '@/components/shared/FilterPopover.jsx';
import { ListTodo, ArrowRightLeft } from 'lucide-react';
import {
  togglePinInList,
  updateSelectionForFile,
  updateSelectionForSheet,
} from './filter-bar/utils.js';

export const FilterBar = React.memo(({
  dashboard,
  filterMode = 'dashboard',
  openDropdown,
  setOpenDropdown,
  documentFileSearch,
  setDocumentFileSearch,
  documentSheetSearch,
  setDocumentSheetSearch,
  systemSecondDocumentFileSearch,
  setSystemSecondDocumentFileSearch,
  systemSecondDocumentSheetSearch,
  setSystemSecondDocumentSheetSearch,
  systemTaskType,
  setSystemTaskType,
  onMenuClick,
}) => {
  const {
    loading,
    syncing,
    refreshAll,
    fileDisplayNames,
    setFileDisplayNames,
    pageDisplayNames,
    setPageDisplayNames,
    invalidSheetCounts,
  } = dashboard;
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

  const handleToggleFileSelection = (fileName, currentlyChecked = false) => {
    const { nextFiles, nextSheets } = updateSelectionForFile({
      selectedFiles,
      selectedSheets,
      fileName,
      currentlyChecked,
    });
    setSelectedFiles(nextFiles);
    if (setSelectedSheets) setSelectedSheets(nextSheets);
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
    if (setSelectedSheets) setSelectedSheets(nextSheets);
  };

  const handleTogglePinnedFile = (fileName) => {
    setPinnedFiles((prev) => togglePinInList(prev, fileName));
  };

  const handleTogglePinnedSheet = (sheetKey) => {
    if (setPinnedSheets) setPinnedSheets((prev) => togglePinInList(prev, sheetKey));
  };

  const handleClearDocumentSelection = () => {
    setSelectedFiles([]);
    if (setSelectedSheets) setSelectedSheets([]);
  };

  const handleToggleSecondFileSelection = (fileName, currentlyChecked = false) => {
    const { nextFiles, nextSheets } = updateSelectionForFile({
      selectedFiles: secondSelectedFiles,
      selectedSheets: secondSelectedSheets,
      fileName,
      currentlyChecked,
    });
    if (setSecondSelectedFiles) setSecondSelectedFiles(nextFiles);
    if (setSecondSelectedSheets) setSecondSelectedSheets(nextSheets);
  };

  const handleToggleSecondSheetSelection = (sheetName) => {
    if (!secondActiveDocumentFile) return;

    const { nextFiles, nextSheets } = updateSelectionForSheet({
      selectedFiles: secondSelectedFiles,
      selectedSheets: secondSelectedSheets,
      fileName: secondActiveDocumentFile,
      sheetName,
    });
    if (setSecondSelectedFiles) setSecondSelectedFiles(nextFiles);
    if (setSecondSelectedSheets) setSecondSelectedSheets(nextSheets);
  };

  const handleTogglePinnedSecondFile = (fileName) => {
    if (setSecondPinnedFiles) setSecondPinnedFiles((prev) => togglePinInList(prev, fileName));
  };

  const handleTogglePinnedSecondSheet = (sheetKey) => {
    if (setSecondPinnedSheets) setSecondPinnedSheets((prev) => togglePinInList(prev, sheetKey));
  };

  const handleClearSecondDocumentSelection = () => {
    if (setSecondSelectedFiles) setSecondSelectedFiles([]);
    if (setSecondSelectedSheets) setSecondSelectedSheets([]);
  };

  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwapDocuments = () => {
    setIsSwapping(true);
    setTimeout(() => setIsSwapping(false), 300);

    const tempSelectedFiles = selectedFiles;
    const tempSelectedSheets = selectedSheets;
    const tempPinnedFiles = pinnedFiles;
    const tempPinnedSheets = pinnedSheets;
    const tempActiveDocumentFile = activeDocumentFile;
    const tempFirstName = dashboard.systemFirstDocumentFilterName;
    
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

          {isSystemFilterMode ? (
            <>
              <DocumentFilterPopover
                title={dashboard.systemFirstDocumentFilterName}
                onTitleChange={dashboard.setSystemFirstDocumentFilterName}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                allowSheetSelection={true}
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
              <DocumentFilterPopover
                title={dashboard.systemSecondDocumentFilterName}
                onTitleChange={dashboard.setSystemSecondDocumentFilterName}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                allowSheetSelection={true}
                documentTree={documentTree}
                selectedFiles={secondSelectedFiles}
                selectedSheets={secondSelectedSheets}
                pinnedFiles={secondPinnedFiles}
                pinnedSheets={secondPinnedSheets}
                activeDocumentFile={secondActiveDocumentFile}
                setActiveDocumentFile={setSecondActiveDocumentFile}
                fileDisplayNames={fileDisplayNames}
                pageDisplayNames={pageDisplayNames}
                documentFileSearch={systemSecondDocumentFileSearch}
                setDocumentFileSearch={setSystemSecondDocumentFileSearch}
                documentSheetSearch={systemSecondDocumentSheetSearch}
                setDocumentSheetSearch={setSystemSecondDocumentSheetSearch}
                invalidSheetCounts={invalidSheetCounts}
                onToggleFileSelection={handleToggleSecondFileSelection}
                onToggleSheetSelection={handleToggleSecondSheetSelection}
                onTogglePinnedFile={handleTogglePinnedSecondFile}
                onTogglePinnedSheet={handleTogglePinnedSecondSheet}
                onRenameFile={handleRenameFile}
                onRenamePage={handleRenamePage}
                onClearSelection={handleClearSecondDocumentSelection}
              />
              <FilterPopover
                id="taskType"
                title="Task Type"
                summary={
                  systemTaskType === 'all' ? 'All Tasks' :
                  systemTaskType === 'editData' ? 'Edit Data' :
                  systemTaskType === 'editDataRecord' ? 'Edit Data Record' : 'Review'
                }
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                icon={ListTodo}
                active={systemTaskType !== 'all'}
                minWidthClass="w-[140px]"
                panelClassName="w-[160px]"
              >
                <div className="p-1.5 flex flex-col gap-0.5">
                  {[
                    { id: 'all', label: 'All Tasks' },
                    { id: 'editData', label: 'Edit Data Time' },
                    { id: 'editDataRecord', label: 'Edit Data Record' },
                    { id: 'review', label: 'Review' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setSystemTaskType(opt.id); setOpenDropdown(''); }}
                      className={`w-full text-left px-3 py-2 text-[13px] font-semibold rounded-lg transition-colors ${systemTaskType === opt.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FilterPopover>
              <button
                onClick={handleSwapDocuments}
                className="flex items-center justify-center w-9 h-9 shrink-0 text-slate-500 bg-white border border-[#d7e8f6] hover:text-[#3860be] hover:border-[#bfe8f8] hover:bg-[#e8f7fd] rounded-xl transition-all shadow-ktb active:scale-95"
                title="Swap Document 1 and Document 2"
              >
                <ArrowRightLeft className={`w-4 h-4 transition-transform duration-300 ${isSwapping ? 'rotate-180 scale-110' : ''}`} />
              </button>
            </>
          ) : (
            <DocumentFilterPopover
              title="Documents"
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              allowSheetSelection={true}
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
          )}
        </div>

        <div className="shrink-0 flex items-center gap-4 pl-4 border-l border-[#d7e8f6] max-sm:gap-2 max-sm:pl-0 max-sm:border-l-0">
          <button
            onClick={() => refreshAll({
              syncFirst: true,
              syncTimeoutMs: 120000,
              refreshSnapshot: true,
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
