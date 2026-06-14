import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

export function ExportConfirmModal({ isOpen, onClose, onConfirm, count }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
        <FileSpreadsheet className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Export to Excel</h3>
        <p className="text-slate-500 mb-8">Export {count} segments?</p>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 border rounded-xl font-bold">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Export</button>
        </div>
      </div>
    </div>
  );
}
