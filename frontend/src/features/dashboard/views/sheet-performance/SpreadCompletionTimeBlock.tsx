// @ts-nocheck
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, SlidersHorizontal } from 'lucide-react';
import { SheetBreakdownChart } from '../../../charts/SheetBreakdownChart';
import { buildAllTimeData, buildSpreadCompletionTimeData, buildSpread2ToFinalActionData } from '../SheetPerformanceUtils';
import { ToggleSetting } from '../../components/dashboard-view/DashboardViewPanels';
import { usePersistentState } from '@/hooks/usePersistentState';

export function SpreadCompletionTimeBlock({
  firstDocumentFilterName,
  firstSegments,
  secondDocumentFilterName,
  secondSegments,
  firstSegmentsSet1,
  firstSegmentsSet2,
  secondSegmentsSet1,
  secondSegmentsSet2,
  firstDocument1Set1Name,
  firstDocument1Set2Name,
  secondDocument2Set1Name,
  secondDocument2Set2Name,
  firstPanelId,
  secondPanelId,
  isTransparentPopup,
  systemTaskType
}) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortOrder, setSortOrder] = usePersistentState('sheet_perf_spread_sortOrder', 'default'); // 'default', 'asc', 'desc'
  const [useTaskTypeFilter, setUseTaskTypeFilter] = usePersistentState('sheet_perf_spread_useTaskTypeFilter', false);
  const [useIdleFilter, setUseIdleFilter] = usePersistentState('sheet_perf_spread_useIdleFilter', false);
  const [metricType, setMetricType] = usePersistentState('sheet_perf_spread_metricType', 'spread1to2'); // 'spread1to2', 'spread2tofinal' or 'alltime'
  const [isGroupedView, setIsGroupedView] = usePersistentState('sheet_perf_spread_groupedView', false);
  const [comparisonMode, setComparisonMode] = usePersistentState('sheet_perf_spread_comparisonMode', 'documents');
  
  const sortMenuRef = useRef(null);
  const sortMenuPanelRef = useRef(null);
  const [sortMenuStyle, setSortMenuStyle] = useState({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target) && (!sortMenuPanelRef.current || !sortMenuPanelRef.current.contains(event.target))) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showSortMenu) return;
    const updatePosition = () => {
      if (!sortMenuRef.current) return;
      const rect = sortMenuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const panelWidth = 240; 
      let top, bottom, right;
      let maxHeight = 0;
      const preferredMaxHeight = window.innerHeight * 0.8;
      
      if (spaceBelow > 350 || spaceBelow >= spaceAbove) {
        top = rect.bottom + 8;
        maxHeight = Math.min(spaceBelow - 16, preferredMaxHeight);
      } else {
        bottom = window.innerHeight - rect.top + 8;
        maxHeight = Math.min(spaceAbove - 16, preferredMaxHeight);
      }

      right = window.innerWidth - rect.right;

      setSortMenuStyle({
        top: top !== undefined ? `${top}px` : 'auto',
        bottom: bottom !== undefined ? `${bottom}px` : 'auto',
        right: `${right}px`,
        maxHeight: `${maxHeight}px`,
        width: `${panelWidth}px`
      });
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showSortMenu]);

  const comparisonConfig = useMemo(() => {
    const configs = {
      documents: {
        leftTitle: firstDocumentFilterName || 'First documents',
        rightTitle: secondDocumentFilterName || 'Second Documents',
        leftSegments: firstSegments || [],
        rightSegments: secondSegments || [],
      },
      first_document_sets: {
        leftTitle: `${firstDocumentFilterName || 'First documents'} ${firstDocument1Set1Name || 'Set 1'}`,
        rightTitle: `${firstDocumentFilterName || 'First documents'} ${firstDocument1Set2Name || 'Set 2'}`,
        leftSegments: firstSegmentsSet1 || [],
        rightSegments: firstSegmentsSet2 || [],
      },
      second_document_sets: {
        leftTitle: `${secondDocumentFilterName || 'Second Documents'} ${secondDocument2Set1Name || 'Set 1'}`,
        rightTitle: `${secondDocumentFilterName || 'Second Documents'} ${secondDocument2Set2Name || 'Set 2'}`,
        leftSegments: secondSegmentsSet1 || [],
        rightSegments: secondSegmentsSet2 || [],
      },
      set1_across_documents: {
        leftTitle: `${firstDocumentFilterName || 'First documents'} ${firstDocument1Set1Name || 'Set 1'}`,
        rightTitle: `${secondDocumentFilterName || 'Second Documents'} ${secondDocument2Set1Name || 'Set 1'}`,
        leftSegments: firstSegmentsSet1 || [],
        rightSegments: secondSegmentsSet1 || [],
      },
      set2_across_documents: {
        leftTitle: `${firstDocumentFilterName || 'First documents'} ${firstDocument1Set2Name || 'Set 2'}`,
        rightTitle: `${secondDocumentFilterName || 'Second Documents'} ${secondDocument2Set2Name || 'Set 2'}`,
        leftSegments: firstSegmentsSet2 || [],
        rightSegments: secondSegmentsSet2 || [],
      },
    };

    return configs[comparisonMode] || configs.documents;
  }, [
    comparisonMode,
    firstDocumentFilterName,
    secondDocumentFilterName,
    firstSegments,
    secondSegments,
    firstSegmentsSet1,
    firstSegmentsSet2,
    secondSegmentsSet1,
    secondSegmentsSet2,
    firstDocument1Set1Name,
    firstDocument1Set2Name,
    secondDocument2Set1Name,
    secondDocument2Set2Name,
  ]);

  const processData = (rawData) => {
    if (!rawData) return [];
    let arr = rawData.map(d => ({
      ...d,
      value: useTaskTypeFilter
          ? (d.filteredValue || 0)
          : useIdleFilter
            ? (d.idleValue || 0)
            : d.value
    }));
    if (sortOrder === 'asc') {
      arr.sort((a, b) => (a.value || 0) - (b.value || 0));
    } else if (sortOrder === 'desc') {
      arr.sort((a, b) => (b.value || 0) - (a.value || 0));
    }
    return arr;
  };

  const { userData: rawFirstData } = useMemo(() => {
    return metricType === 'spread1to2' 
      ? buildSpreadCompletionTimeData(comparisonConfig.leftSegments, systemTaskType)
      : metricType === 'spread2tofinal'
        ? buildSpread2ToFinalActionData(comparisonConfig.leftSegments, systemTaskType)
        : buildAllTimeData(comparisonConfig.leftSegments, systemTaskType);
  }, [comparisonConfig.leftSegments, systemTaskType, metricType]);

  const { userData: rawSecondData } = useMemo(() => {
    return metricType === 'spread1to2' 
      ? buildSpreadCompletionTimeData(comparisonConfig.rightSegments, systemTaskType)
      : metricType === 'spread2tofinal'
        ? buildSpread2ToFinalActionData(comparisonConfig.rightSegments, systemTaskType)
        : buildAllTimeData(comparisonConfig.rightSegments, systemTaskType);
  }, [comparisonConfig.rightSegments, systemTaskType, metricType]);

  const { userData: rawGroupedData } = useMemo(() => {
    if (!isGroupedView) return { userData: [] };
    const allSegments = [...(comparisonConfig.leftSegments || []), ...(comparisonConfig.rightSegments || [])];
    return metricType === 'spread1to2' 
      ? buildSpreadCompletionTimeData(allSegments, systemTaskType, true)
      : metricType === 'spread2tofinal'
        ? buildSpread2ToFinalActionData(allSegments, systemTaskType, true)
        : buildAllTimeData(allSegments, systemTaskType);
  }, [isGroupedView, comparisonConfig.leftSegments, comparisonConfig.rightSegments, systemTaskType, metricType]);

  const firstData = useMemo(() => processData(rawFirstData), [rawFirstData, sortOrder, useTaskTypeFilter, useIdleFilter, metricType]);
  const secondData = useMemo(() => processData(rawSecondData), [rawSecondData, sortOrder, useTaskTypeFilter, useIdleFilter, metricType]);
  const groupedData = useMemo(() => processData(rawGroupedData), [rawGroupedData, sortOrder, useTaskTypeFilter, useIdleFilter, metricType]);

  const taskTypeLabel = systemTaskType === 'all' ? 'Review & Edit Data Time' : 
                        systemTaskType === 'editData' ? 'Edit Data Time' : 
                        systemTaskType === 'editDataRecord' ? 'Edit Data Record' : 
                        systemTaskType === 'reviewRecord' ? 'Review Count' : 
                        'Review time';

  const isCountMetric = useTaskTypeFilter && (systemTaskType === 'editDataRecord' || systemTaskType === 'reviewRecord');
  const isDurationMetric = !isCountMetric;

  const prefixTitle = metricType === 'spread1to2' ? 'Spread 1 to Spread 2' : metricType === 'spread2tofinal' ? 'Spread 2 To Final Action' : 'All time';

  const chartTitle = useTaskTypeFilter 
    ? `${prefixTitle} ${taskTypeLabel} By Sheet` 
    : useIdleFilter 
      ? `${prefixTitle} Idle only By Sheet` 
      : `${prefixTitle} Completion Time By Sheet`;

  return (
    <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col relative group animate-stagger-2 ${showSortMenu ? 'z-[9999]' : 'z-10'}`}>
      <div className="absolute right-4 top-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative" ref={sortMenuRef}>
          <button onClick={() => setShowSortMenu(!showSortMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showSortMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`} title="Display & Sort">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          {showSortMenu && createPortal(
            <div 
              ref={sortMenuPanelRef}
              style={sortMenuStyle}
              className={`fixed rounded-2xl border shadow-2xl p-4 z-[99999] overflow-y-auto custom-scrollbar dropdown-slide-enter ${isTransparentPopup ? 'bg-white/30 border-slate-200/30' : 'bg-white border-slate-200'}`}
            >
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Display & Sort</div>
              <div className="flex flex-col gap-3">
                <ToggleSetting checked={isGroupedView} onChange={() => setIsGroupedView(prev => !prev)}>
                  Group into Single Chart
                </ToggleSetting>
                <div className="border-t border-slate-100 my-1"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1.5">Comparison</div>
                <ToggleSetting checked={comparisonMode === 'documents'} onChange={() => setComparisonMode('documents')}>
                  Docs
                </ToggleSetting>
                <ToggleSetting checked={comparisonMode === 'first_document_sets'} onChange={() => setComparisonMode('first_document_sets')}>
                  Doc 1 Sets
                </ToggleSetting>
                <ToggleSetting checked={comparisonMode === 'second_document_sets'} onChange={() => setComparisonMode('second_document_sets')}>
                  Doc 2 Sets
                </ToggleSetting>
                <ToggleSetting checked={comparisonMode === 'set1_across_documents'} onChange={() => setComparisonMode('set1_across_documents')}>
                  Set 1 Cross
                </ToggleSetting>
                <ToggleSetting checked={comparisonMode === 'set2_across_documents'} onChange={() => setComparisonMode('set2_across_documents')}>
                  Set 2 Cross
                </ToggleSetting>
                <div className="border-t border-slate-100 my-1"></div>
                <ToggleSetting checked={sortOrder === 'desc'} onChange={() => setSortOrder(prev => prev === 'desc' ? 'default' : 'desc')}>
                  Highest First
                </ToggleSetting>
                <ToggleSetting checked={sortOrder === 'asc'} onChange={() => setSortOrder(prev => prev === 'asc' ? 'default' : 'asc')}>
                  Lowest First
                </ToggleSetting>
                
                <div className="border-t border-slate-100 my-1"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Metric</div>
                <ToggleSetting 
                  checked={metricType === 'spread1to2'} 
                  onChange={() => setMetricType('spread1to2')}
                >
                  Spread 1 to Spread 2
                </ToggleSetting>
                <ToggleSetting 
                  checked={metricType === 'spread2tofinal'} 
                  onChange={() => setMetricType('spread2tofinal')}
                >
                  Spread 2 To Final Action
                </ToggleSetting>
                <ToggleSetting 
                  checked={metricType === 'alltime'} 
                  onChange={() => setMetricType('alltime')}
                >
                  All time
                </ToggleSetting>

                <div className="border-t border-slate-100 my-1"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Filters</div>
                <ToggleSetting 
                  checked={useTaskTypeFilter} 
                  onChange={() => {
                    setUseTaskTypeFilter(prev => {
                      const next = !prev;
                      if (next) setUseIdleFilter(false);
                      return next;
                    });
                  }}
                >
                  Filter by Task Type
                </ToggleSetting>
                <ToggleSetting 
                  checked={useIdleFilter} 
                  onChange={() => {
                    setUseIdleFilter(prev => {
                      const next = !prev;
                      if (next) setUseTaskTypeFilter(false);
                      return next;
                    });
                  }}
                >
                  Idle only
                </ToggleSetting>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      <h2 className="text-xl font-extrabold text-[#17335f] text-center mb-6">
        {chartTitle}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <AnimatePresence mode="popLayout">
          {isGroupedView ? (
            <motion.div 
              key="grouped-spread-time"
              layoutId="grouped-spread-time"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
              className="flex flex-col min-h-[240px] col-span-1 lg:col-span-2"
            >
              <h3 className="text-md font-bold text-slate-500 mb-4">{`${comparisonConfig.leftTitle} + ${comparisonConfig.rightTitle}`}</h3>
              <div className="flex-1 min-h-0">
                {groupedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <Clock className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-semibold">No Data</span>
                  </div>
                ) : (
                  <SheetBreakdownChart 
                    data={groupedData} 
                    expanded={false} 
                    activeFill="#10b981" 
                    valueLabelFill="#10b981" 
                    isDuration={isDurationMetric} 
                    showAverageLine={true}
                  />
                )}
              </div>
            </motion.div>
          ) : (
            <>
              <motion.div 
                key={`spread-time-${firstPanelId}`}
                layoutId={`spread-time-${firstPanelId}`}
                className="flex flex-col min-h-[240px]"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-bold text-slate-500">{comparisonConfig.leftTitle}</h3>
                </div>
                <div className="flex-1 min-h-0">
                  {firstData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                      <Clock className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SheetBreakdownChart 
                      data={firstData} 
                      expanded={false} 
                      activeFill="#10b981" 
                      valueLabelFill="#10b981" 
                      isDuration={isDurationMetric} 
                      showAverageLine={true}
                    />
                  )}
                </div>
              </motion.div>

              <motion.div 
                key={`spread-time-${secondPanelId}`}
                layoutId={`spread-time-${secondPanelId}`}
                className="flex flex-col min-h-[240px]"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-bold text-slate-500">{comparisonConfig.rightTitle}</h3>
                </div>
                <div className="flex-1 min-h-0">
                  {secondData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                      <Clock className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SheetBreakdownChart 
                      data={secondData} 
                      expanded={false} 
                      activeFill="#10b981" 
                      valueLabelFill="#10b981" 
                      isDuration={isDurationMetric} 
                      showAverageLine={true}
                    />
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
