import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, SlidersHorizontal } from 'lucide-react';
import { ToggleSetting } from '../../components/dashboard-view/DashboardViewPanels.jsx';
import { SheetBreakdownChart } from '../../../charts/SheetBreakdownChart.jsx';
import { buildPageTimeData } from '../SheetPerformanceUtils.js';

export function TimePerPageBlock({
  firstDocumentFilterName,
  secondDocumentFilterName,
  firstSegments,
  secondSegments,
  systemTaskType,
  isDurationDisplay,
  uniqueUsers,
  userRoleFilter,
  setUserRoleFilter,
  isStackedView,
  setIsStackedView,
  isTransparentPopup,
  setIsTransparentPopup,
  firstPanelId,
  secondPanelId
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userSortOrder, setUserSortOrder] = useState('desc');
  const [isGroupedView2, setIsGroupedView2] = useState(false);
  
  const userMenuRef = useRef(null);
  const userMenuPanelRef = useRef(null);
  const [userMenuStyle, setUserMenuStyle] = useState({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target) && (!userMenuPanelRef.current || !userMenuPanelRef.current.contains(event.target))) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    const updatePosition = () => {
      if (!userMenuRef.current) return;
      const rect = userMenuRef.current.getBoundingClientRect();
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

      setUserMenuStyle({
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
  }, [showUserMenu]);

  const firstPageTimes = useMemo(() => buildPageTimeData(firstSegments, systemTaskType, userSortOrder, userRoleFilter), [firstSegments, systemTaskType, userSortOrder, userRoleFilter]);
  const secondPageTimes = useMemo(() => buildPageTimeData(secondSegments, systemTaskType, userSortOrder, userRoleFilter), [secondSegments, systemTaskType, userSortOrder, userRoleFilter]);

  const groupedPageTimes = useMemo(() => {
    if (!isGroupedView2) return { userData: [] };
    const allSegments = [...(firstSegments || []), ...(secondSegments || [])];
    return buildPageTimeData(allSegments, systemTaskType, userSortOrder, userRoleFilter, true);
  }, [isGroupedView2, firstSegments, secondSegments, systemTaskType, userSortOrder, userRoleFilter]);

  return (
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
                <ToggleSetting checked={isGroupedView2} onChange={() => setIsGroupedView2(prev => !prev)}>
                  Group into Single Chart
                </ToggleSetting>
                <ToggleSetting checked={isStackedView} onChange={() => setIsStackedView(prev => !prev)}>
                  Split Colors
                </ToggleSetting>
                <ToggleSetting checked={isTransparentPopup} onChange={() => setIsTransparentPopup(prev => !prev)}>
                  Transparent Popup
                </ToggleSetting>
                <div className="border-t border-slate-100 my-1"></div>
                <ToggleSetting checked={userSortOrder === 'desc'} onChange={() => setUserSortOrder(prev => prev === 'desc' ? 'default' : 'desc')}>
                  Highest First
                </ToggleSetting>
                <ToggleSetting checked={userSortOrder === 'asc'} onChange={() => setUserSortOrder(prev => prev === 'asc' ? 'default' : 'asc')}>
                  Lowest First
                </ToggleSetting>
                <ToggleSetting checked={userSortOrder === 'oldest'} onChange={() => setUserSortOrder(prev => prev === 'oldest' ? 'default' : 'oldest')}>
                  Oldest First
                </ToggleSetting>
                <ToggleSetting checked={userSortOrder === 'latest'} onChange={() => setUserSortOrder(prev => prev === 'latest' ? 'default' : 'latest')}>
                  Latest First
                </ToggleSetting>
                <div className="border-t border-slate-100 my-1"></div>
                <ToggleSetting checked={userRoleFilter === 'maker_only'} onChange={() => setUserRoleFilter(prev => prev === 'maker_only' ? 'all' : 'maker_only')}>
                  Maker only
                </ToggleSetting>
                <ToggleSetting checked={userRoleFilter === 'cognize_only'} onChange={() => setUserRoleFilter(prev => prev === 'cognize_only' ? 'all' : 'cognize_only')}>
                  Cognize only
                </ToggleSetting>
                <div className="border-t border-slate-100 my-1"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1.5 mb-1.5 mt-1.5">Specific Users</div>
                <div className="flex flex-col gap-1.5 max-h-[204px] overflow-y-auto pr-2 custom-scrollbar">
                  {uniqueUsers.map(u => (
                    <ToggleSetting key={u} checked={userRoleFilter === u} onChange={() => setUserRoleFilter(prev => prev === u ? 'all' : u)}>
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
  );
}
