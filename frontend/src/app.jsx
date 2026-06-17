import React, { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw } from 'lucide-react';
import { useAppController } from './hooks/useAppController.js';
import { useDashboardData } from './hooks/useDashboardData.js';
import { DashboardLayout } from './features/dashboard/DashboardLayout.jsx';

const DashboardView = lazy(() => import('./features/dashboard/DashboardView.jsx').then(m => ({ default: m.DashboardView })));
const DataManagementView = lazy(() => import('./features/data-management/DataManagementView.jsx').then(m => ({ default: m.DataManagementView })));
const SystemPerformanceView = lazy(() => import('./features/dashboard/views/SystemPerformanceView.jsx').then(m => ({ default: m.SystemPerformanceView })));
const SheetPerformanceView = lazy(() => import('./features/dashboard/views/SheetPerformanceView.jsx').then(m => ({ default: m.SheetPerformanceView })));
const ExpandedVisualizationModal = lazy(() => import('./features/dashboard/components/ExpandedVisualizationModal.jsx').then(m => ({ default: m.ExpandedVisualizationModal })));
const noop = () => {};

function PanelLoader() {
  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-10 w-64 rounded-2xl bg-slate-100" />
          <div className="h-4 w-80 rounded-lg bg-slate-50" />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-3 lg:gap-6 2xl:gap-8 mb-10">
        {Array.from({ length: 5 }, (_, idx) => (
          <div key={idx} className="h-12 sm:h-36 rounded-xl sm:rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
        ))}
      </div>

      <div className="h-[28rem] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2 h-[400px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
        <div className="lg:col-span-3 h-[400px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="h-[400px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
        <div className="h-[400px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
      </div>
    </div>
  );
}

function DataManagementLoader() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-pulse">
      <div className="h-10 w-64 rounded-2xl bg-slate-100" />
      <div className="h-32 rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-[270px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
        <div className="h-[270px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
      </div>
      <div className="h-64 rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
    </div>
  );
}

function App() {
  const dashboard = useDashboardData();
  const controller = useAppController(dashboard);

  // Prevent background scrolling when a modal is open
  React.useEffect(() => {
    const shell = document.querySelector('.app-scroll-shell');
    if (!shell) return;
    
    if (controller.expandedVisualizationId) {
      shell.style.overflow = 'hidden';
    } else {
      shell.style.overflow = 'auto';
    }
  }, [controller.expandedVisualizationId]);

  return (
    <>
      <DashboardLayout dashboard={dashboard} controller={controller}>
        {!dashboard.isInitialLoadDone ? (
          controller.activeView === 'data-management' ? <DataManagementLoader /> : <PanelLoader />
        ) : (
          <Suspense fallback={controller.activeView === 'data-management' ? <DataManagementLoader /> : <PanelLoader />}>
            {controller.activeView === 'data-management' ? (
            <DataManagementView
              sources={dashboard.sources}
              onUploadFiles={controller.handleUploadFiles}
              onDeleteSource={controller.handleDeleteSource}
              onConnectGSheet={controller.handleConnectGSheet}
              onDisconnectGSheet={controller.handleDisconnectGSheet}
              gsheetConnections={dashboard.gsheetConnections}
              uploading={controller.uploading}
              syncing={dashboard.syncing}
              healthInfo={dashboard.healthInfo}
            />
            ) : controller.activeView === 'system-performance' ? (
              <SystemPerformanceView segments={dashboard.systemFilteredBaseSegments} flowRows={dashboard.systemFlowRows} />
            ) : controller.activeView === 'sheet-performance' ? (
              <SheetPerformanceView 
                segments={dashboard.systemFilteredBaseSegments} 
                setExpandedVisualizationId={controller.setExpandedVisualizationId}
              />
            ) : (
              <DashboardView
                dashboard={dashboard}
                workloadVisibleRows={controller.workloadVisibleRows}
                showProcessBreakdownIdle={controller.showProcessBreakdownIdle}
                setShowProcessBreakdownIdle={controller.setShowProcessBreakdownIdle}
                mergeReviewAndEdit={controller.mergeReviewAndEdit}
                setMergeReviewAndEdit={controller.setMergeReviewAndEdit}
                mergeSpread={controller.mergeSpread}
                setMergeSpread={controller.setMergeSpread}
                ganttSingleLaneMode={controller.ganttSingleLaneMode}
                setGanttSingleLaneMode={controller.setGanttSingleLaneMode}
                showSystemLane={controller.showSystemLane}
                setShowSystemLane={controller.setShowSystemLane}
                showStarMarkers={controller.showStarMarkers}
                ganttCollapseGaps={controller.ganttCollapseGaps}
                setGanttCollapseGaps={controller.setGanttCollapseGaps}
                showGanttLegend={controller.showGanttLegend}
                setShowGanttLegend={controller.setShowGanttLegend}
                setSelectedGanttSegment={noop}
                setExpandedVisualizationId={controller.setExpandedVisualizationId}
              />
            )}
          </Suspense>
        )}
      </DashboardLayout>

      {dashboard.showRefreshPagePrompt ? createPortal(
        <div
          className="fixed inset-0 z-[550] bg-[#17335f]/35 backdrop-blur-sm flex items-center justify-center p-4 refresh-popup-overlay-enter"
          onClick={() => dashboard.setShowRefreshPagePrompt(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden refresh-popup-panel-enter"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-10 text-center">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#00a4e4] to-[#3860be] text-white refresh-popup-icon-enter">
                <RefreshCw className="h-12 w-12" />
              </div>
              <h2 className="text-3xl font-black text-[#17335f] mb-4">Refresh Complete</h2>
              <p className="text-lg text-slate-500 mb-10 leading-relaxed px-4">
                Data has been updated successfully. Please refresh the page to load the latest information.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => dashboard.setShowRefreshPagePrompt(false)}
                  className="flex-1 py-5 px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 text-lg font-bold rounded-2xl transition-all active:scale-95"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex-1 py-5 px-8 bg-gradient-to-r from-[#00a4e4] to-[#3860be] text-white text-lg font-bold rounded-2xl shadow-xl shadow-sky-100 transition-all active:scale-95"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      <Suspense fallback={null}>
        {controller.expandedVisualizationId ? (
          <ExpandedVisualizationModal
            visualizationId={controller.expandedVisualizationId}
            onClose={() => controller.setExpandedVisualizationId('')}
            data={{
              ganttVisibleSegments: dashboard.ganttVisibleSegments,
              chartBaseSegments: dashboard.chartBaseSegments,
              selectedSegmentTypes: dashboard.selectedSegmentTypes,
              showProcessBreakdownIdle: controller.showProcessBreakdownIdle,
              workloadVisibleRows: controller.workloadVisibleRows,
              contributionRows: dashboard.contributionRows,
              mergeReviewAndEdit: controller.mergeReviewAndEdit,
              mergeSpread: controller.mergeSpread,
              setSelectedGanttSegment: noop,
              timelineSettings: {
                singleLane: controller.ganttSingleLaneMode,
                showSystemLane: controller.showSystemLane,
                showIdleLane: dashboard.showIdle,
                showStarMarkers: controller.showStarMarkers,
                collapseGaps: controller.ganttCollapseGaps,
                showGanttLegend: controller.showGanttLegend,
              },
            }}
          />
        ) : null}
      </Suspense>
    </>
  );
}

export default App;
