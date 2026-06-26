// @ts-nocheck
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';

export function DocumentPresetPopover({
  open,
  anchorRect,
  presets,
  onClose,
  onCreatePreset,
  onApplyPreset,
  onRenamePreset,
  onDeletePreset,
}) {
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, maxHeight: 0 });
  const [isCreating, setIsCreating] = useState(false);
  const [draftCreateName, setDraftCreateName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState('');
  const [draftName, setDraftName] = useState('');
  const [pendingPreset, setPendingPreset] = useState(null);

  const sortedPresets = useMemo(
    () => [...(presets || [])].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [presets],
  );

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      if (!anchorRect) return;

      const isMobileViewport = window.innerWidth <= 639;
      const viewportPadding = 8;
      const top = Math.max(viewportPadding, anchorRect.bottom + 8);
      const panelWidth = panelRef.current?.offsetWidth || (isMobileViewport ? window.innerWidth - 16 : 304);
      const maxHeight = Math.max(160, window.innerHeight - top - viewportPadding);

      if (isMobileViewport) {
        setPanelStyle({
          top,
          left: viewportPadding,
          right: viewportPadding,
          width: 'auto',
          maxHeight,
        });
        return;
      }

      const left = Math.max(
        viewportPadding,
        Math.min(anchorRect.right - panelWidth, window.innerWidth - panelWidth - viewportPadding),
      );

      setPanelStyle({ top, left, maxHeight });
    };

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRect, open]);

  useEffect(() => {
    if (!open) return undefined;

    const onMouseDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setIsCreating(false);
      setDraftCreateName('');
      setEditingPresetId('');
      setDraftName('');
    }
  }, [open]);

  useEffect(() => {
    if (!editingPresetId) return undefined;
    const activePreset = sortedPresets.find((preset) => preset.id === editingPresetId);
    setDraftName(activePreset?.name || '');
    return undefined;
  }, [editingPresetId, sortedPresets]);

  const beginEdit = (preset) => {
    setEditingPresetId(preset.id);
    setDraftName(preset.name || '');
  };

  const beginCreate = () => {
    setIsCreating(true);
    setDraftCreateName('');
    setEditingPresetId('');
    setDraftName('');
  };

  const commitCreate = () => {
    const nextName = String(draftCreateName || '').trim();
    onCreatePreset(nextName);
    setIsCreating(false);
    setDraftCreateName('');
  };

  const commitEdit = () => {
    if (!editingPresetId) return;
    const nextName = String(draftName || '').trim();
    const activePreset = sortedPresets.find((preset) => preset.id === editingPresetId);
    if (activePreset) {
      onRenamePreset(activePreset.id, nextName || activePreset.name);
    }
    setEditingPresetId('');
    setDraftName('');
  };

  const cancelEdit = () => {
    setEditingPresetId('');
    setDraftName('');
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setDraftCreateName('');
  };

  const handleUsePreset = (preset) => {
    if (pendingPreset) return;
    setPendingPreset(preset);
    onClose();
  };

  const handleExitComplete = () => {
    if (!pendingPreset) return;
    onApplyPreset(pendingPreset);
    setPendingPreset(null);
  };

  return createPortal(
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[230] bg-transparent"
          onMouseDown={onClose}
        />
      ) : null}
      <AnimatePresence onExitComplete={handleExitComplete}>
        {open ? (
        <motion.div
          ref={panelRef}
          style={panelStyle}
          className="document-preset-popover fixed z-[240] w-[304px] max-w-[calc(100vw-16px)] overflow-hidden rounded-2xl border border-[#d7e8f6] bg-white shadow-[0_20px_45px_-18px_rgba(15,23,42,0.28)]"
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Presets</div>
            <div className="flex items-center gap-1">
              <button
                onClick={beginCreate}
                className="h-8 w-8 rounded-lg text-slate-400 hover:bg-[#eef8fd] hover:text-[#3860be] transition-colors inline-flex items-center justify-center"
                title="New preset"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors inline-flex items-center justify-center"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[280px] overflow-y-auto no-scrollbar p-2">
            <div className="space-y-1">
              {isCreating ? (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5"
                >
                  <input
                    autoFocus
                    value={draftCreateName}
                    onChange={(e) => setDraftCreateName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitCreate();
                      if (e.key === 'Escape') cancelCreate();
                    }}
                    placeholder="Preset name"
                    className="h-8 min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    onClick={commitCreate}
                    className="h-8 px-2 rounded-lg text-[11px] font-semibold text-[#3860be] hover:bg-[#eef8fd] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelCreate}
                    className="h-8 px-2 rounded-lg text-[11px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              ) : null}

              {sortedPresets.map((preset) => {
                  const isEditing = editingPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50"
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="h-8 min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      ) : (
                        <button
                          onClick={() => handleUsePreset(preset)}
                          className="min-w-0 flex-1 truncate rounded-lg px-1 py-1.5 text-left text-sm font-medium text-slate-700 hover:text-[#17335f]"
                          title="Apply preset"
                        >
                          {preset.name}
                        </button>
                      )}

                      {isEditing ? (
                        <>
                          <button
                            onClick={commitEdit}
                            className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 inline-flex items-center justify-center transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 inline-flex items-center justify-center transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => beginEdit(preset)}
                            className="h-8 w-8 rounded-lg text-slate-300 opacity-100 transition-colors hover:bg-slate-100 hover:text-slate-600 md:opacity-0 md:group-hover:opacity-100 inline-flex items-center justify-center"
                            title="Rename"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeletePreset(preset.id)}
                            className="h-8 w-8 rounded-lg text-slate-300 opacity-100 transition-colors hover:bg-rose-50 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 inline-flex items-center justify-center"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}
