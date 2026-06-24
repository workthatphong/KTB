import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, SlidersHorizontal } from 'lucide-react';
import { ToggleSetting } from '../../components/dashboard-view/DashboardViewPanels.jsx';
import { SheetBreakdownChart } from '../../../charts/SheetBreakdownChart.jsx';
import { buildUserTimeData } from '../SheetPerformanceUtils.js';

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
  const [showUserMenu3, setShowUserMenu3] = useState(false);
  const [userSortOrder3, setUserSortOrder3] = useState('desc');
  const [alignUsers3, setAlignUsers3] = useState(false);
  const [syncScroll3, setSyncScroll3] = useState(false);
  const [showDiffChart, setShowDiffChart] = useState(false);
  const [isGroupedView3, setIsGroupedView3] = useState(false);
  const [isTotalView3, setIsTotalView3] = useState(false);

  const userMenuRef3 = useRef(null);
  const userMenuPanelRef3 = useRef(null);
  const [userMenuStyle3, setUserMenuStyle3] = useState({});

  const scrollRefFirst3 = useRef(null);
  const scrollRefSecond3 = useRef(null);
  const isSyncingLeft3 = useRef(false);
  const isSyncingRight3 = useRef(false);

  const handleScrollFirst3 = (e) => {
    if (!syncScroll3) return;
    if (isSyncingLeft3.current) {
      isSyncingLeft3.current = false;
      return;
    }
    if (scrollRefSecond3.current && scrollRefSecond3.current.scrollTop !== e.target.scrollTop) {
      isSyncingRight3.current = true;
      scrollRefSecond3.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleScrollSecond3 = (e) => {
    if (!syncScroll3) return;
    if (isSyncingRight3.current) {
      isSyncingRight3.current = false;
      return;
    }
    if (scrollRefFirst3.current && scrollRefFirst3.current.scrollTop !== e.target.scrollTop) {
      isSyncingLeft3.current = true;
      scrollRefFirst3.current.scrollTop = e.target.scrollTop;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef3.current && !userMenuRef3.current.contains(event.target) && (!userMenuPanelRef3.current || !userMenuPanelRef3.current.contains(event.target))) {
        setShowUserMenu3(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showUserMenu3) return;
    const updatePosition = () => {
      if (!userMenuRef3.current) return;
      const rect = userMenuRef3.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const panelWidth = 224; 
      let top, bottom, right;
      let maxHeight = 0;
      const preferredMaxHeight = window.innerHeight * 0.8;
      
      if (spaceBelow > 300 || spaceBelow >= spaceAbove) {
        top = rect.bottom + 8;
        maxHeight = Math.min(spaceBelow - 16, preferredMaxHeight);
      } else {
        bottom = window.innerHeight - rect.top + 8;
        maxHeight = Math.min(spaceAbove - 16, preferredMaxHeight);
      }

      right = window.innerWidth - rect.right;

      setUserMenuStyle3({
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
  }, [showUserMenu3]);

  const firstUserTimesRaw = useMemo(() => buildUserTimeData(firstSegments, systemTaskType, userSortOrder3, userRoleFilter, !isTotalView3), [firstSegments, systemTaskType, userSortOrder3, userRoleFilter, isTotalView3]);
  const secondUserTimesRaw = useMemo(() => buildUserTimeData(secondSegments, systemTaskType, userSortOrder3, userRoleFilter, !isTotalView3), [secondSegments, systemTaskType, userSortOrder3, userRoleFilter, isTotalView3]);

  const groupedUserTimes = useMemo(() => {
    if (!isGroupedView3) return { userData: [] };
    const allSegments = [...(firstSegments || []), ...(secondSegments || [])];
    return buildUserTimeData(allSegments, systemTaskType, userSortOrder3, userRoleFilter, !isTotalView3);
  }, [isGroupedView3, firstSegments, secondSegments, systemTaskType, userSortOrder3, userRoleFilter, isTotalView3]);

  const { alignedFirstUserTimes, alignedSecondUserTimes } = useMemo(() => {
    if (!alignUsers3 && !showDiffChart) return { alignedFirstUserTimes: firstUserTimesRaw, alignedSecondUserTimes: secondUserTimesRaw };
    
    const userMap = new Map();
    firstUserTimesRaw.userData.forEach(u => {
      if (!userMap.has(u.name)) userMap.set(u.name, { first: u, second: null });
      else userMap.get(u.name).first = u;
    });
    secondUserTimesRaw.userData.forEach(u => {
      if (!userMap.has(u.name)) userMap.set(u.name, { first: null, second: u });
      else userMap.get(u.name).second = u;
    });

    const allUsers = Array.from(userMap.values());
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    
    allUsers.sort((a, b) => {
      const aVal1 = a.first?.value || 0;
      const aVal2 = a.second?.value || 0;
      const bVal1 = b.first?.value || 0;
      const bVal2 = b.second?.value || 0;
      
      const aStart1 = a.first?.startTs || Number.MAX_SAFE_INTEGER;
      const aStart2 = a.second?.startTs || Number.MAX_SAFE_INTEGER;
      const bStart1 = b.first?.startTs || Number.MAX_SAFE_INTEGER;
      const bStart2 = b.second?.startTs || Number.MAX_SAFE_INTEGER;

      const aEnd1 = a.first?.endTs || 0;
      const aEnd2 = a.second?.endTs || 0;
      const bEnd1 = b.first?.endTs || 0;
      const bEnd2 = b.second?.endTs || 0;

      if (userSortOrder3 === 'desc') {
        const diff = (bVal1 + bVal2) - (aVal1 + aVal2);
        if (diff !== 0) return diff;
      }
      if (userSortOrder3 === 'asc') {
        const diff = (aVal1 + aVal2) - (bVal1 + bVal2);
        if (diff !== 0) return diff;
      }
      if (userSortOrder3 === 'oldest') {
        const diff = Math.min(aStart1, aStart2) - Math.min(bStart1, bStart2);
        if (diff !== 0) return diff;
      }
      if (userSortOrder3 === 'latest') {
        const diff = Math.max(bEnd1, bEnd2) - Math.max(aEnd1, aEnd2);
        if (diff !== 0) return diff;
      }
      
      const aName = a.first?.name || a.second?.name || '';
      const bName = b.first?.name || b.second?.name || '';
      return collator.compare(aName, bName);
    });

    const newFirst = allUsers.map(u => u.first || { name: u.second?.name || u.first?.name, value: 0, cognizeValue: 0, makerValue: 0 });
    const newSecond = allUsers.map(u => u.second || { name: u.first?.name || u.second?.name, value: 0, cognizeValue: 0, makerValue: 0 });

    return { 
      alignedFirstUserTimes: { userData: newFirst }, 
      alignedSecondUserTimes: { userData: newSecond } 
    };
  }, [alignUsers3, firstUserTimesRaw, secondUserTimesRaw, userSortOrder3, showDiffChart]);

  const firstUserTimes = alignedFirstUserTimes;
  const secondUserTimes = alignedSecondUserTimes;

  const diffUserData = useMemo(() => {
    if (!showDiffChart) return [];
    
    return firstUserTimes.userData.map((u, i) => {
      const v1 = u.value;
      const v2 = secondUserTimes.userData[i]?.value || 0;
      const diffRaw = v2 - v1; 
      const logicalDiff = systemDocumentsSwapped ? -diffRaw : diffRaw;
      
      let fill = '#94a3b8';
      if (logicalDiff > 0) fill = '#ef4444';
      if (logicalDiff < 0) fill = '#22c55e';
      
      return {
        ...u,
        value: diffRaw,
        logicalDiff: logicalDiff,
        fill
      };
    });
  }, [firstUserTimes, secondUserTimes, showDiffChart, systemDocumentsSwapped]);

  return (
    <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col relative group animate-stagger-3 ${showUserMenu3 ? 'z-[9999]' : 'z-10'}`}>
      <div className="absolute right-4 top-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative" ref={userMenuRef3}>
          <button onClick={() => setShowUserMenu3(!showUserMenu3)} className={`p-1.5 border rounded-md transition-colors bg-white ${showUserMenu3 ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`} title="Display & Sort">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          {showUserMenu3 && createPortal(
            <div 
              ref={userMenuPanelRef3}
              style={userMenuStyle3}
              className={`fixed rounded-2xl border shadow-2xl p-4 z-[99999] overflow-y-auto custom-scrollbar dropdown-slide-enter ${isTransparentPopup ? 'bg-white/30 border-slate-200/30' : 'bg-white border-slate-200'}`}
            >
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Display & Sort</div>
              <div className="flex flex-col gap-3">
                <ToggleSetting checked={isGroupedView3} onChange={() => setIsGroupedView3(prev => {
                  const next = !prev;
                  if (next) { setAlignUsers3(false); setSyncScroll3(false); setShowDiffChart(false); }
                  return next;
                })}>
                  Group into Single Chart
                </ToggleSetting>
                <ToggleSetting checked={alignUsers3 || showDiffChart} onChange={() => setAlignUsers3(prev => {
                  const next = !prev;
                  if (next) setIsGroupedView3(false);
                  return next;
                })} disabled={showDiffChart}>
                  Align Users (Same Row)
                </ToggleSetting>
                <ToggleSetting checked={syncScroll3} onChange={() => setSyncScroll3(prev => {
                  const next = !prev;
                  if (next) setIsGroupedView3(false);
                  return next;
                })}>
                  Sync Scroll
                </ToggleSetting>
                <div className="border-t border-slate-100 my-1"></div>
                <ToggleSetting checked={isTotalView3} onChange={() => setIsTotalView3(prev => {
                  const next = !prev;
                  if (next) setShowDiffChart(false);
                  return next;
                })}>
                  Total
                </ToggleSetting>
                <ToggleSetting checked={showDiffChart} onChange={() => {
                  setShowDiffChart(prev => {
                    const next = !prev;
                    if (next) { setAlignUsers3(true); setIsGroupedView3(false); setIsTotalView3(false); }
                    return next;
                  });
                }}>
                  Compare Diff
                </ToggleSetting>
                <div className="border-t border-slate-100 my-1"></div>
                <ToggleSetting checked={userSortOrder3 === 'desc'} onChange={() => setUserSortOrder3(prev => prev === 'desc' ? 'default' : 'desc')}>
                  Highest First
                </ToggleSetting>
                <ToggleSetting checked={userSortOrder3 === 'asc'} onChange={() => setUserSortOrder3(prev => prev === 'asc' ? 'default' : 'asc')}>
                  Lowest First
                </ToggleSetting>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      <h2 className="text-xl font-extrabold text-[#17335f] text-center mb-6">
        {isTotalView3 ? 'Total' : 'Average'} {`${systemTaskType === 'all' ? 'Review & Edit Data Time' : systemTaskType === 'editData' ? 'Edit Data Time' : systemTaskType === 'editDataRecord' ? 'Edit Data Record' : systemTaskType === 'reviewRecord' ? 'Review Count' : 'Review time'} By User${showDiffChart ? ' Compare Diff' : ''}`}
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
          ) : isGroupedView3 ? (
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
                      setScrollRef={(el) => scrollRefFirst3.current = el}
                      onScroll={handleScrollFirst3}
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
                      setScrollRef={(el) => scrollRefSecond3.current = el}
                      onScroll={handleScrollSecond3}
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
