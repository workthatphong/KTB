import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Maximize2, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '../../../components/shared/EmptyState.jsx';
import { SheetBreakdownChart } from '../../charts/SheetBreakdownChart.jsx';
import { SheetProcessMatrix } from '../components/SheetProcessMatrix.jsx';
import {
  buildSheetPerformanceChartsData,
  sortSheetPerformanceChartData,
} from '../utils/sheetPerformanceCharts.js';

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

export function SheetPerformanceView({ segments, setExpandedVisualizationId, chartSettings, setChartSettings }) {
  const [mergeSpread, setMergeSpread] = useState(true);
  const [showIdleTime, setShowIdleTime] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [mergeEdit, setMergeEdit] = useState(true);
  const [showMatrixFilter, setShowMatrixFilter] = useState(false);
  const [openChartFilterId, setOpenChartFilterId] = useState('');
  const matrixFilterRef = useRef(null);
  const chartFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (matrixFilterRef.current && !matrixFilterRef.current.contains(event.target)) setShowMatrixFilter(false);
      if (chartFilterRef.current && !chartFilterRef.current.contains(event.target)) setOpenChartFilterId('');
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const chartData = React.useMemo(() => buildSheetPerformanceChartsData(segments), [segments]);
  const displayedChartData = React.useMemo(() => ({
    totalTimeData: sortSheetPerformanceChartData(chartData.totalTimeData, chartSettings?.totalTime?.sortOrder),
    userTimeData: sortSheetPerformanceChartData(chartData.userTimeData, chartSettings?.userTime?.sortOrder),
    systemTimeData: sortSheetPerformanceChartData(chartData.systemTimeData, chartSettings?.systemTime?.sortOrder),
    idleTimeData: sortSheetPerformanceChartData(chartData.idleTimeData, chartSettings?.idleTime?.sortOrder),
  }), [chartData, chartSettings]);

  const updateChartSetting = (chartId, patch) => {
    setChartSettings((current) => ({
      ...current,
      [chartId]: {
        ...current[chartId],
        ...patch,
      },
    }));
  };

  const toggleChartSortOrder = (chartId, sortOrder) => {
    const currentSortOrder = chartSettings?.[chartId]?.sortOrder || 'default';
    updateChartSetting(chartId, {
      sortOrder: currentSortOrder === sortOrder ? 'default' : sortOrder,
    });
  };

  const chartCards = [
    { id: 'totalTime', title: 'Total Time', expandedId: 'sheet-total-time', data: displayedChartData.totalTimeData },
    { id: 'userTime', title: 'User Time', expandedId: 'sheet-user-time', data: displayedChartData.userTimeData },
    { id: 'systemTime', title: 'System Time', expandedId: 'sheet-system-time', data: displayedChartData.systemTimeData },
    { id: 'idleTime', title: 'Idle Time', expandedId: 'sheet-idle-time', data: displayedChartData.idleTimeData },
  ];

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
            {chartCards.map((card, index) => {
              const settings = chartSettings?.[card.id] || { showAverageLine: true, sortOrder: 'default' };
              return (
                <div key={card.id} className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-${index + 1} overflow-visible relative hover:z-50 transition-all group`}>
                  <div className="mb-0 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-[#17335f]">{card.title}</h2>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative" ref={openChartFilterId === card.id ? chartFilterRef : null}>
                        <button
                          onClick={() => setOpenChartFilterId((current) => current === card.id ? '' : card.id)}
                          className={`p-1.5 border rounded-md transition-colors bg-white ${openChartFilterId === card.id ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
                          title="Filter"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                        {openChartFilterId === card.id && (
                          <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[130] dropdown-slide-enter">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Chart Settings</div>
                            <div className="space-y-4">
                              <ToggleSetting checked={settings.showAverageLine} onChange={() => updateChartSetting(card.id, { showAverageLine: !settings.showAverageLine })}>
                                Show Avg Line
                              </ToggleSetting>
                              <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sort Order</div>
                                <div className="space-y-3">
                                  <ToggleSetting checked={settings.sortOrder === 'desc'} onChange={() => toggleChartSortOrder(card.id, 'desc')}>
                                    High to Low
                                  </ToggleSetting>
                                  <ToggleSetting checked={settings.sortOrder === 'asc'} onChange={() => toggleChartSortOrder(card.id, 'asc')}>
                                    Low to High
                                  </ToggleSetting>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setExpandedVisualizationId(card.expandedId)} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="Full view"><Maximize2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <SheetBreakdownChart data={card.data} isDuration={true} showAverageLine={settings.showAverageLine} />
                </div>
              );
            })}
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
                        <ToggleSetting checked={mergeEdit} onChange={() => setMergeEdit(!mergeEdit)}>Merge Edit</ToggleSetting>
                        <ToggleSetting checked={mergeSpread} onChange={() => setMergeSpread(!mergeSpread)}>Merge Spread</ToggleSetting>
                        <ToggleSetting checked={showUpload} onChange={() => setShowUpload(!showUpload)}>Show Upload</ToggleSetting>
                        <ToggleSetting checked={showIdleTime} onChange={() => setShowIdleTime(!showIdleTime)}>Show Idle Time</ToggleSetting>
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
                externalMergeEdit={mergeEdit}
                externalMergeSpread={mergeSpread}
                externalShowUpload={showUpload}
                externalShowIdleTime={showIdleTime}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
