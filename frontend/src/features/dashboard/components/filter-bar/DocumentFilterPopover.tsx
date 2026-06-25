// @ts-nocheck
import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { FilterPopover } from '@/components/shared/FilterPopover';
import { buildSheetKey } from '@/lib/utils';
import {
  getDocumentSummary,
  getDocumentFileSelectionState,
  getFilteredDocumentTree,
  getFilteredSheetsForActiveFile,
} from './utils';
import { DocumentFileListColumn } from './DocumentFileListColumn';
import { DocumentSheetListColumn } from './DocumentSheetListColumn';

export const DocumentFilterPopover = React.memo(({
  title = "Documents",
  onTitleChange,
  openDropdown,
  setOpenDropdown,
  allowSheetSelection = true,
  documentTree,
  selectedFiles,
  selectedSheets,
  pinnedFiles,
  pinnedSheets,
  activeDocumentFile,
  setActiveDocumentFile,
  fileDisplayNames,
  pageDisplayNames,
  documentFileSearch,
  setDocumentFileSearch,
  documentSheetSearch,
  setDocumentSheetSearch,
  invalidSheetCounts,
  onToggleFileSelection,
  onToggleSheetSelection,
  onTogglePinnedFile,
  onTogglePinnedSheet,
  onRenameFile,
  onRenamePage,
  onClearSelection,
  hasSetComparison = false,
  selectedSheetsSet2 = [],
  onToggleSheetSelectionSet2,
  set1Name,
  setSet1Name,
  set2Name,
  setSet2Name,
}) => {
  const filteredDocumentTree = useMemo(
    () => getFilteredDocumentTree({ documentTree, documentFileSearch, pinnedFiles, fileDisplayNames }),
    [documentTree, documentFileSearch, pinnedFiles, fileDisplayNames],
  );

  const { activeDocumentEntry, filteredSheetsForActiveFile } = useMemo(
    () => getFilteredSheetsForActiveFile({
      documentTree,
      activeDocumentFile,
      documentSheetSearch,
      pinnedSheets,
      pageDisplayNames,
    }),
    [documentTree, activeDocumentFile, documentSheetSearch, pinnedSheets, pageDisplayNames],
  );

  const selectedSheetSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);
  const selectedSheetSet2 = useMemo(() => new Set(selectedSheetsSet2), [selectedSheetsSet2]);
  const pinnedFileSet = useMemo(() => new Set(pinnedFiles), [pinnedFiles]);
  const pinnedSheetSet = useMemo(() => new Set(pinnedSheets), [pinnedSheets]);

  const sheetItems = useMemo(
    () => filteredSheetsForActiveFile.map((sheetName) => ({
      name: sheetName,
      key: buildSheetKey(activeDocumentFile, sheetName),
    })),
    [activeDocumentFile, filteredSheetsForActiveFile],
  );

  return (
    <FilterPopover
      id={`document-file-${title}`}
      title={title}
      onTitleChange={onTitleChange}
      summary={getDocumentSummary(selectedFiles, selectedSheets, allowSheetSelection)}
      openDropdown={openDropdown}
      setOpenDropdown={setOpenDropdown}
      icon={FileText}
      active={selectedFiles.length > 0 || selectedSheets.length > 0}
      minWidthClass="min-w-[240px] max-sm:min-w-0"
      panelClassName={allowSheetSelection ? 'w-[640px] max-w-[92vw]' : 'w-[320px] max-w-[92vw]'}
    >
      <div className={`flex h-[420px] ${allowSheetSelection ? 'divide-x divide-slate-100' : ''}`}>
        <DocumentFileListColumn
          filteredDocumentTree={filteredDocumentTree}
          documentFileSearch={documentFileSearch}
          setDocumentFileSearch={setDocumentFileSearch}
          selectedFiles={selectedFiles}
          selectedSheets={selectedSheets}
          activeDocumentFile={activeDocumentFile}
          setActiveDocumentFile={setActiveDocumentFile}
          fileDisplayNames={fileDisplayNames}
          getDocumentFileSelectionState={getDocumentFileSelectionState}
          pinnedFileSet={pinnedFileSet}
          onToggleFileSelection={onToggleFileSelection}
          onTogglePin={onTogglePinnedFile}
          onRenameFile={onRenameFile}
          onClearSelection={onClearSelection}
          fullWidth={!allowSheetSelection}
        />

        {allowSheetSelection ? (
          <DocumentSheetListColumn
            activeDocumentEntry={activeDocumentEntry}
            filteredSheetsForActiveFile={sheetItems}
            documentSheetSearch={documentSheetSearch}
            setDocumentSheetSearch={setDocumentSheetSearch}
            selectedSheetSet={selectedSheetSet}
            pinnedSheetSet={pinnedSheetSet}
            pageDisplayNames={pageDisplayNames}
            invalidSheetCounts={invalidSheetCounts}
            onToggleSheetSelection={onToggleSheetSelection}
            onTogglePin={onTogglePinnedSheet}
            onRenamePage={onRenamePage}
            hasSetComparison={hasSetComparison}
            selectedSheetSet2={selectedSheetSet2}
            onToggleSheetSelectionSet2={onToggleSheetSelectionSet2}
            set1Name={set1Name}
            setSet1Name={setSet1Name}
            set2Name={set2Name}
            setSet2Name={setSet2Name}
          />
        ) : null}
      </div>
    </FilterPopover>
  );
});
