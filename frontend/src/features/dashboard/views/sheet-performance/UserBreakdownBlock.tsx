// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Users } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { getCognizeVsOthersData, buildPageTimeData } from '../SheetPerformanceUtils';
import { SingleCognizeBar } from '../../components/dashboard-view/SingleCognizeBar';

export function UserBreakdownBlock({
  firstDocumentFilterName,
  secondDocumentFilterName,
  firstContributionRows,
  secondContributionRows,
  firstSegments,
  secondSegments,
  systemTaskType,
  isDurationDisplay,
  firstPanelId,
  secondPanelId
}) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [displayMetric, setDisplayMetric] = useState('avg'); // 'pct_total', 'pct_avg', 'total', 'avg'
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
  
  const firstDisplayData = useMemo(() => ({
    cognizeSeconds: isTotalBased ? firstData.cognizeSeconds : (firstData.totalSeconds > 0 ? (firstData.cognizeSeconds / firstData.totalSeconds) * firstUserAvg : 0),
    othersSeconds: isTotalBased ? firstData.othersSeconds : (firstData.totalSeconds > 0 ? (firstData.othersSeconds / firstData.totalSeconds) * firstUserAvg : 0),
    totalSeconds: isTotalBased ? firstData.totalSeconds : firstUserAvg
  }), [isTotalBased, firstUserAvg, firstData]);

  const secondDisplayData = useMemo(() => ({
    cognizeSeconds: isTotalBased ? secondData.cognizeSeconds : (secondData.totalSeconds > 0 ? (secondData.cognizeSeconds / secondData.totalSeconds) * secondUserAvg : 0),
    othersSeconds: isTotalBased ? secondData.othersSeconds : (secondData.totalSeconds > 0 ? (secondData.othersSeconds / secondData.totalSeconds) * secondUserAvg : 0),
    totalSeconds: isTotalBased ? secondData.totalSeconds : secondUserAvg
  }), [isTotalBased, secondUserAvg, secondData]);

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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
