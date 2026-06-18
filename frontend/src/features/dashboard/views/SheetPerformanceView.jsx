import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Maximize2, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '../../../components/shared/EmptyState.jsx';
import { SheetBreakdownChart } from '../../charts/SheetBreakdownChart.jsx';
import {
  buildSheetPerformanceChartsData,
  getTotalTimeChartAppearance,
  getUserTimeChartAppearance,
  getSystemTimeChartAppearance,
  getIdleTimeChartAppearance,
  selectUserTimeChartData,
  selectTotalTimeChartData,
  selectSystemTimeChartData,
  selectIdleTimeChartData,
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

export function SheetPerformanceView({ segments, unfilteredSegments, setExpandedVisualizationId, chartSettings, setChartSettings }) {
  const [openChartFilterId, setOpenChartFilterId] = useState('');
  const chartFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chartFilterRef.current && !chartFilterRef.current.contains(event.target)) setOpenChartFilterId('');
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const chartData = React.useMemo(() => buildSheetPerformanceChartsData(segments), [segments]);
  const unfilteredChartData = React.useMemo(() => buildSheetPerformanceChartsData(unfilteredSegments), [unfilteredSegments]);

  const fileLevelAverages = React.useMemo(() => {
    const calcAvg = (data, selectFn, mode) => {
      const selected = selectFn(data, mode);
      if (selected.length === 0) return 0;
      return selected.reduce((sum, item) => sum + (Number(item.value) || 0), 0) / selected.length;
    };

    return {
      totalTime: calcAvg(unfilteredChartData.totalTimeData, selectTotalTimeChartData, chartSettings?.totalTime?.mode),
      userTime: calcAvg(unfilteredChartData.userTimeData, selectUserTimeChartData, chartSettings?.userTime?.mode),
      systemTime: calcAvg(unfilteredChartData.systemTimeData, selectSystemTimeChartData, chartSettings?.systemTime?.mode),
      idleTime: calcAvg(unfilteredChartData.idleTimeData, selectIdleTimeChartData, chartSettings?.idleTime?.mode),
    };
  }, [unfilteredChartData, chartSettings]);

  const displayedChartData = React.useMemo(() => ({
    totalTimeData: sortSheetPerformanceChartData(selectTotalTimeChartData(chartData.totalTimeData, chartSettings?.totalTime?.mode), chartSettings?.totalTime?.sortOrder),
    userTimeData: sortSheetPerformanceChartData(selectUserTimeChartData(chartData.userTimeData, chartSettings?.userTime?.mode), chartSettings?.userTime?.sortOrder),
    systemTimeData: sortSheetPerformanceChartData(selectSystemTimeChartData(chartData.systemTimeData, chartSettings?.systemTime?.mode), chartSettings?.systemTime?.sortOrder),
    idleTimeData: sortSheetPerformanceChartData(selectIdleTimeChartData(chartData.idleTimeData, chartSettings?.idleTime?.mode), chartSettings?.idleTime?.sortOrder),
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

  const toggleUserTimeMode = (mode) => {
    const currentMode = chartSettings?.userTime?.mode || 'all';
    updateChartSetting('userTime', {
      mode: currentMode === mode ? 'all' : mode,
    });
  };

  const toggleSystemTimeMode = (mode) => {
    const currentMode = chartSettings?.systemTime?.mode || 'all';
    updateChartSetting('systemTime', {
      mode: currentMode === mode ? 'all' : mode,
    });
  };

  const toggleIdleTimeMode = (mode) => {
    const currentMode = chartSettings?.idleTime?.mode || 'all';
    updateChartSetting('idleTime', {
      mode: currentMode === mode ? 'all' : mode,
    });
  };

  const toggleTotalTimeMode = (mode) => {
    const currentMode = chartSettings?.totalTime?.mode || 'all';
    updateChartSetting('totalTime', {
      mode: currentMode === mode ? 'all' : mode,
    });
  };

  const chartCards = [
    { id: 'totalTime', title: 'Total Time', expandedId: 'sheet-total-time', data: displayedChartData.totalTimeData, forcedAverage: fileLevelAverages.totalTime },
    { id: 'userTime', title: 'User Time', expandedId: 'sheet-user-time', data: displayedChartData.userTimeData, forcedAverage: fileLevelAverages.userTime },
    { id: 'systemTime', title: 'System Time', expandedId: 'sheet-system-time', data: displayedChartData.systemTimeData, forcedAverage: fileLevelAverages.systemTime },
    { id: 'idleTime', title: 'Idle Time', expandedId: 'sheet-idle-time', data: displayedChartData.idleTimeData, forcedAverage: fileLevelAverages.idleTime },
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
              const settings = chartSettings?.[card.id] || { showAverageLine: true, sortOrder: 'default', mode: 'all' };
              const totalTimeAppearance = card.id === 'totalTime' && settings.mode !== 'all'
                ? getTotalTimeChartAppearance(settings.mode)
                : null;
              const userTimeAppearance = card.id === 'userTime' && settings.mode !== 'all'
                ? getUserTimeChartAppearance(settings.mode)
                : null;
              const systemTimeAppearance = card.id === 'systemTime' && settings.mode !== 'all'
                ? getSystemTimeChartAppearance(settings.mode)
                : null;
              const idleTimeAppearance = card.id === 'idleTime' && settings.mode !== 'all'
                ? getIdleTimeChartAppearance(settings.mode)
                : null;
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
                              {card.id === 'totalTime' && (
                                <div>
                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Time Filter</div>
                                  <div className="space-y-3">
                                    <ToggleSetting checked={settings.mode === 'complete'} onChange={() => toggleTotalTimeMode('complete')}>
                                      Complete Only
                                    </ToggleSetting>
                                  </div>
                                </div>
                              )}
                              {card.id === 'userTime' && (
                                <div>
                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">User Time Filter</div>
                                  <div className="space-y-3">
                                    <ToggleSetting checked={settings.mode === 'review'} onChange={() => toggleUserTimeMode('review')}>
                                      Review Only
                                    </ToggleSetting>
                                    <ToggleSetting checked={settings.mode === 'upload'} onChange={() => toggleUserTimeMode('upload')}>
                                      Upload Only
                                    </ToggleSetting>
                                    <ToggleSetting checked={settings.mode === 'editData'} onChange={() => toggleUserTimeMode('editData')}>
                                      Edit Data Only
                                    </ToggleSetting>
                                    <ToggleSetting checked={settings.mode === 'editMeta'} onChange={() => toggleUserTimeMode('editMeta')}>
                                      Edit Meta Only
                                    </ToggleSetting>
                                  </div>
                                </div>
                              )}
                              {card.id === 'systemTime' && (
                                <div>
                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">System Time Filter</div>
                                  <div className="space-y-3">
                                    <ToggleSetting checked={settings.mode === 'firstSpread'} onChange={() => toggleSystemTimeMode('firstSpread')}>
                                      First Spread Only
                                    </ToggleSetting>
                                    <ToggleSetting checked={settings.mode === 'secondSpread'} onChange={() => toggleSystemTimeMode('secondSpread')}>
                                      Second Spread Only
                                    </ToggleSetting>
                                  </div>
                                </div>
                              )}
                              {card.id === 'idleTime' && (
                                <div>
                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Idle Time Filter</div>
                                  <div className="space-y-3">
                                    <ToggleSetting checked={settings.mode === 'firstSpread'} onChange={() => toggleIdleTimeMode('firstSpread')}>
                                      First Spread Only
                                    </ToggleSetting>
                                    <ToggleSetting checked={settings.mode === 'secondSpread'} onChange={() => toggleIdleTimeMode('secondSpread')}>
                                      Second Spread Only
                                    </ToggleSetting>
                                    <ToggleSetting checked={settings.mode === 'avgReviewEdit'} onChange={() => toggleIdleTimeMode('avgReviewEdit')}>
                                      AVG review&edit only
                                    </ToggleSetting>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setExpandedVisualizationId(card.expandedId)} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white" title="Full view"><Maximize2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <SheetBreakdownChart
                    data={card.data}
                    isDuration={true}
                    showAverageLine={settings.showAverageLine}
                    forcedAverage={card.forcedAverage}
                    activeFill={totalTimeAppearance?.activeFill ?? userTimeAppearance?.activeFill ?? systemTimeAppearance?.activeFill ?? idleTimeAppearance?.activeFill}
                    inactiveFill={totalTimeAppearance?.inactiveFill ?? userTimeAppearance?.inactiveFill ?? systemTimeAppearance?.inactiveFill ?? idleTimeAppearance?.inactiveFill}
                    valueLabelFill={totalTimeAppearance?.valueLabelFill ?? userTimeAppearance?.valueLabelFill ?? systemTimeAppearance?.valueLabelFill ?? idleTimeAppearance?.valueLabelFill}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
