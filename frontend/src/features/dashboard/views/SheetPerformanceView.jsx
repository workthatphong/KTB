import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Maximize2, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '../../../components/shared/EmptyState.jsx';
import { buildKpisFromSegments } from '../../../lib/kpiUtils.js';
import { SheetBreakdownChart } from '../../charts/SheetBreakdownChart.jsx';
import { SheetProcessMatrix } from '../components/SheetProcessMatrix.jsx';

function ToggleSetting({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group relative">
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-[#00a4e4]' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
      <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">{children}</span>
    </label>
  );
}

function buildSheetPerformanceChartsData(segments) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const segmentsBySheet = new Map();

  safeSegments.forEach((segment) => {
    const fileName = String(segment.fileName || 'Unknown File');
    const sheetName = String(segment.pageName || '');
    const sheetKey = String(segment.sheetKey || segment.documentId || `${fileName}::${sheetName}`).trim();
    if (!sheetKey) return;
    if (!segmentsBySheet.has(sheetKey)) {
      segmentsBySheet.set(sheetKey, {
        name: sheetName || fileName,
        segments: [],
      });
    }
    segmentsBySheet.get(sheetKey).segments.push(segment);
  });

  const entries = Array.from(segmentsBySheet.values()).map((entry) => {
    const kpis = buildKpisFromSegments(entry.segments);
    return {
      name: entry.name,
      totalLeadTimeSeconds: Number(kpis.totalLeadTimeSeconds) || 0,
      activeUserTimeSeconds: Number(kpis.activeUserTimeSeconds) || 0,
      systemTimeSeconds: Number(kpis.systemTimeSeconds) || 0,
      idleWaitingSeconds: Number(kpis.idleWaitingSeconds) || 0,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return {
    totalTimeData: entries.map(e => ({ name: e.name, value: e.totalLeadTimeSeconds })),
    userTimeData: entries.map(e => ({ name: e.name, value: e.activeUserTimeSeconds })),
    systemTimeData: entries.map(e => ({ name: e.name, value: e.systemTimeSeconds })),
    idleTimeData: entries.map(e => ({ name: e.name, value: e.idleWaitingSeconds })),
  };
}

export function SheetPerformanceView({ segments, setExpandedVisualizationId }) {
  const [mergeReviewAndEdit, setMergeReviewAndEdit] = useState(false);
  const [mergeEdit, setMergeEdit] = useState(true);
  const [mergeSpread, setMergeSpread] = useState(true);
  const [isGrouping, setIsGrouping] = useState(false);
  const [showMatrixFilter, setShowMatrixFilter] = useState(false);
  const matrixFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (matrixFilterRef.current && !matrixFilterRef.current.contains(event.target)) setShowMatrixFilter(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const chartData = React.useMemo(() => buildSheetPerformanceChartsData(segments), [segments]);

  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17335f]">Sheet Performance</h1>
          <p className="text-slate-500 mt-1">Detailed performance analysis breakdown by individual sheets and pages.</p>
        </div>
      </div>

      {!segments || segments.length === 0 ? (
        <EmptyState icon={LayoutDashboard} title="No Data" subtitle="No sheet performance data available for the current filters." />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-1 overflow-visible relative hover:z-50 transition-all">
              <h2 className="text-lg font-bold mb-0 text-[#17335f]">
Total Time</h2>
              <SheetBreakdownChart data={chartData.totalTimeData} isDuration={true} />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-2 overflow-visible relative hover:z-50 transition-all">
              <h2 className="text-lg font-bold mb-0 text-[#17335f]">
User Time</h2>
              <SheetBreakdownChart data={chartData.userTimeData} isDuration={true} />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-3 overflow-visible relative hover:z-50 transition-all">
              <h2 className="text-lg font-bold mb-0 text-[#17335f]">
System Time</h2>
              <SheetBreakdownChart data={chartData.systemTimeData} isDuration={true} />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-4 overflow-visible relative hover:z-50 transition-all">
              <h2 className="text-lg font-bold mb-0 text-[#17335f]">
Idle Time</h2>
              <SheetBreakdownChart data={chartData.idleTimeData} isDuration={true} />
            </div>
          </div>

          <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-4 ${showMatrixFilter ? 'z-[120]' : 'z-10'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#17335f]">Sheet Process Breakdown</h2>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="relative" ref={matrixFilterRef}>
                  <button 
                    onClick={() => setShowMatrixFilter(!showMatrixFilter)} 
                    className={`p-1.5 border rounded-md transition-colors bg-white ${showMatrixFilter ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  {showMatrixFilter && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[130] dropdown-slide-enter">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Process Settings</div>
                      <div className="space-y-3">
                        <ToggleSetting checked={isGrouping} onChange={() => setIsGrouping(!isGrouping)}>Grouping (User/System/Idle)</ToggleSetting>
                        <div className="h-px bg-slate-100 my-1" />
                        <ToggleSetting checked={mergeReviewAndEdit} onChange={() => setMergeReviewAndEdit(!mergeReviewAndEdit)}>Merge Review & Edit</ToggleSetting>
                        <ToggleSetting checked={mergeEdit} onChange={() => setMergeEdit(!mergeEdit)}>Merge Edit</ToggleSetting>
                        <ToggleSetting checked={mergeSpread} onChange={() => setMergeSpread(!mergeSpread)}>Merge Spread</ToggleSetting>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setExpandedVisualizationId('sheet-matrix')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <SheetProcessMatrix 
                segments={segments} 
                maxVisibleRows={4} 
                externalMergeReviewAndEdit={mergeReviewAndEdit}
                externalMergeEdit={mergeEdit}
                externalMergeSpread={mergeSpread}
                isGrouping={isGrouping}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

