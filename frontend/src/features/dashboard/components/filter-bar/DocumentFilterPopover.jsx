import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { FilterPopover } from '../../../../components/shared/FilterPopover.jsx';
import { buildSheetKey } from '../../../../lib/utils.js';
import {
  getDocumentSummary,
  getDocumentFileSelectionState,
  getFilteredDocumentTree,
  getFilteredSheetsForActiveFile,
} from './utils.js';
import { DocumentFileListColumn } from './DocumentFileListColumn.jsx';
import { DocumentSheetListColumn } from './DocumentSheetListColumn.jsx';

export const DocumentFilterPopover = React.memo(({
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
      id="document-file"
      title="Documents"
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
          />
        ) : null}
      </div>
    </FilterPopover>
  );
});
