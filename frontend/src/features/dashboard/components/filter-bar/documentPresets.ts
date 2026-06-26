// @ts-nocheck
import { extractFileNameFromSheetKey } from '@/lib/utils';

const clone = (value) => JSON.parse(JSON.stringify(value || null));

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
      selectedFiles: [...(dashboard.systemSelectedFiles || [])],
      selectedSheets: [...(dashboard.systemSelectedSheets || [])],
      selectedSheetsSet2: [...(dashboard.systemSelectedSheetsSet2 || [])],
      set1Name: dashboard.systemDocument1Set1Name,
      set2Name: dashboard.systemDocument1Set2Name,
    },
    second: {
      filterName: dashboard.systemSecondDocumentFilterName,
      activeDocumentFile: dashboard.systemSecondActiveDocumentFile || '',
      selectedFiles: [...(dashboard.systemSecondSelectedFiles || [])],
      selectedSheets: [...(dashboard.systemSecondSelectedSheets || [])],
      selectedSheetsSet2: [...(dashboard.systemSecondSelectedSheetsSet2 || [])],
      set1Name: dashboard.systemDocument2Set1Name,
      set2Name: dashboard.systemDocument2Set2Name,
    },
    fileDisplayNames: clone(dashboard.fileDisplayNames) || {},
    pageDisplayNames: clone(dashboard.pageDisplayNames) || {},
  };
}

export function applyDocumentPreset(dashboard, preset) {
  if (!preset) return;

  dashboard.setSystemDocumentsSwapped?.(!!preset.documentsSwapped);
  dashboard.setSystemFirstDocumentFilterName?.(preset.first?.filterName || 'First documents');
  dashboard.setSystemSecondDocumentFilterName?.(preset.second?.filterName || 'Second Documents');

  dashboard.setSystemSelectedFiles?.([...(preset.first?.selectedFiles || [])]);
  dashboard.setSystemSelectedSheets?.([...(preset.first?.selectedSheets || [])]);
  dashboard.setSystemSelectedSheetsSet2?.([...(preset.first?.selectedSheetsSet2 || [])]);
  dashboard.setSystemActiveDocumentFile?.(resolveActiveFile(preset.first));

  dashboard.setSystemSecondSelectedFiles?.([...(preset.second?.selectedFiles || [])]);
  dashboard.setSystemSecondSelectedSheets?.([...(preset.second?.selectedSheets || [])]);
  dashboard.setSystemSecondSelectedSheetsSet2?.([...(preset.second?.selectedSheetsSet2 || [])]);
  dashboard.setSystemSecondActiveDocumentFile?.(resolveActiveFile(preset.second));

  dashboard.setSystemDocument1Set1Name?.(preset.first?.set1Name || 'Set 1');
  dashboard.setSystemDocument1Set2Name?.(preset.first?.set2Name || 'Set 2');
  dashboard.setSystemDocument2Set1Name?.(preset.second?.set1Name || 'Set 1');
  dashboard.setSystemDocument2Set2Name?.(preset.second?.set2Name || 'Set 2');

  dashboard.setFileDisplayNames?.(clone(preset.fileDisplayNames) || {});
  dashboard.setPageDisplayNames?.(clone(preset.pageDisplayNames) || {});
}
