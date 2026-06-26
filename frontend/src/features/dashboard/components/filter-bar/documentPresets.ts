// @ts-nocheck
import { extractFileNameFromSheetKey } from '@/lib/utils';

const clone = (value) => JSON.parse(JSON.stringify(value || null));
const normalizeList = (value) => (Array.isArray(value) ? [...value] : []);
const normalizeRecord = (value) => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? (clone(value) || {})
    : {}
);
const normalizeText = (value, fallback = '') => (
  typeof value === 'string' && value.trim().length > 0 ? value : fallback
);

const normalizePresetDocument = (presetDocument) => ({
  filterName: normalizeText(presetDocument?.filterName),
  activeDocumentFile: normalizeText(presetDocument?.activeDocumentFile),
  selectedFiles: normalizeList(presetDocument?.selectedFiles),
  selectedSheets: normalizeList(presetDocument?.selectedSheets),
  selectedSheetsSet2: normalizeList(presetDocument?.selectedSheetsSet2),
  set1Name: normalizeText(presetDocument?.set1Name),
  set2Name: normalizeText(presetDocument?.set2Name),
});

const resolveActiveFile = (presetDocument) => {
  if (!presetDocument) return '';
  if (presetDocument.activeDocumentFile) return presetDocument.activeDocumentFile;
  if (presetDocument.selectedFiles?.[0]) return presetDocument.selectedFiles[0];
  if (presetDocument.selectedSheets?.[0]) return extractFileNameFromSheetKey(presetDocument.selectedSheets[0]);
  if (presetDocument.selectedSheetsSet2?.[0]) return extractFileNameFromSheetKey(presetDocument.selectedSheetsSet2[0]);
  return '';
};

export function buildCurrentDocumentPreset(dashboard, name) {
  const trimmedName = String(name || '').trim();
  const timestamp = Date.now();

  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName || `Preset ${((dashboard.systemDocumentPresets || []).length || 0) + 1}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    documentsSwapped: !!dashboard.systemDocumentsSwapped,
    first: {
      filterName: dashboard.systemFirstDocumentFilterName,
      activeDocumentFile: dashboard.systemActiveDocumentFile || '',
      selectedFiles: normalizeList(dashboard.systemSelectedFiles),
      selectedSheets: normalizeList(dashboard.systemSelectedSheets),
      selectedSheetsSet2: normalizeList(dashboard.systemSelectedSheetsSet2),
      set1Name: dashboard.systemDocument1Set1Name,
      set2Name: dashboard.systemDocument1Set2Name,
    },
    second: {
      filterName: dashboard.systemSecondDocumentFilterName,
      activeDocumentFile: dashboard.systemSecondActiveDocumentFile || '',
      selectedFiles: normalizeList(dashboard.systemSecondSelectedFiles),
      selectedSheets: normalizeList(dashboard.systemSecondSelectedSheets),
      selectedSheetsSet2: normalizeList(dashboard.systemSecondSelectedSheetsSet2),
      set1Name: dashboard.systemDocument2Set1Name,
      set2Name: dashboard.systemDocument2Set2Name,
    },
    fileDisplayNames: normalizeRecord(dashboard.fileDisplayNames),
    pageDisplayNames: normalizeRecord(dashboard.pageDisplayNames),
  };
}

export function applyDocumentPreset(dashboard, preset) {
  if (!preset) return;
  const first = normalizePresetDocument(preset.first);
  const second = normalizePresetDocument(preset.second);
  const fileDisplayNames = normalizeRecord(preset.fileDisplayNames);
  const pageDisplayNames = normalizeRecord(preset.pageDisplayNames);

  dashboard.setSystemDocumentsSwapped?.(!!preset.documentsSwapped);
  dashboard.setSystemFirstDocumentFilterName?.(first.filterName || 'First documents');
  dashboard.setSystemSecondDocumentFilterName?.(second.filterName || 'Second Documents');

  dashboard.setSystemSelectedFiles?.(first.selectedFiles);
  dashboard.setSystemSelectedSheets?.(first.selectedSheets);
  dashboard.setSystemSelectedSheetsSet2?.(first.selectedSheetsSet2);
  dashboard.setSystemActiveDocumentFile?.(resolveActiveFile(first));

  dashboard.setSystemSecondSelectedFiles?.(second.selectedFiles);
  dashboard.setSystemSecondSelectedSheets?.(second.selectedSheets);
  dashboard.setSystemSecondSelectedSheetsSet2?.(second.selectedSheetsSet2);
  dashboard.setSystemSecondActiveDocumentFile?.(resolveActiveFile(second));

  dashboard.setSystemDocument1Set1Name?.(first.set1Name || 'Set 1');
  dashboard.setSystemDocument1Set2Name?.(first.set2Name || 'Set 2');
  dashboard.setSystemDocument2Set1Name?.(second.set1Name || 'Set 1');
  dashboard.setSystemDocument2Set2Name?.(second.set2Name || 'Set 2');

  dashboard.setFileDisplayNames?.(fileDisplayNames);
  dashboard.setPageDisplayNames?.(pageDisplayNames);
}
