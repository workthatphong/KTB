// @ts-nocheck
import React from 'react';
import { Clock, User, Server, X, FileText, RefreshCw } from 'lucide-react';
import { formatDuration, toDisplayDate, toGanttSegmentTypeLabel } from '@/lib/utils';

export function SegmentDetailPopup({ segment, onClose }) {
  if (!segment) return null;

  const isSystem = segment.actorType === 'System' || (segment.userName || '').toLowerCase() === 'system';
  const sourceLabel = segment.fileName || 'System Log';
  const pageLabel = segment.pageName ? `${sourceLabel} / ${segment.pageName}` : sourceLabel;
  const timeRangeLabel = `${toDisplayDate(segment.displayStart || segment.start)} - ${toDisplayDate(segment.displayEnd || segment.end)}`;
  
  // Decorative type label based on segment type
  const getTypeTag = () => {
    if (isSystem) return { label: 'Automated Process', bg: 'bg-slate-100', text: 'text-slate-600', icon: Server };
    if (segment.segmentType?.includes('EDIT')) return { label: 'User Correction', bg: 'bg-amber-50', text: 'text-amber-700', icon: RefreshCw };
    if (segment.segmentType?.includes('COMPLETE') || segment.segmentType?.includes('APPROVAL')) return { label: 'Final Approval', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: RefreshCw };
    return { label: 'User Interaction', bg: 'bg-blue-50', text: 'text-blue-700', icon: User };
  };

  const tag = getTypeTag();
  const IconComponent = tag.icon || User;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 confirm-overlay-enter" onClick={onClose}>
      <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[24px] md:rounded-[32px] shadow-2xl confirm-panel-enter" onClick={e => e.stopPropagation()}>
        <div className="p-5 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 md:mb-8">
            <div className="space-y-1.5 min-w-0 pr-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${tag.bg} ${tag.text} text-[10px] font-bold uppercase tracking-wider mb-2`}>
                <IconComponent className="w-3 h-3" />
                {tag.label}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#17335f] leading-tight truncate">
                {toGanttSegmentTypeLabel(segment.segmentType)}
              </h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
          
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="p-4 md:p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80">
                <div className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Actor
                </div>
                <div className="text-sm md:text-base font-bold text-[#17335f] truncate">
                  {segment.userName || 'System Auto'}
                </div>
                <div className="text-[10px] md:text-xs text-slate-400 mt-0.5 font-medium">{isSystem ? 'System' : 'User'}</div>
              </div>

              <div className="p-4 md:p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80">
                <div className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Duration
                </div>
                <div className="text-sm md:text-base font-bold text-[#00a4e4]">
                  {formatDuration(segment.durationSeconds)}
                </div>
              </div>

              <div className="p-4 md:p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80">
                <div className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  Source
                </div>
                <div className="text-sm md:text-base font-bold text-[#17335f] break-all line-clamp-2">
                  {pageLabel}
                </div>
              </div>

              <div className="p-4 md:p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80">
                <div className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Time Range
                </div>
                <div className="text-[11px] md:text-[13px] font-bold text-slate-700 break-words">
                  {timeRangeLabel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
