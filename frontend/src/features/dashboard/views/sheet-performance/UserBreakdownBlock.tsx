// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Users } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { getCognizeVsOthersData, buildPageTimeData } from '../SheetPerformanceUtils';
import { SingleCognizeBar } from '../../components/dashboard-view/SingleCognizeBar';
import { usePersistentState } from '@/hooks/usePersistentState';

export function UserBreakdownBlock({
  firstDocumentFilterName,
  secondDocumentFilterName,
  firstContributionRows,
  secondContributionRows,
  firstContributionRowsSet1,
  firstContributionRowsSet2,
  secondContributionRowsSet1,
  secondContributionRowsSet2,
  firstSegmentsSet1,
  firstSegmentsSet2,
  secondSegmentsSet1,
  secondSegmentsSet2,
  firstDocument1Set1Name,
  firstDocument1Set2Name,
  secondDocument2Set1Name,
  secondDocument2Set2Name,
  firstSegments,
  secondSegments,
  systemTaskType,
  isDurationDisplay,
  firstPanelId,
  secondPanelId
}) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [displayMetric, setDisplayMetric] = usePersistentState('sheet_perf_userBreakdown_displayMetric', 'avg'); // 'pct_total', 'pct_avg', 'total', 'avg'
  const [analyzeSets, setAnalyzeSets] = usePersistentState('sheet_perf_userBreakdown_analyzeSets', false);
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const firstData = useMemo(() => getCognizeVsOthersData(firstContributionRows, systemTaskType), [firstContributionRows, systemTaskType]);
  const secondData = useMemo(() => getCognizeVsOthersData(secondContributionRows, systemTaskType), [secondContributionRows, systemTaskType]);

  const firstPageTimesUnfiltered = useMemo(() => buildPageTimeData(firstSegments, systemTaskType, 'default', 'all'), [firstSegments, systemTaskType]);
  const secondPageTimesUnfiltered = useMemo(() => buildPageTimeData(secondSegments, systemTaskType, 'default', 'all'), [secondSegments, systemTaskType]);

  const firstUserAvg = useMemo(() => firstPageTimesUnfiltered.userData.length > 0 ? firstPageTimesUnfiltered.userData.reduce((acc, curr) => acc + curr.value, 0) / firstPageTimesUnfiltered.userData.length : 0, [firstPageTimesUnfiltered.userData]);
  const secondUserAvg = useMemo(() => secondPageTimesUnfiltered.userData.length > 0 ? secondPageTimesUnfiltered.userData.reduce((acc, curr) => acc + curr.value, 0) / secondPageTimesUnfiltered.userData.length : 0, [secondPageTimesUnfiltered.userData]);

  const isTotalBased = displayMetric === 'pct_total' || displayMetric === 'total';

  const formatDisplayData = (dataRow, totalAvg, isTotal) => {
    if (!dataRow) return { cognizeSeconds: 0, othersSeconds: 0, totalSeconds: 0 };
    return {
      cognizeSeconds: isTotal ? dataRow.cognizeSeconds : (dataRow.totalSeconds > 0 ? (dataRow.cognizeSeconds / dataRow.totalSeconds) * totalAvg : 0),
      othersSeconds: isTotal ? dataRow.othersSeconds : (dataRow.totalSeconds > 0 ? (dataRow.othersSeconds / dataRow.totalSeconds) * totalAvg : 0),
      totalSeconds: isTotal ? dataRow.totalSeconds : totalAvg
    };
  };

  const getAveragePerSheet = (segments) => {
    const pageTimes = buildPageTimeData(segments || [], systemTaskType, 'default', 'all');
    return pageTimes.userData.length > 0
      ? pageTimes.userData.reduce((acc, curr) => acc + curr.value, 0) / pageTimes.userData.length
      : 0;
  };

  const firstDisplayData = useMemo(() => formatDisplayData(firstData, firstUserAvg, isTotalBased), [isTotalBased, firstUserAvg, firstData]);
  const secondDisplayData = useMemo(() => formatDisplayData(secondData, secondUserAvg, isTotalBased), [isTotalBased, secondUserAvg, secondData]);

  // Set-based processing
  const firstDataSet1 = useMemo(() => getCognizeVsOthersData(firstContributionRowsSet1 || [], systemTaskType), [firstContributionRowsSet1, systemTaskType]);
  const firstDataSet2 = useMemo(() => getCognizeVsOthersData(firstContributionRowsSet2 || [], systemTaskType), [firstContributionRowsSet2, systemTaskType]);
  const secondDataSet1 = useMemo(() => getCognizeVsOthersData(secondContributionRowsSet1 || [], systemTaskType), [secondContributionRowsSet1, systemTaskType]);
  const secondDataSet2 = useMemo(() => getCognizeVsOthersData(secondContributionRowsSet2 || [], systemTaskType), [secondContributionRowsSet2, systemTaskType]);

  const firstSet1Avg = useMemo(() => getAveragePerSheet(firstSegmentsSet1), [firstSegmentsSet1, systemTaskType]);
  const firstSet2Avg = useMemo(() => getAveragePerSheet(firstSegmentsSet2), [firstSegmentsSet2, systemTaskType]);
  const secondSet1Avg = useMemo(() => getAveragePerSheet(secondSegmentsSet1), [secondSegmentsSet1, systemTaskType]);
  const secondSet2Avg = useMemo(() => getAveragePerSheet(secondSegmentsSet2), [secondSegmentsSet2, systemTaskType]);

  const firstDisplayDataSet1 = useMemo(() => formatDisplayData(firstDataSet1, analyzeSets ? firstSet1Avg : firstUserAvg, isTotalBased), [analyzeSets, firstSet1Avg, firstUserAvg, firstDataSet1, isTotalBased]);
  const firstDisplayDataSet2 = useMemo(() => formatDisplayData(firstDataSet2, analyzeSets ? firstSet2Avg : firstUserAvg, isTotalBased), [analyzeSets, firstSet2Avg, firstUserAvg, firstDataSet2, isTotalBased]);
  const secondDisplayDataSet1 = useMemo(() => formatDisplayData(secondDataSet1, analyzeSets ? secondSet1Avg : secondUserAvg, isTotalBased), [analyzeSets, isTotalBased, secondSet1Avg, secondUserAvg, secondDataSet1]);
  const secondDisplayDataSet2 = useMemo(() => formatDisplayData(secondDataSet2, analyzeSets ? secondSet2Avg : secondUserAvg, isTotalBased), [analyzeSets, isTotalBased, secondSet2Avg, secondUserAvg, secondDataSet2]);

  const hasFirstSets = analyzeSets && ((firstContributionRowsSet1?.length || 0) > 0 || (firstContributionRowsSet2?.length || 0) > 0);
  const hasSecondSets = analyzeSets && ((secondContributionRowsSet1?.length || 0) > 0 || (secondContributionRowsSet2?.length || 0) > 0);

  return (
    <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col relative group animate-stagger-1 ${showFilterMenu ? 'z-[120]' : 'z-10'}`}>
      <div className="absolute right-4 top-4 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative" ref={filterRef}>
          <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Display Options</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'avg', label: (systemTaskType === 'editDataRecord' || systemTaskType === 'reviewRecord') ? 'Avg Count' : 'Avg Time' },
                  { id: 'pct_avg', label: '% Avg' },
                  { id: 'total', label: (systemTaskType === 'editDataRecord' || systemTaskType === 'reviewRecord') ? 'Total Count' : 'Total Time' },
                  { id: 'pct_total', label: '% Total' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDisplayMetric(opt.id)}
                    className={`px-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      displayMetric === opt.id 
                        ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 my-2"></div>
              <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded-md transition-colors">
                <input 
                  type="checkbox" 
                  checked={analyzeSets} 
                  onChange={() => setAnalyzeSets(!analyzeSets)}
                  className="accent-blue-600 w-3.5 h-3.5 rounded border-slate-300"
                />
                <span className="text-xs font-medium text-slate-600">Analyze Sets</span>
              </label>
            </div>
          )}
        </div>
      </div>
      <div className="relative mb-6 flex justify-center items-center">
        <h2 className="text-xl font-extrabold text-[#17335f]">
          {`${displayMetric.includes('pct') ? '% ' : ''}${displayMetric.includes('avg') ? 'Average ' : 'Total '}${systemTaskType === 'all' ? 'Review & Edit Data Time' : systemTaskType === 'editData' ? 'Edit Data Time' : systemTaskType === 'editDataRecord' ? 'Edit Data Record' : systemTaskType === 'reviewRecord' ? 'Review Count' : 'Review time'}${displayMetric.includes('avg') ? ' Per sheet' : ''}`}
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <AnimatePresence mode="popLayout">
          {/* First Documents */}
          <motion.div 
            key={`user-breakdown-${firstPanelId}`}
            layoutId={`user-breakdown-${firstPanelId}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
            className="flex flex-col relative z-10"
          >
            {hasFirstSets ? (
              <div className="flex flex-col gap-4 w-full">
                {/* Document Name */}
                <h3 className="text-md font-bold text-slate-500 text-center">{firstDocumentFilterName || 'First documents'}</h3>
                {/* Set 1 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-400">{firstDocument1Set1Name || 'Set 1'}</h4>
                    <span className="text-sm font-bold text-slate-500">{isDurationDisplay ? formatDuration(firstDisplayDataSet1.totalSeconds) : `${firstDisplayDataSet1.totalSeconds.toLocaleString()} items`}</span>
                  </div>
                  {firstDisplayDataSet1.totalSeconds === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-slate-300 gap-2">
                      <span className="text-xs font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SingleCognizeBar data={firstDisplayDataSet1} displayMetric={displayMetric} isDuration={isDurationDisplay} />
                  )}
                </div>
                {/* Set 2 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-400">{firstDocument1Set2Name || 'Set 2'}</h4>
                    <span className="text-sm font-bold text-slate-500">{isDurationDisplay ? formatDuration(firstDisplayDataSet2.totalSeconds) : `${firstDisplayDataSet2.totalSeconds.toLocaleString()} items`}</span>
                  </div>
                  {firstDisplayDataSet2.totalSeconds === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-slate-300 gap-2">
                      <span className="text-xs font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SingleCognizeBar data={firstDisplayDataSet2} displayMetric={displayMetric} isDuration={isDurationDisplay} />
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-bold text-slate-500">{firstDocumentFilterName || 'First documents'}</h3>
                  <span className="text-md font-bold text-slate-500">{isDurationDisplay ? formatDuration(firstDisplayData.totalSeconds) : `${firstDisplayData.totalSeconds.toLocaleString()} items`}</span>
                </div>
                <div className="flex-1 mt-2">
                  {firstDisplayData.totalSeconds === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-3">
                      <Users className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SingleCognizeBar data={firstDisplayData} displayMetric={displayMetric} isDuration={isDurationDisplay} />
                  )}
                </div>
              </>
            )}
          </motion.div>
          
          {/* Second Documents */}
          <motion.div 
            key={`user-breakdown-${secondPanelId}`}
            layoutId={`user-breakdown-${secondPanelId}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
            className="flex flex-col relative z-10"
          >
            {hasSecondSets ? (
              <div className="flex flex-col gap-4 w-full">
                {/* Document Name */}
                <h3 className="text-md font-bold text-slate-500 text-center">{secondDocumentFilterName || 'Second Documents'}</h3>
                {/* Set 1 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-400">{secondDocument2Set1Name || 'Set 1'}</h4>
                    <span className="text-sm font-bold text-slate-500">{isDurationDisplay ? formatDuration(secondDisplayDataSet1.totalSeconds) : `${secondDisplayDataSet1.totalSeconds.toLocaleString()} items`}</span>
                  </div>
                  {secondDisplayDataSet1.totalSeconds === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-slate-300 gap-2">
                      <span className="text-xs font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SingleCognizeBar data={secondDisplayDataSet1} displayMetric={displayMetric} isDuration={isDurationDisplay} />
                  )}
                </div>
                {/* Set 2 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-400">{secondDocument2Set2Name || 'Set 2'}</h4>
                    <span className="text-sm font-bold text-slate-500">{isDurationDisplay ? formatDuration(secondDisplayDataSet2.totalSeconds) : `${secondDisplayDataSet2.totalSeconds.toLocaleString()} items`}</span>
                  </div>
                  {secondDisplayDataSet2.totalSeconds === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-slate-300 gap-2">
                      <span className="text-xs font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SingleCognizeBar data={secondDisplayDataSet2} displayMetric={displayMetric} isDuration={isDurationDisplay} />
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-bold text-slate-500">{secondDocumentFilterName || 'Second Documents'}</h3>
                  <span className="text-md font-bold text-slate-500">{isDurationDisplay ? formatDuration(secondDisplayData.totalSeconds) : `${secondDisplayData.totalSeconds.toLocaleString()} items`}</span>
                </div>
                <div className="flex-1 mt-2">
                  {secondDisplayData.totalSeconds === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-3">
                      <Users className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SingleCognizeBar data={secondDisplayData} displayMetric={displayMetric} isDuration={isDurationDisplay} />
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
