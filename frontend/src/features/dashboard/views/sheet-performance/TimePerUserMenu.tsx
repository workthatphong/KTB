// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal } from 'lucide-react';
import { ToggleSetting } from '../../components/dashboard-view/DashboardViewPanels';

export function TimePerUserMenu({
  showMenu,
  setShowMenu,
  isTransparentPopup,
  isGroupedView,
  setIsGroupedView,
  alignUsers,
  setAlignUsers,
  syncScroll,
  setSyncScroll,
  isTotalView,
  setIsTotalView,
  showDiffChart,
  setShowDiffChart,
  userSortOrder,
  setUserSortOrder,
  comparisonMode,
  setComparisonMode
}) {
  const menuRef = useRef(null);
  const menuPanelRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && (!menuPanelRef.current || !menuPanelRef.current.contains(event.target))) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowMenu]);

  useEffect(() => {
    if (!showMenu) return;
    const updatePosition = () => {
      if (!menuRef.current) return;
      const rect = menuRef.current.getBoundingClientRect();
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

      setMenuStyle({
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
  }, [showMenu]);

  return (
    <div className="absolute right-4 top-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="relative" ref={menuRef}>
        <button onClick={() => setShowMenu(!showMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`} title="Display & Sort">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        {showMenu && createPortal(
          <div 
            ref={menuPanelRef}
            style={menuStyle}
            className={`fixed rounded-2xl border shadow-2xl p-4 z-[99999] overflow-y-auto custom-scrollbar dropdown-slide-enter ${isTransparentPopup ? 'bg-white/30 border-slate-200/30' : 'bg-white border-slate-200'}`}
          >
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Display & Sort</div>
            <div className="flex flex-col gap-3">
              <ToggleSetting checked={isGroupedView} onChange={() => setIsGroupedView(prev => {
                const next = !prev;
                if (next) { setAlignUsers(false); setSyncScroll(false); setShowDiffChart(false); }
                return next;
              })}>
                Group into Single Chart
              </ToggleSetting>
              <ToggleSetting checked={alignUsers || showDiffChart} onChange={() => setAlignUsers(prev => {
                const next = !prev;
                if (next) setIsGroupedView(false);
                return next;
              })} disabled={showDiffChart}>
                Align Users (Same Row)
              </ToggleSetting>
              <ToggleSetting checked={syncScroll} onChange={() => setSyncScroll(prev => {
                const next = !prev;
                if (next) setIsGroupedView(false);
                return next;
              })}>
                Sync Scroll
              </ToggleSetting>
              <div className="border-t border-slate-100 my-1"></div>
              <ToggleSetting checked={isTotalView} onChange={() => setIsTotalView(prev => {
                const next = !prev;
                if (next) setShowDiffChart(false);
                return next;
              })}>
                Total
              </ToggleSetting>
              <ToggleSetting checked={showDiffChart} onChange={() => setShowDiffChart(prev => {
                const next = !prev;
                if (next) { setAlignUsers(true); setIsGroupedView(false); setIsTotalView(false); }
                return next;
              })}>
                Compare Diff
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
              <ToggleSetting checked={userSortOrder === 'desc'} onChange={() => setUserSortOrder(prev => prev === 'desc' ? 'default' : 'desc')}>
                Highest First
              </ToggleSetting>
              <ToggleSetting checked={userSortOrder === 'asc'} onChange={() => setUserSortOrder(prev => prev === 'asc' ? 'default' : 'asc')}>
                Lowest First
              </ToggleSetting>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
