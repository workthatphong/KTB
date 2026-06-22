import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const isDataManagement = location.pathname === '/data-management';

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
          isDataManagement ? <DataManagementLoader /> : <PanelLoader />
        ) : (
          <Suspense fallback={isDataManagement ? <DataManagementLoader /> : <PanelLoader />}>
            <Routes>
              <Route path="/" element={<DashboardView />} />
              <Route path="/data-management" element={
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
              } />
              <Route path="/system-performance" element={
                <SystemPerformanceView segments={dashboard.systemFilteredBaseSegments} flowRows={dashboard.systemFlowRows} />
              } />
              <Route path="/sheet-performance" element={
                <SheetPerformanceView 
                  firstDocumentFilterName={dashboard.systemFirstDocumentFilterName}
                  secondDocumentFilterName={dashboard.systemSecondDocumentFilterName}
                  firstContributionRows={dashboard.systemContributionRows}
                  secondContributionRows={dashboard.systemSecondContributionRows}
                  firstSegments={dashboard.systemFilteredBaseSegments}
                  secondSegments={dashboard.systemSecondFilteredBaseSegments}
                  unfilteredSegments={dashboard.systemFileLevelSegments}
                  setExpandedVisualizationId={controller.setExpandedVisualizationId}
                  chartSettings={controller.sheetPerformanceChartSettings}
                  setChartSettings={controller.setSheetPerformanceChartSettings}
                />
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        )}
      </DashboardLayout>

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
