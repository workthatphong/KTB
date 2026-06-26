// @ts-nocheck
import React from 'react';
import { Menu } from 'lucide-react';
import { DateRangeFilterPopover } from './filter-bar/DateRangeFilterPopover';
import { DocumentFilterPopover } from './filter-bar/DocumentFilterPopover';
import { useFilterState } from './filter-bar/useFilterState';
import { TaskTypeFilter } from './filter-bar/TaskTypeFilter';
import { SwapDocumentsButton } from './filter-bar/SwapDocumentsButton';
import { RefreshButton } from './filter-bar/RefreshButton';
import { DocumentPresetPopover } from './filter-bar/DocumentPresetPopover';

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
  const [presetPopoverState, setPresetPopoverState] = React.useState({
    open: false,
    anchorRect: null,
  });
  const {
    loading,
    syncing,
    refreshAll,
    fileDisplayNames,
    pageDisplayNames,
    invalidSheetCounts,
  } = dashboard;

  const state = useFilterState({ dashboard, filterMode });

  const openPresetPopover = (anchorRect) => {
    setPresetPopoverState({
      open: true,
      anchorRect,
    });
  };

  const closePresetPopover = () => {
    setPresetPopoverState({
      open: false,
      anchorRect: null,
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
                filterId="system-first-document"
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
                onOpenPresetManager={openPresetPopover}
                showPresetButton={true}
                hasSetComparison={true}
                selectedSheetsSet2={dashboard.systemSelectedSheetsSet2}
                onToggleSheetSelectionSet2={state.handleToggleSheetSelectionSet2}
                set1Name={dashboard.systemDocument1Set1Name}
                setSet1Name={dashboard.setSystemDocument1Set1Name}
                set2Name={dashboard.systemDocument1Set2Name}
                setSet2Name={dashboard.setSystemDocument1Set2Name}
              />
              <DocumentFilterPopover
                filterId="system-second-document"
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
                onOpenPresetManager={openPresetPopover}
                showPresetButton={true}
                hasSetComparison={true}
                selectedSheetsSet2={dashboard.systemSecondSelectedSheetsSet2}
                onToggleSheetSelectionSet2={state.handleToggleSecondSheetSelectionSet2}
                set1Name={dashboard.systemDocument2Set1Name}
                setSet1Name={dashboard.setSystemDocument2Set1Name}
                set2Name={dashboard.systemDocument2Set2Name}
                setSet2Name={dashboard.setSystemDocument2Set2Name}
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
              filterId="dashboard-document"
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

      <DocumentPresetPopover
        open={presetPopoverState.open}
        anchorRect={presetPopoverState.anchorRect}
        presets={dashboard.systemDocumentPresets}
        onClose={closePresetPopover}
        onCreatePreset={state.handleCreateDocumentPreset}
        onApplyPreset={state.handleApplyDocumentPreset}
        onRenamePreset={state.handleRenameDocumentPreset}
        onDeletePreset={state.handleDeleteDocumentPreset}
      />
    </header>
  );
});
