import { extractFileNameFromSheetKey, buildSheetKey } from '../../../../lib/utils.js';

export const togglePinInList = (list, value) => (
  list.includes(value) ? list.filter((item) => item !== value) : [value, ...list]
);

export function updateSelectionForFile({
  selectedFiles,
  selectedSheets,
  fileName,
  currentlyChecked,
}) {
  if (currentlyChecked) {
    return {
      nextFiles: selectedFiles.filter((item) => item !== fileName),
      nextSheets: selectedSheets.filter(
        (sheetKey) => extractFileNameFromSheetKey(sheetKey) !== fileName,
      ),
    };
  }

  return {
    nextFiles: selectedFiles.includes(fileName) ? selectedFiles : [...selectedFiles, fileName],
    nextSheets: selectedSheets.filter(
      (sheetKey) => extractFileNameFromSheetKey(sheetKey) !== fileName,
    ),
  };
}

export function updateSelectionForSheet({
  selectedFiles,
  selectedSheets,
  fileName,
  sheetName,
}) {
  const sheetKey = buildSheetKey(fileName, sheetName);
  const nextSheets = selectedSheets.includes(sheetKey)
    ? selectedSheets.filter((item) => item !== sheetKey)
    : [...selectedSheets, sheetKey];

  const hasRemainingSheetsForFile = nextSheets.some(
    (key) => extractFileNameFromSheetKey(key) === fileName,
  );
  const nextFiles = hasRemainingSheetsForFile
    ? (selectedFiles.includes(fileName) ? selectedFiles : [...selectedFiles, fileName])
    : selectedFiles.filter((item) => item !== fileName);

  return { nextFiles, nextSheets };
}

export function getFilteredDocumentTree({ documentTree, documentFileSearch, pinnedFiles, fileDisplayNames = {} }) {
  const pinnedFileSet = new Set(pinnedFiles);
  const searchText = documentFileSearch.trim().toLowerCase();

  return documentTree
    .filter((item) => {
      const displayName = String(fileDisplayNames[item.fileName] || item.fileName).toLowerCase();
      const fileName = String(item.fileName || '').toLowerCase();
      return displayName.includes(searchText) || fileName.includes(searchText);
    })
    .sort((a, b) => {
      const aPinned = pinnedFileSet.has(a.fileName);
      const bPinned = pinnedFileSet.has(b.fileName);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
}

export function getFilteredSheetsForActiveFile({
  documentTree,
  activeDocumentFile,
  documentSheetSearch,
  pinnedSheets,
  pageDisplayNames = {},
}) {
  const pinnedSheetSet = new Set(pinnedSheets);
  const searchText = documentSheetSearch.trim().toLowerCase();
  const activeDocumentEntry = documentTree.find((item) => item.fileName === activeDocumentFile) || null;

  const filteredSheetsForActiveFile = activeDocumentEntry
    ? activeDocumentEntry.sheets
      .filter((sheet) => {
        const sheetKey = buildSheetKey(activeDocumentFile, sheet);
        const displayName = String(pageDisplayNames[sheetKey] || sheet).toLowerCase();
        const sheetName = String(sheet || '').toLowerCase();
        return displayName.includes(searchText) || sheetName.includes(searchText);
      })
      .sort((a, b) => {
        const aKey = buildSheetKey(activeDocumentFile, a);
        const bKey = buildSheetKey(activeDocumentFile, b);
        const aPinned = pinnedSheetSet.has(aKey);
        const bPinned = pinnedSheetSet.has(bKey);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0;
      })
    : [];

  return { activeDocumentEntry, filteredSheetsForActiveFile };
}

export function getDateRangeSummary(datePreset, dateStart, dateEnd) {
  let summary = 'Last 90 Days';
  if (datePreset === 'all') summary = 'All Time';
  else if (datePreset === 'custom') summary = `${dateStart} - ${dateEnd}`;
  else if (datePreset === '7d') summary = 'Last 7 Days';
  else if (datePreset === '30d') summary = 'Last 30 Days';

  return summary;
}

export function getDocumentSummary(selectedFiles, selectedSheets, allowSheetSelection = true) {
  if (selectedFiles.length === 0 && selectedSheets.length === 0) return 'Select Document';
  if (allowSheetSelection && selectedSheets.length > 0) return `${selectedSheets.length} Sheets`;
  return `${selectedFiles.length} Files`;
}

export function getDocumentFileSelectionState({
  fileName,
  sheetCount,
  selectedFiles,
  selectedSheets,
}) {
  const selectedSheetCount = selectedSheets.filter(
    (sheetKey) => extractFileNameFromSheetKey(sheetKey) === fileName,
  ).length;

  const isWholeFileSelected = selectedFiles.includes(fileName) && selectedSheetCount === 0;
  const isPartiallySelected = selectedSheetCount > 0 && selectedSheetCount < sheetCount;
  const isAllSheetsSelectedIndividually = sheetCount > 0 && selectedSheetCount === sheetCount;

  return {
    checked: isWholeFileSelected || isAllSheetsSelectedIndividually,
    indeterminate: isPartiallySelected,
  };
}
