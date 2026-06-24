import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, SlidersHorizontal, ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowDownAZ } from 'lucide-react';
import { ToggleSetting } from '../components/dashboard-view/DashboardViewPanels.jsx';
import { buildChartAnimationKey } from '../components/dashboard-view/DashboardViewUtils.js';
import { formatDuration } from '@/lib/utils.js';
import { SheetBreakdownChart } from '../../charts/SheetBreakdownChart.jsx';
import { getCognizeVsOthersData, buildPageTimeData, buildUserTimeData } from './SheetPerformanceUtils.js';
import { SingleCognizeBar } from '../components/dashboard-view/SingleCognizeBar.jsx';
export function SheetPerformanceView({ 
  firstDocumentFilterName,
  secondDocumentFilterName,
  firstContributionRows,
  secondContributionRows,
  systemDocumentsSwapped,
  firstSegments,
  secondSegments,
  systemTaskType = 'all'
}) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [displayMetric, setDisplayMetric] = useState('avg'); // 'pct_total', 'pct_avg', 'total', 'avg'
  const filterRef = useRef(null);

  const isDurationDisplay = systemTaskType !== 'editDataRecord' && systemTaskType !== 'reviewRecord';

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userSortOrder, setUserSortOrder] = useState('desc');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [isStackedView, setIsStackedView] = useState(false);
  const [isGroupedView2, setIsGroupedView2] = useState(false);
  const [isTransparentPopup, setIsTransparentPopup] = useState(false);
  const userMenuRef = useRef(null);
  const userMenuPanelRef = useRef(null);
  const [userMenuStyle, setUserMenuStyle] = useState({});

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
      if (filterRef.current && !filterRef.current.contains(event.target)) setShowFilterMenu(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target) && (!userMenuPanelRef.current || !userMenuPanelRef.current.contains(event.target))) {
        setShowUserMenu(false);
      }
      if (userMenuRef3.current && !userMenuRef3.current.contains(event.target) && (!userMenuPanelRef3.current || !userMenuPanelRef3.current.contains(event.target))) {
        setShowUserMenu3(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showUserMenu && !showUserMenu3) return;
    const updatePosition = () => {
      const updateMenu = (btnRef, setStyle) => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
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

        setStyle({
          top: top !== undefined ? `${top}px` : 'auto',
          bottom: bottom !== undefined ? `${bottom}px` : 'auto',
          right: `${right}px`,
          maxHeight: `${maxHeight}px`,
          width: `${panelWidth}px`
        });
      };

      if (showUserMenu) updateMenu(userMenuRef, setUserMenuStyle);
      if (showUserMenu3) updateMenu(userMenuRef3, setUserMenuStyle3);
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showUserMenu, showUserMenu3]);

  const uniqueUsers = useMemo(() => {
    const usersSet = new Set();
    const addUsers = (segs) => {
      if (!segs) return;
      for (const seg of segs) {
        if (!seg.segmentType?.startsWith('USER_')) continue;
        const u = String(seg.userName || '').trim();
        const uLower = u.toLowerCase();
        if (!u || uLower === 'system' || uLower === 'idle') continue;
        usersSet.add(u);
      }
    };
    addUsers(firstSegments);
    addUsers(secondSegments);
    return Array.from(usersSet).sort();
  }, [firstSegments, secondSegments]);

  const firstData = useMemo(() => getCognizeVsOthersData(firstContributionRows, systemTaskType), [firstContributionRows, systemTaskType]);
  const secondData = useMemo(() => getCognizeVsOthersData(secondContributionRows, systemTaskType), [secondContributionRows, systemTaskType]);

  const firstPageTimes = useMemo(() => buildPageTimeData(firstSegments, systemTaskType, userSortOrder, userRoleFilter), [firstSegments, systemTaskType, userSortOrder, userRoleFilter]);
  const secondPageTimes = useMemo(() => buildPageTimeData(secondSegments, systemTaskType, userSortOrder, userRoleFilter), [secondSegments, systemTaskType, userSortOrder, userRoleFilter]);

  const groupedPageTimes = useMemo(() => {
    if (!isGroupedView2) return { userData: [] };
    const allSegments = [...(firstSegments || []), ...(secondSegments || [])];
    return buildPageTimeData(allSegments, systemTaskType, userSortOrder, userRoleFilter, true);
  }, [isGroupedView2, firstSegments, secondSegments, systemTaskType, userSortOrder, userRoleFilter]);

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
  }, [alignUsers3, firstUserTimesRaw, secondUserTimesRaw, userSortOrder3]);

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

  // Generate a stable ID based on the document name for framer-motion layoutId
  const firstPanelId = useMemo(() => `doc-${firstDocumentFilterName || 'first'}`, [firstDocumentFilterName]);
  const secondPanelId = useMemo(() => `doc-${secondDocumentFilterName || 'second'}`, [secondDocumentFilterName]);

  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17335f]">User Comparison</h1>
          <p className="text-slate-500 mt-1">Compare user time spent and edit volumes across documents.</p>
        </div>
      </div>



      <div className="space-y-6">
        {/* Block 1: User Breakdown */}
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

        {/* Block 2: User Time per Page */}
        <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col relative group animate-stagger-2 ${showUserMenu ? 'z-[9999]' : 'z-10'}`}>
          <div className="absolute right-4 top-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showUserMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`} title="Display & Sort">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {showUserMenu && createPortal(
                <div 
                  ref={userMenuPanelRef}
                  style={userMenuStyle}
                  className={`fixed rounded-2xl border shadow-2xl p-4 z-[99999] overflow-y-auto custom-scrollbar dropdown-slide-enter ${isTransparentPopup ? 'bg-white/30 border-slate-200/30' : 'bg-white border-slate-200'}`}
                >
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Display & Sort</div>
                  <div className="flex flex-col gap-3">
                    <ToggleSetting 
                      checked={isGroupedView2} 
                      onChange={() => setIsGroupedView2(prev => !prev)} 
                    >
                      Group into Single Chart
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={isStackedView} 
                      onChange={() => setIsStackedView(prev => !prev)} 
                    >
                      Split Colors
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={isTransparentPopup} 
                      onChange={() => setIsTransparentPopup(prev => !prev)} 
                    >
                      Transparent Popup
                    </ToggleSetting>
                    <div className="border-t border-slate-100 my-1"></div>
                    <ToggleSetting 
                      checked={userSortOrder === 'desc'} 
                      onChange={() => setUserSortOrder(prev => prev === 'desc' ? 'default' : 'desc')} 
                    >
                      Highest First
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={userSortOrder === 'asc'} 
                      onChange={() => setUserSortOrder(prev => prev === 'asc' ? 'default' : 'asc')} 
                    >
                      Lowest First
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={userSortOrder === 'oldest'} 
                      onChange={() => setUserSortOrder(prev => prev === 'oldest' ? 'default' : 'oldest')} 
                    >
                      Oldest First
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={userSortOrder === 'latest'} 
                      onChange={() => setUserSortOrder(prev => prev === 'latest' ? 'default' : 'latest')} 
                    >
                      Latest First
                    </ToggleSetting>
                    <div className="border-t border-slate-100 my-1"></div>
                    <ToggleSetting 
                      checked={userRoleFilter === 'maker_only'} 
                      onChange={() => setUserRoleFilter(prev => prev === 'maker_only' ? 'all' : 'maker_only')} 
                    >
                      Maker only
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={userRoleFilter === 'cognize_only'} 
                      onChange={() => setUserRoleFilter(prev => prev === 'cognize_only' ? 'all' : 'cognize_only')} 
                    >
                      Cognize only
                    </ToggleSetting>
                    <div className="border-t border-slate-100 my-1"></div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1.5 mb-1.5 mt-1.5">Specific Users</div>
                    <div className="flex flex-col gap-1.5 max-h-[204px] overflow-y-auto pr-2 custom-scrollbar">
                      {uniqueUsers.map(u => (
                        <ToggleSetting 
                          key={u}
                          checked={userRoleFilter === u} 
                          onChange={() => setUserRoleFilter(prev => prev === u ? 'all' : u)} 
                        >
                          {u} only
                        </ToggleSetting>
                      ))}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-[#17335f] text-center mb-6">
            {`${systemTaskType === 'all' ? 'Review & Edit Data Time' : systemTaskType === 'editData' ? 'Edit Data Time' : systemTaskType === 'editDataRecord' ? 'Edit Data Record' : systemTaskType === 'reviewRecord' ? 'Review Count' : 'Review time'} By Sheet${userRoleFilter === 'maker_only' ? ' Maker only' : userRoleFilter === 'cognize_only' ? ' Cognize only' : userRoleFilter !== 'all' ? ` ${userRoleFilter} only` : ''}`}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <AnimatePresence mode="popLayout">
              {isGroupedView2 ? (
                <motion.div 
                  key="grouped-user-time"
                  layoutId="grouped-user-time"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                  className="flex flex-col min-h-[240px] col-span-1 lg:col-span-2"
                >
                  <h3 className="text-md font-bold text-slate-500 mb-4">All Documents</h3>
                  <div className="flex-1 min-h-0">
                    {groupedPageTimes.userData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                        <Clock className="w-8 h-8 opacity-20" />
                        <span className="text-sm font-semibold">No Data</span>
                      </div>
                    ) : (
                      <SheetBreakdownChart data={groupedPageTimes.userData} expanded activeFill="#00a4e4" valueLabelFill="#00a4e4" isDuration={isDurationDisplay} isStacked={isStackedView} />
                    )}
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* First Documents */}
                  <motion.div 
                    key={`user-time-${firstPanelId}`}
                    layoutId={`user-time-${firstPanelId}`}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                    className="flex flex-col min-h-[240px]"
                  >
                    <h3 className="text-md font-bold text-slate-500 mb-4">{firstDocumentFilterName || 'First documents'}</h3>
                    <div className="flex-1 min-h-0">
                      {firstPageTimes.userData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                          <Clock className="w-8 h-8 opacity-20" />
                          <span className="text-sm font-semibold">No Data</span>
                        </div>
                      ) : (
                        <SheetBreakdownChart data={firstPageTimes.userData} expanded activeFill="#00a4e4" valueLabelFill="#00a4e4" isDuration={isDurationDisplay} isStacked={isStackedView} />
                      )}
                    </div>
                  </motion.div>
                  {/* Second Documents */}
                  <motion.div 
                    key={`user-time-${secondPanelId}`}
                    layoutId={`user-time-${secondPanelId}`}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                    className="flex flex-col min-h-[240px]"
                  >
                    <h3 className="text-md font-bold text-slate-500 mb-4">{secondDocumentFilterName || 'Second Documents'}</h3>
                    <div className="flex-1 min-h-0">
                      {secondPageTimes.userData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                          <Clock className="w-8 h-8 opacity-20" />
                          <span className="text-sm font-semibold">No Data</span>
                        </div>
                      ) : (
                        <SheetBreakdownChart data={secondPageTimes.userData} expanded activeFill="#00a4e4" valueLabelFill="#00a4e4" isDuration={isDurationDisplay} isStacked={isStackedView} />
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Block 3: User Time per User */}
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
                    <ToggleSetting 
                      checked={isGroupedView3} 
                      onChange={() => setIsGroupedView3(prev => {
                        const next = !prev;
                        if (next) {
                          setAlignUsers3(false);
                          setSyncScroll3(false);
                          setShowDiffChart(false);
                        }
                        return next;
                      })} 
                    >
                      Group into Single Chart
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={alignUsers3 || showDiffChart} 
                      onChange={() => setAlignUsers3(prev => {
                        const next = !prev;
                        if (next) setIsGroupedView3(false);
                        return next;
                      })} 
                      disabled={showDiffChart}
                    >
                      Align Users (Same Row)
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={syncScroll3} 
                      onChange={() => setSyncScroll3(prev => {
                        const next = !prev;
                        if (next) setIsGroupedView3(false);
                        return next;
                      })} 
                    >
                      Sync Scroll
                    </ToggleSetting>
                    <div className="border-t border-slate-100 my-1"></div>
                    <ToggleSetting 
                      checked={isTotalView3} 
                      onChange={() => setIsTotalView3(prev => {
                        const next = !prev;
                        if (next) setShowDiffChart(false);
                        return next;
                      })} 
                    >
                      Total
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={showDiffChart} 
                      onChange={() => {
                        setShowDiffChart(prev => {
                          const next = !prev;
                          if (next) {
                            setAlignUsers3(true);
                            setIsGroupedView3(false);
                            setIsTotalView3(false);
                          }
                          return next;
                        });
                      }} 
                    >
                      Compare Diff
                    </ToggleSetting>

                    <div className="border-t border-slate-100 my-1"></div>
                    <ToggleSetting 
                      checked={userSortOrder3 === 'desc'} 
                      onChange={() => setUserSortOrder3(prev => prev === 'desc' ? 'default' : 'desc')} 
                    >
                      Highest First
                    </ToggleSetting>
                    <ToggleSetting 
                      checked={userSortOrder3 === 'asc'} 
                      onChange={() => setUserSortOrder3(prev => prev === 'asc' ? 'default' : 'asc')} 
                    >
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
                    <h3 className="text-md font-bold text-slate-500 mb-4">
                      {firstDocumentFilterName || 'First documents'}
                    </h3>
                    <h3 className="text-md font-bold text-slate-500 mb-4">
                      {secondDocumentFilterName || 'Second Documents'}
                    </h3>
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
                  {/* First Documents */}
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
                  {/* Second Documents */}
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
      </div>
    </div>
  );
}
