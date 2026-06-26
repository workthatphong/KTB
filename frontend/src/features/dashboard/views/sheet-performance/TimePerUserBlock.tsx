// @ts-nocheck
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import { SheetBreakdownChart } from '../../../charts/SheetBreakdownChart';
import { useTimePerUserData } from './hooks/useTimePerUserData';
import { TimePerUserMenu } from './TimePerUserMenu';
import { usePersistentState } from '@/hooks/usePersistentState';

export function TimePerUserBlock({
  firstDocumentFilterName,
  secondDocumentFilterName,
  firstSegments,
  secondSegments,
  systemTaskType,
  isDurationDisplay,
  userRoleFilter,
  isStackedView,
  isTransparentPopup,
  systemDocumentsSwapped,
  firstPanelId,
  secondPanelId
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userSortOrder, setUserSortOrder] = usePersistentState('sheet_perf_timePerUser_sortOrder', 'desc');
  const [alignUsers, setAlignUsers] = usePersistentState('sheet_perf_timePerUser_alignUsers', false);
  const [syncScroll, setSyncScroll] = usePersistentState('sheet_perf_timePerUser_syncScroll', false);
  const [showDiffChart, setShowDiffChart] = usePersistentState('sheet_perf_timePerUser_showDiffChart', false);
  const [isGroupedView, setIsGroupedView] = usePersistentState('sheet_perf_timePerUser_groupedView', false);
  const [isTotalView, setIsTotalView] = usePersistentState('sheet_perf_timePerUser_totalView', false);

  const scrollRefFirst = useRef(null);
  const scrollRefSecond = useRef(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  const handleScrollFirst = (e) => {
    if (!syncScroll) return;
    if (isSyncingLeft.current) {
      isSyncingLeft.current = false;
      return;
    }
    if (scrollRefSecond.current && scrollRefSecond.current.scrollTop !== e.target.scrollTop) {
      isSyncingRight.current = true;
      scrollRefSecond.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleScrollSecond = (e) => {
    if (!syncScroll) return;
    if (isSyncingRight.current) {
      isSyncingRight.current = false;
      return;
    }
    if (scrollRefFirst.current && scrollRefFirst.current.scrollTop !== e.target.scrollTop) {
      isSyncingLeft.current = true;
      scrollRefFirst.current.scrollTop = e.target.scrollTop;
    }
  };

  const {
    groupedUserTimes,
    firstUserTimes,
    secondUserTimes,
    diffUserData
  } = useTimePerUserData({
    firstSegments,
    secondSegments,
    systemTaskType,
    userSortOrder,
    userRoleFilter,
    isTotalView,
    isGroupedView,
    alignUsers,
    showDiffChart,
    systemDocumentsSwapped
  });

  return (
    <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col relative group animate-stagger-3 ${showUserMenu ? 'z-[9999]' : 'z-10'}`}>
      <TimePerUserMenu
        showMenu={showUserMenu}
        setShowMenu={setShowUserMenu}
        isTransparentPopup={isTransparentPopup}
        isGroupedView={isGroupedView}
        setIsGroupedView={setIsGroupedView}
        alignUsers={alignUsers}
        setAlignUsers={setAlignUsers}
        syncScroll={syncScroll}
        setSyncScroll={setSyncScroll}
        isTotalView={isTotalView}
        setIsTotalView={setIsTotalView}
        showDiffChart={showDiffChart}
        setShowDiffChart={setShowDiffChart}
        userSortOrder={userSortOrder}
        setUserSortOrder={setUserSortOrder}
      />

      <h2 className="text-xl font-extrabold text-[#17335f] text-center mb-6">
        {isTotalView ? 'Total' : 'Average'} {`${systemTaskType === 'all' ? 'Review & Edit Data Time' : systemTaskType === 'editData' ? 'Edit Data Time' : systemTaskType === 'editDataRecord' ? 'Edit Data Record' : systemTaskType === 'reviewRecord' ? 'Review Count' : 'Review time'} By User${showDiffChart ? ' Compare Diff' : ''}`}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <AnimatePresence mode="popLayout">
          {showDiffChart ? (
            <motion.div 
              key="user-diff-chart"
              layoutId="user-diff-chart"
              className="flex flex-col min-h-[240px] col-span-1 lg:col-span-2"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 w-full">
                <h3 className="text-md font-bold text-slate-500 mb-4">{firstDocumentFilterName || 'First documents'}</h3>
                <h3 className="text-md font-bold text-slate-500 mb-4">{secondDocumentFilterName || 'Second Documents'}</h3>
              </div>
              <div className="flex-1 min-h-0">
                <SheetBreakdownChart 
                  data={diffUserData} 
                  expanded 
                  isDuration={isDurationDisplay} 
                  isStacked={false}
                  isDiffChart={true}
                  systemDocumentsSwapped={systemDocumentsSwapped}
                  showAverageLine={false}
                />
              </div>
            </motion.div>
          ) : isGroupedView ? (
            <motion.div 
              key="grouped-user-time-3"
              layoutId="grouped-user-time-3"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
              className="flex flex-col min-h-[240px] col-span-1 lg:col-span-2"
            >
              <h3 className="text-md font-bold text-slate-500 mb-4">All Users</h3>
              <div className="flex-1 min-h-0">
                {groupedUserTimes.userData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <Clock className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-semibold">No Data</span>
                  </div>
                ) : (
                  <SheetBreakdownChart 
                    data={groupedUserTimes.userData} 
                    expanded 
                    activeFill="#00a4e4" 
                    valueLabelFill="#00a4e4" 
                    isDuration={isDurationDisplay} 
                    isStacked={isStackedView} 
                    showAverageLine={false}
                    averageLabel="Avg Per User"
                  />
                )}
              </div>
            </motion.div>
          ) : (
            <>
              <motion.div 
                key={`user-group-${firstPanelId}`}
                layoutId={`user-group-${firstPanelId}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                className="flex flex-col min-h-[240px]"
              >
                <h3 className="text-md font-bold text-slate-500 mb-4">{firstDocumentFilterName || 'First documents'}</h3>
                <div className="flex-1 min-h-0">
                  {firstUserTimes.userData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                      <Clock className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SheetBreakdownChart 
                      data={firstUserTimes.userData} 
                      expanded 
                      activeFill="#00a4e4" 
                      valueLabelFill="#00a4e4" 
                      isDuration={isDurationDisplay} 
                      isStacked={isStackedView}
                      showAverageLine={false}
                      averageLabel="Avg Per User"
                      setScrollRef={(el) => scrollRefFirst.current = el}
                      onScroll={handleScrollFirst}
                    />
                  )}
                </div>
              </motion.div>
              <motion.div 
                key={`user-group-${secondPanelId}`}
                layoutId={`user-group-${secondPanelId}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                className="flex flex-col min-h-[240px]"
              >
                <h3 className="text-md font-bold text-slate-500 mb-4">{secondDocumentFilterName || 'Second Documents'}</h3>
                <div className="flex-1 min-h-0">
                  {secondUserTimes.userData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                      <Clock className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-semibold">No Data</span>
                    </div>
                  ) : (
                    <SheetBreakdownChart 
                      data={secondUserTimes.userData} 
                      expanded 
                      activeFill="#00a4e4" 
                      valueLabelFill="#00a4e4" 
                      isDuration={isDurationDisplay} 
                      isStacked={isStackedView}
                      showAverageLine={false}
                      averageLabel="Avg Per User"
                      setScrollRef={(el) => scrollRefSecond.current = el}
                      onScroll={handleScrollSecond}
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
