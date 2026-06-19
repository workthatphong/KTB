import React from 'react';
import { ChevronRight, Pencil, Pin } from 'lucide-react';
import { DropdownSearch } from '@/components/shared/DropdownSearch.jsx';

export function DocumentFileListColumn({
  filteredDocumentTree,
  documentFileSearch,
  setDocumentFileSearch,
  selectedFiles,
  selectedSheets,
  activeDocumentFile,
  setActiveDocumentFile,
  fileDisplayNames,
  getDocumentFileSelectionState,
  pinnedFileSet,
  onToggleFileSelection,
  onTogglePin,
  onRenameFile,
  onClearSelection,
  fullWidth = false,
}) {
  const [editingFileName, setEditingFileName] = React.useState('');
  const [draftDisplayName, setDraftDisplayName] = React.useState('');
  const checkboxRefs = React.useRef({});

  React.useEffect(() => {
    filteredDocumentTree.forEach((item) => {
      const checkbox = checkboxRefs.current[item.fileName];
      if (!checkbox) return;
      const selectionState = getDocumentFileSelectionState({
        fileName: item.fileName,
        sheetCount: item.sheets.length,
        selectedFiles,
        selectedSheets,
      });
      checkbox.indeterminate = selectionState.indeterminate;
    });
  }, [filteredDocumentTree, getDocumentFileSelectionState, selectedFiles, selectedSheets]);

  const beginRename = (fileName) => {
    setEditingFileName(fileName);
    setDraftDisplayName(String(fileDisplayNames?.[fileName] || fileName));
  };

  const cancelRename = () => {
    setEditingFileName('');
    setDraftDisplayName('');
  };

  const commitRename = () => {
    if (!editingFileName) return;
    onRenameFile(editingFileName, draftDisplayName);
    cancelRename();
  };

  return (
    <div className={`${fullWidth ? 'w-full' : 'w-1/2'} flex flex-col`}>
      <div className="p-3 border-b border-slate-50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Source Files</div>
          <button
            onClick={onClearSelection}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        </div>
        <DropdownSearch value={documentFileSearch} onChange={setDocumentFileSearch} placeholder="Search files..." />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
        {filteredDocumentTree.map((item) => {
          const selectionState = getDocumentFileSelectionState({
            fileName: item.fileName,
            sheetCount: item.sheets.length,
            selectedFiles,
            selectedSheets,
          });
          const isPinned = pinnedFileSet.has(item.fileName);
          const displayName = fileDisplayNames?.[item.fileName] || item.fileName;
          const isEditing = editingFileName === item.fileName;
          const hasAlias = displayName !== item.fileName;
          return (
            <div
              key={item.fileName}
              onClick={() => setActiveDocumentFile(item.fileName)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${activeDocumentFile === item.fileName ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
            >
              <input
                ref={(node) => {
                  checkboxRefs.current[item.fileName] = node;
                }}
                type="checkbox"
                checked={selectionState.checked}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleFileSelection(item.fileName, selectionState.checked || selectionState.indeterminate);
                }}
                className="h-4 w-4 accent-blue-600 rounded"
              />
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    value={draftDisplayName}
                    onChange={(e) => setDraftDisplayName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') cancelRename();
                    }}
                    className="w-full h-8 rounded-lg border border-blue-200 bg-white px-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    autoFocus
                  />
                ) : (
                  <div className={`text-sm font-medium truncate ${activeDocumentFile === item.fileName ? 'text-blue-700' : 'text-slate-700'}`}>
                    {displayName}
                  </div>
                )}
                {hasAlias && !isEditing ? (
                  <div className="text-[10px] text-slate-400 font-medium truncate">{item.fileName}</div>
                ) : null}
                <div className="text-[10px] text-slate-400 font-medium">{item.sheets.length} sheets</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    beginRename(item.fileName);
                  }}
                  className="p-1 rounded-md text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 hover:bg-slate-100 transition-all"
                  title="Rename display name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(item.fileName);
                  }}
                  className={`p-1 rounded-md transition-all ${isPinned ? 'text-blue-500 opacity-100 bg-blue-50' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 hover:bg-slate-100'}`}
                >
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                </button>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeDocumentFile === item.fileName ? 'text-blue-400 translate-x-0.5' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
