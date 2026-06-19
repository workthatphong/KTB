import React, { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Database,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItemClass = (isActive, isCollapsed) => `flex items-center rounded-xl font-semibold transition-[padding,background-color,border-color,color,box-shadow] duration-300 group
  ${isCollapsed ? 'justify-center px-2 py-3' : 'justify-start px-3 py-2.5 gap-3'}
  ${isActive ? 'bg-[#e8f7fd] text-[#3860be] border border-[#bfe8f8] shadow-ktb' : 'text-slate-600 hover:bg-[#eef8fd] border border-transparent'}`;

const labelClass = (isCollapsed) => `block whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out
  ${isCollapsed ? 'max-w-0 opacity-0 -translate-x-1 pointer-events-none' : 'max-w-[220px] opacity-100 translate-x-0'}`;

const sectionLabelClass = (isCollapsed, spacingClass) => `text-[10px] font-bold text-[#3860be]/70 uppercase tracking-widest overflow-hidden transition-[max-height,opacity,margin,padding,transform] duration-300 ease-out
  ${isCollapsed ? 'max-h-0 opacity-0 mt-0 mb-0 px-0 -translate-x-1 pointer-events-none' : `max-h-10 opacity-100 translate-x-0 ${spacingClass}`}`;

const SidebarContent = ({
  mobile,
  mobileStateClass,
  isCollapsed,
  toggleCollapse,
  setMobileOpen,
}) => (
  <aside
    className={
      mobile
        ? `fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r border-[#d7e8f6] bg-white shadow-2xl will-change-transform transform-gpu ${mobileStateClass || ''}`
        : `hidden lg:flex scroll-clarity-layer flex-col border-r border-[#d7e8f6] bg-white transition-[transform,width] duration-300 ease-out lg:relative lg:z-[150] ${
            isCollapsed ? 'lg:w-20' : 'lg:w-64'
          }`
    }
  >
    {!mobile && (
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-8 hidden h-6 w-6 items-center justify-center rounded-full border border-[#bfe8f8] bg-white text-slate-500 shadow-sm transition-colors hover:border-[#00a4e4] hover:text-[#00a4e4] lg:flex z-50"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    )}

    <div
      className={`h-20 shrink-0 flex items-center border-b border-[#d7e8f6] overflow-hidden transition-[padding,justify-content] duration-300 ${
        mobile
          ? 'justify-start px-6'
          : isCollapsed
            ? 'justify-center px-3 lg:px-0'
            : 'justify-start px-6'
      }`}
    >
      <div className="flex items-center gap-2 min-w-max">
        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
          <img
            src="/krung-thai-bank-logo.svg"
            alt="KTB Logo"
            className="block h-8 w-8 object-contain"
          />
        </div>
        <span className={`text-2xl font-extrabold tracking-tight text-[#17335f] ${mobile ? '' : labelClass(isCollapsed)}`}>
          Audit Log
        </span>
      </div>
      <button className={`ml-auto ${mobile ? '' : 'lg:hidden'}`} onClick={() => setMobileOpen(false)}>
        <X className="w-5 h-5 text-slate-500" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 no-scrollbar">
      <div className={sectionLabelClass(isCollapsed, 'mb-4 px-3')}>
        Dashboards
      </div>
      <nav className="space-y-1">
        <NavLink
          to="/"
          onClick={() => {
            if (mobile) setMobileOpen(false);
          }}
          className={({ isActive }) => navItemClass(isActive, isCollapsed)}
          title="Dashboard Overview"
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-[#00a4e4]' : ''}`} />
              <span className={labelClass(isCollapsed)}>
                Dashboard Overview
              </span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/sheet-performance"
          onClick={() => {
            if (mobile) setMobileOpen(false);
          }}
          className={({ isActive }) => navItemClass(isActive, isCollapsed)}
          title="Sheet Performance"
        >
          {({ isActive }) => (
            <>
              <BarChart3 className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-[#00a4e4]' : ''}`} />
              <span className={labelClass(isCollapsed)}>
                Sheet Performance
              </span>
            </>
          )}
        </NavLink>
      </nav>

      <div className={sectionLabelClass(isCollapsed, 'mt-8 mb-4 px-3')}>
        Data Management
      </div>
      <nav className="space-y-1">
        <NavLink
          to="/data-management"
          onClick={() => {
            if (mobile) setMobileOpen(false);
          }}
          className={({ isActive }) => navItemClass(isActive, isCollapsed)}
          title="Data Management"
        >
          {({ isActive }) => (
            <>
              <Database className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-[#00a4e4]' : ''}`} />
              <span className={labelClass(isCollapsed)}>
                Data Management
              </span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  </aside>
);

export const Sidebar = memo(function Sidebar({
  isMobileOpen,
  setMobileOpen,
  isCollapsed,
  toggleCollapse,
}) {
  const [mounted, setMounted] = useState(isMobileOpen);
  const [visible, setVisible] = useState(isMobileOpen);

  useEffect(() => {
    if (isMobileOpen) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timeout);
  }, [isMobileOpen]);

  return (
    <>
      <SidebarContent
        mobile={false}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
        setMobileOpen={setMobileOpen}
      />

      {mounted && typeof document !== 'undefined'
        ? createPortal(
          <div className="fixed inset-0 z-[200] lg:hidden">
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setMobileOpen(false)}
              className={`absolute inset-0 z-0 cursor-default bg-[#17335f]/40 backdrop-blur-sm ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
            />
            <SidebarContent
              mobile
              mobileStateClass={visible ? 'mobile-sidebar-enter' : 'mobile-sidebar-exit'}
              isCollapsed={false}
              toggleCollapse={toggleCollapse}
              setMobileOpen={setMobileOpen}
            />
          </div>,
          document.body,
        )
        : null}
    </>
  );
});
