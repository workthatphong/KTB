import React, { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw } from 'lucide-react';
import { useAppController } from './hooks/useAppController.js';
import { useDashboardData } from './hooks/useDashboardData.js';
import { DashboardLayout } from './features/dashboard/DashboardLayout.jsx';
import { PanelLoader, DataManagementLoader } from './components/shared/Loaders.jsx';
import { DashboardProvider } from './contexts/DashboardContext.jsx';

const DashboardView = lazy(() => import('./features/dashboard/DashboardView.jsx').then(m => ({ default: m.DashboardView })));
const DataManagementView = lazy(() => import('./features/data-management/DataManagementView.jsx').then(m => ({ default: m.DataManagementView })));
const SystemPerformanceView = lazy(() => import('./features/dashboard/views/SystemPerformanceView.jsx').then(m => ({ default: m.SystemPerformanceView })));
const SheetPerformanceView = lazy(() => import('./features/dashboard/views/SheetPerformanceView.jsx').then(m => ({ default: m.SheetPerformanceView })));
const ExpandedVisualizationModal = lazy(() => import('./features/dashboard/components/ExpandedVisualizationModal.jsx').then(m => ({ default: m.ExpandedVisualizationModal })));
const noop = () => {};

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
    <DashboardProvider dashboard={dashboard} controller={controller}>
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
                unfilteredSegments={dashboard.systemFileLevelSegments}
                setExpandedVisualizationId={controller.setExpandedVisualizationId}
                chartSettings={controller.sheetPerformanceChartSettings}
                setChartSettings={controller.setSheetPerformanceChartSettings}
              />
            ) : (
              <DashboardView />
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
              sheetPerformanceSegments: dashboard.systemFilteredBaseSegments,
              sheetPerformanceUnfilteredSegments: dashboard.systemFileLevelSegments,
              sheetPerformanceChartSettings: controller.sheetPerformanceChartSettings,
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
    </DashboardProvider>
  );
}

export default App;
