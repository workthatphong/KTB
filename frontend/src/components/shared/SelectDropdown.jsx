import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export const SelectDropdown = ({ value, onChange, options, minWidth = 'w-[140px]' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.id === value) || options[0];
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      const clickedAnchor = rootRef.current && rootRef.current.contains(e.target);
      const clickedPanel = panelRef.current && panelRef.current.contains(e.target);
      if (!clickedAnchor && !clickedPanel) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      setPanelStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${minWidth} shrink-0`} ref={rootRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 md:h-10 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-700 transition-colors shadow-sm flex items-center justify-between"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 ml-1.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && createPortal(
        <div 
          ref={panelRef}
          style={panelStyle}
          className="fixed bg-white rounded-xl border border-slate-200 shadow-xl z-[9999] overflow-hidden dropdown-slide-enter"
        >
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-[13px] transition-colors ${value === opt.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
