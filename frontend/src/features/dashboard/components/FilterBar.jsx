import React from 'react';
import { Menu } from 'lucide-react';
import { DateRangeFilterPopover } from './filter-bar/DateRangeFilterPopover.jsx';
import { DocumentFilterPopover } from './filter-bar/DocumentFilterPopover.jsx';
import { useFilterState } from './filter-bar/useFilterState.js';
import { TaskTypeFilter } from './filter-bar/TaskTypeFilter.jsx';
import { SwapDocumentsButton } from './filter-bar/SwapDocumentsButton.jsx';
import { RefreshButton } from './filter-bar/RefreshButton.jsx';

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
    pageDisplayNames,
    invalidSheetCounts,
  } = dashboard;

  const state = useFilterState({ dashboard, filterMode });

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
            datePreset={state.datePreset}
            setDatePreset={state.setDatePreset}
            dateStart={state.dateStart}
            setDateStart={state.setDateStart}
            dateEnd={state.dateEnd}
            setDateEnd={state.setDateEnd}
            excludeWeekends={state.excludeWeekends}
            setExcludeWeekends={state.setExcludeWeekends}
            weekendExcludedCount={state.weekendExcludedCount}
          />

          {state.isSystemFilterMode ? (
            <>
              <DocumentFilterPopover
                title={dashboard.systemFirstDocumentFilterName}
                onTitleChange={dashboard.setSystemFirstDocumentFilterName}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                allowSheetSelection={true}
                documentTree={state.documentTree}
                selectedFiles={state.selectedFiles}
                selectedSheets={state.selectedSheets}
                pinnedFiles={state.pinnedFiles}
                pinnedSheets={state.pinnedSheets}
                activeDocumentFile={state.activeDocumentFile}
                setActiveDocumentFile={state.setActiveDocumentFile}
                fileDisplayNames={fileDisplayNames}
                pageDisplayNames={pageDisplayNames}
                documentFileSearch={documentFileSearch}
                setDocumentFileSearch={setDocumentFileSearch}
                documentSheetSearch={documentSheetSearch}
                setDocumentSheetSearch={setDocumentSheetSearch}
                invalidSheetCounts={invalidSheetCounts}
                onToggleFileSelection={state.handleToggleFileSelection}
                onToggleSheetSelection={state.handleToggleSheetSelection}
                onTogglePinnedFile={state.handleTogglePinnedFile}
                onTogglePinnedSheet={state.handleTogglePinnedSheet}
                onRenameFile={state.handleRenameFile}
                onRenamePage={state.handleRenamePage}
                onClearSelection={state.handleClearDocumentSelection}
              />
              <DocumentFilterPopover
                title={dashboard.systemSecondDocumentFilterName}
                onTitleChange={dashboard.setSystemSecondDocumentFilterName}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                allowSheetSelection={true}
                documentTree={state.documentTree}
                selectedFiles={state.secondSelectedFiles}
                selectedSheets={state.secondSelectedSheets}
                pinnedFiles={state.secondPinnedFiles}
                pinnedSheets={state.secondPinnedSheets}
                activeDocumentFile={state.secondActiveDocumentFile}
                setActiveDocumentFile={state.setSecondActiveDocumentFile}
                fileDisplayNames={fileDisplayNames}
                pageDisplayNames={pageDisplayNames}
                documentFileSearch={systemSecondDocumentFileSearch}
                setDocumentFileSearch={setSystemSecondDocumentFileSearch}
                documentSheetSearch={systemSecondDocumentSheetSearch}
                setDocumentSheetSearch={setSystemSecondDocumentSheetSearch}
                invalidSheetCounts={invalidSheetCounts}
                onToggleFileSelection={state.handleToggleSecondFileSelection}
                onToggleSheetSelection={state.handleToggleSecondSheetSelection}
                onTogglePinnedFile={state.handleTogglePinnedSecondFile}
                onTogglePinnedSheet={state.handleTogglePinnedSecondSheet}
                onRenameFile={state.handleRenameFile}
                onRenamePage={state.handleRenamePage}
                onClearSelection={state.handleClearSecondDocumentSelection}
              />
              <TaskTypeFilter
                systemTaskType={systemTaskType}
                setSystemTaskType={setSystemTaskType}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
              />
              <SwapDocumentsButton
                isSwapping={state.isSwapping}
                onSwap={state.handleSwapDocuments}
              />
            </>
          ) : (
            <DocumentFilterPopover
              title="Documents"
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              allowSheetSelection={true}
              documentTree={state.documentTree}
              selectedFiles={state.selectedFiles}
              selectedSheets={state.selectedSheets}
              pinnedFiles={state.pinnedFiles}
              pinnedSheets={state.pinnedSheets}
              activeDocumentFile={state.activeDocumentFile}
              setActiveDocumentFile={state.setActiveDocumentFile}
              fileDisplayNames={fileDisplayNames}
              pageDisplayNames={pageDisplayNames}
              documentFileSearch={documentFileSearch}
              setDocumentFileSearch={setDocumentFileSearch}
              documentSheetSearch={documentSheetSearch}
              setDocumentSheetSearch={setDocumentSheetSearch}
              invalidSheetCounts={invalidSheetCounts}
              onToggleFileSelection={state.handleToggleFileSelection}
              onToggleSheetSelection={state.handleToggleSheetSelection}
              onTogglePinnedFile={state.handleTogglePinnedFile}
              onTogglePinnedSheet={state.handleTogglePinnedSheet}
              onRenameFile={state.handleRenameFile}
              onRenamePage={state.handleRenamePage}
              onClearSelection={state.handleClearDocumentSelection}
            />
          )}
        </div>

        <div className="shrink-0 flex items-center gap-4 pl-4 border-l border-[#d7e8f6] max-sm:gap-2 max-sm:pl-0 max-sm:border-l-0">
          <RefreshButton loading={loading} syncing={syncing} refreshAll={refreshAll} />
        </div>
      </div>
    </header>
  );
});
