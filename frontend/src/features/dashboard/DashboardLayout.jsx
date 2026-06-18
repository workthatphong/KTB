import React from 'react';
import { Sidebar } from '../../components/shared/Sidebar.jsx';
import { FilterBar } from './components/FilterBar.jsx';

export function DashboardLayout({
  dashboard,
  controller,
  children
}) {
  const {
    activeView,
    setActiveView,
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
  } = controller;
  const isSystemPerformanceView = activeView === 'sheet-performance';

  return (
    <div className="flex h-screen bg-[#fbfdff] font-sans text-slate-900 overflow-hidden">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
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
