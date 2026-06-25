// @ts-nocheck
import React from 'react';
import { Database, Pencil, Pin } from 'lucide-react';
import { DropdownSearch } from '@/components/shared/DropdownSearch';

export function DocumentSheetListColumn({
  activeDocumentEntry,
  filteredSheetsForActiveFile,
  documentSheetSearch,
  setDocumentSheetSearch,
  selectedSheetSet,
  pinnedSheetSet,
  pageDisplayNames,
  invalidSheetCounts,
  onToggleSheetSelection,
  onTogglePin,
  onRenamePage,
  hasSetComparison = false,
  selectedSheetSet2 = new Set(),
  onToggleSheetSelectionSet2 = () => {},
  set1Name = 'Set 1',
  setSet1Name = () => {},
  set2Name = 'Set 2',
  setSet2Name = () => {},
}) {
  const [editingSheetKey, setEditingSheetKey] = React.useState('');
  const [draftDisplayName, setDraftDisplayName] = React.useState('');
  
  const [activeSet, setActiveSet] = React.useState(1);
  const [editingSet, setEditingSet] = React.useState(0);
  const [draftSetName, setDraftSetName] = React.useState('');

  const beginRename = (sheetKey, sheetName) => {
    setEditingSheetKey(sheetKey);
    setDraftDisplayName(String(pageDisplayNames?.[sheetKey] || sheetName));
  };

  const cancelRename = () => {
    setEditingSheetKey('');
    setDraftDisplayName('');
  };

  const commitRename = (sheetKey, sheetName) => {
    onRenamePage(sheetKey, sheetName, draftDisplayName);
    cancelRename();
  };

  const beginEditSet = (setNum, currentName) => {
    setEditingSet(setNum);
    setDraftSetName(currentName);
  };

  const commitEditSet = (setNum) => {
    if (setNum === 1) setSet1Name(draftSetName || 'Set 1');
    if (setNum === 2) setSet2Name(draftSetName || 'Set 2');
    setEditingSet(0);
  };

  const currentSelectedSheetSet = activeSet === 1 ? selectedSheetSet : selectedSheetSet2;
  const currentOnToggleSheetSelection = activeSet === 1 ? onToggleSheetSelection : onToggleSheetSelectionSet2;

  return (
    <div className="w-1/2 flex flex-col bg-slate-50/30">
      <div className="p-3 border-b border-slate-50 space-y-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">Selected sheet</div>
          {hasSetComparison && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg max-w-[140px]">
              {/* Set 1 Button */}
              {editingSet === 1 ? (
                <input
                  value={draftSetName}
                  onChange={(e) => setDraftSetName(e.target.value)}
                  onBlur={() => commitEditSet(1)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEditSet(1); if (e.key === 'Escape') setEditingSet(0); }}
                  className="w-20 h-6 text-xs font-medium bg-white border border-blue-200 rounded px-1.5 focus:outline-none"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setActiveSet(1)}
                  onDoubleClick={() => beginEditSet(1, set1Name)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 ${activeSet === 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Double click to rename"
                >
                  {set1Name}
                </button>
              )}

              {/* Set 2 Button */}
              {editingSet === 2 ? (
                <input
                  value={draftSetName}
                  onChange={(e) => setDraftSetName(e.target.value)}
                  onBlur={() => commitEditSet(2)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEditSet(2); if (e.key === 'Escape') setEditingSet(0); }}
                  className="w-20 h-6 text-xs font-medium bg-white border border-blue-200 rounded px-1.5 focus:outline-none ml-1"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setActiveSet(2)}
                  onDoubleClick={() => beginEditSet(2, set2Name)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 ${activeSet === 2 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Double click to rename"
                >
                  {set2Name}
                </button>
              )}
            </div>
          )}
        </div>
        <DropdownSearch
          value={documentSheetSearch}
          onChange={setDocumentSheetSearch}
          placeholder="Search sheets..."
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
        {!activeDocumentEntry ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center opacity-40 fade-slide-down">
            <Database className="w-8 h-8 text-slate-300 mb-2" />
            <div className="text-xs font-medium text-slate-400">Select a file to see sheets</div>
          </div>
        ) : filteredSheetsForActiveFile.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center fade-slide-down">No sheets found</div>
        ) : (
          filteredSheetsForActiveFile.map((sheet) => {
            const isChecked = currentSelectedSheetSet.has(sheet.key);
            const isPinned = pinnedSheetSet.has(sheet.key);
            const invalidCount = invalidSheetCounts?.[sheet.key] || 0;
            const displayName = pageDisplayNames?.[sheet.key] || sheet.name;
            const isEditing = editingSheetKey === sheet.key;
            const hasAlias = displayName !== sheet.name;

            return (
              <div
                key={sheet.name}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all duration-200 fade-slide-down"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => currentOnToggleSheetSelection(sheet.name)}
                  className="h-4 w-4 accent-blue-600 rounded"
                />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      value={draftDisplayName}
                      onChange={(e) => setDraftDisplayName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => commitRename(sheet.key, sheet.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(sheet.key, sheet.name);
                        if (e.key === 'Escape') cancelRename();
                      }}
                      className="w-full h-8 rounded-lg border border-blue-200 bg-white px-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      autoFocus
                    />
                  ) : (
                    <div className="text-sm font-medium text-slate-700 truncate">
                      {displayName}
                      {invalidCount > 0 && (
                        <span className="text-red-500 ml-1.5 font-bold">(ข้อมูลผิดพลาด)</span>
                      )}
                    </div>
                  )}
                  {hasAlias && !isEditing ? (
                    <div className="text-[10px] text-slate-400 font-medium truncate">{sheet.name}</div>
                  ) : null}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    beginRename(sheet.key, sheet.name);
                  }}
                  className="p-1 rounded-md text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 hover:bg-slate-100 transition-all"
                  title="Rename display name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(sheet.key);
                  }}
                  className={`p-1 rounded-md transition-all ${isPinned ? 'text-blue-500 opacity-100 bg-blue-50' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 hover:bg-slate-100'}`}
                >
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
