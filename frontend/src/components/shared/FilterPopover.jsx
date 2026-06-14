import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export const FilterPopover = ({
  id,
  title,
  summary,
  openDropdown,
  setOpenDropdown,
  icon: Icon,
  active = false,
  minWidthClass = 'min-w-[190px]',
  panelClassName = 'w-[360px]',
  children,
}) => {
  const isOpen = openDropdown === id;
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, maxHeight: 0 });

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDocumentMouseDown = (event) => {
      const target = event.target;
      const clickedAnchor = rootRef.current && rootRef.current.contains(target);
      const clickedPanel = panelRef.current && panelRef.current.contains(target);
      if (!clickedAnchor && !clickedPanel) {
        setOpenDropdown('');
      }
    };
    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [isOpen, setOpenDropdown]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const updatePanelPosition = () => {
      const anchor = rootRef.current;
      if (!anchor) return;
      const isMobileViewport = window.innerWidth <= 639;
      const rect = anchor.getBoundingClientRect();
      const panelWidth = panelRef.current?.offsetWidth || 0;
      const viewportPadding = 8;
      const anchorGap = 8;

      if (isMobileViewport) {
        const top = Math.max(viewportPadding, rect.bottom + anchorGap);
        const maxHeight = Math.max(120, window.innerHeight - top - viewportPadding);
        setPanelStyle({
          top,
          left: `${viewportPadding}px`,
          right: `${viewportPadding}px`,
          width: 'auto',
          maxHeight,
        });
        return;
      }

      let left = rect.left;
      if (panelWidth > 0 && (left + panelWidth) > (window.innerWidth - viewportPadding)) {
        left = rect.right - panelWidth;
      }
      if (panelWidth > 0) {
        left = Math.max(viewportPadding, Math.min(left, window.innerWidth - panelWidth - viewportPadding));
      } else {
        left = Math.max(viewportPadding, left);
      }

      const top = Math.max(viewportPadding, rect.bottom + anchorGap);
      const maxHeight = Math.max(120, window.innerHeight - top - viewportPadding);
      setPanelStyle({ top, left, maxHeight, transform: 'none' });
    };

    updatePanelPosition();
    const raf = requestAnimationFrame(updatePanelPosition);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={`relative shrink-0 max-sm:flex-1 max-sm:min-w-0 ${minWidthClass}`}>
      <button
        onClick={() => setOpenDropdown(isOpen ? '' : id)}
        className={`w-full h-11 rounded-xl border px-3 flex items-center gap-2 transition-all duration-200 text-left max-sm:h-10 max-sm:rounded-lg max-sm:px-2.5 max-sm:gap-1.5 filter-button-press
          ${active ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/5' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
      >
        {Icon ? <Icon className={`w-4 h-4 max-sm:w-3.5 max-sm:h-3.5 transition-colors ${active ? 'text-blue-600' : 'text-slate-400'} shrink-0`} /> : null}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[10px] uppercase tracking-[0.08em] text-slate-400 max-sm:hidden">
            {title}
          </div>
          <div className={`text-sm font-semibold truncate max-sm:text-[11px] ${active ? 'text-blue-700' : 'text-slate-700'}`}>
            {summary}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 max-sm:w-3.5 max-sm:h-3.5 transition-transform duration-300 ${active ? 'text-blue-400' : 'text-slate-400'} ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen ? createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className={`fixed z-[200] rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_-18px_rgba(15,23,42,0.35)] overflow-y-auto no-scrollbar dropdown-slide-enter ${panelClassName}`}
        >
          {children}
        </div>,
        document.body
      ) : null}
    </div>
  );
};
