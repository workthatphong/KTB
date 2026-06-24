// @ts-nocheck
import React from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { FilterBar } from './components/FilterBar';
import { useLocation } from 'react-router-dom';

export function DashboardLayout({
  dashboard,
  controller,
  children
}) {
  const {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    openDropdown,
    setOpenDropdown,
    userSearchText,
    setUserSearchText,
    segmentTypeSearchText,
    setSegmentTypeSearchText,
    documentFileSearch,
    setDocumentFileSearch,
    documentSheetSearch,
    setDocumentSheetSearch,
    systemDocumentFileSearch,
    setSystemDocumentFileSearch,
    systemDocumentSheetSearch,
    setSystemDocumentSheetSearch,
    systemSecondDocumentFileSearch,
    setSystemSecondDocumentFileSearch,
    systemSecondDocumentSheetSearch,
    setSystemSecondDocumentSheetSearch,
    systemTaskType,
    setSystemTaskType,
  } = controller;
  const location = useLocation();
  const isSystemPerformanceView = location.pathname === '/sheet-performance';

  return (
    <div className="flex h-screen bg-[#fbfdff] font-sans text-slate-900 overflow-hidden">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        setMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <FilterBar
          dashboard={dashboard}
          filterMode={isSystemPerformanceView ? 'system-performance' : 'dashboard'}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          userSearchText={userSearchText}
          setUserSearchText={setUserSearchText}
          segmentTypeSearchText={segmentTypeSearchText}
          setSegmentTypeSearchText={setSegmentTypeSearchText}
          documentFileSearch={isSystemPerformanceView ? systemDocumentFileSearch : documentFileSearch}
          setDocumentFileSearch={isSystemPerformanceView ? setSystemDocumentFileSearch : setDocumentFileSearch}
          documentSheetSearch={isSystemPerformanceView ? systemDocumentSheetSearch : documentSheetSearch}
          setDocumentSheetSearch={isSystemPerformanceView ? setSystemDocumentSheetSearch : setDocumentSheetSearch}
          systemSecondDocumentFileSearch={systemSecondDocumentFileSearch}
          setSystemSecondDocumentFileSearch={setSystemSecondDocumentFileSearch}
          systemSecondDocumentSheetSearch={systemSecondDocumentSheetSearch}
          setSystemSecondDocumentSheetSearch={setSystemSecondDocumentSheetSearch}
          systemTaskType={systemTaskType}
          setSystemTaskType={setSystemTaskType}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        <main className="app-scroll-shell flex-1 p-4 md:p-8 relative">
          {dashboard.supabaseError && <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-800 rounded-xl">{dashboard.supabaseError}</div>}
          {dashboard.errorMessage && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">{dashboard.errorMessage}</div>}
          {dashboard.backendWarning && <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">{dashboard.backendWarning}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
