// @ts-nocheck
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppController } from './hooks/useAppController';
import { useDashboardData } from './features/dashboard/hooks/useDashboardData';
import { DashboardLayout } from './features/dashboard/DashboardLayout';
import { PanelLoader, DataManagementLoader } from './components/shared/Loaders';
import { DashboardProvider } from './features/dashboard/contexts/DashboardContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const DashboardView = lazy(() => import('./features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const DataManagementView = lazy(() => import('./features/data-management/DataManagementView').then(m => ({ default: m.DataManagementView })));
const SystemPerformanceView = lazy(() => import('./features/dashboard/views/SystemPerformanceView').then(m => ({ default: m.SystemPerformanceView })));
const SheetPerformanceView = lazy(() => import('./features/dashboard/views/SheetPerformanceView').then(m => ({ default: m.SheetPerformanceView })));
const ExpandedVisualizationModal = lazy(() => import('./features/dashboard/components/ExpandedVisualizationModal').then(m => ({ default: m.ExpandedVisualizationModal })));
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
    <ErrorBoundary>
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
                    settings={dashboard.settings}
                    firstDocumentFilterName={dashboard.systemFirstDocumentFilterName}
                    secondDocumentFilterName={dashboard.systemSecondDocumentFilterName}
                    firstContributionRows={dashboard.systemContributionRows}
                    secondContributionRows={dashboard.systemSecondContributionRows}
                    firstContributionRowsSet1={dashboard.systemContributionRowsSet1}
                    firstContributionRowsSet2={dashboard.systemContributionRowsSet2}
                    secondContributionRowsSet1={dashboard.systemSecondContributionRowsSet1}
                    secondContributionRowsSet2={dashboard.systemSecondContributionRowsSet2}
                    firstSegmentsSet1={dashboard.systemFilteredBaseSegmentsSet1}
                    firstSegmentsSet2={dashboard.systemFilteredBaseSegmentsSet2}
                    secondSegmentsSet1={dashboard.systemSecondFilteredBaseSegmentsSet1}
                    secondSegmentsSet2={dashboard.systemSecondFilteredBaseSegmentsSet2}
                    firstDocument1Set1Name={dashboard.systemDocument1Set1Name}
                    firstDocument1Set2Name={dashboard.systemDocument1Set2Name}
                    secondDocument2Set1Name={dashboard.systemDocument2Set1Name}
                    secondDocument2Set2Name={dashboard.systemDocument2Set2Name}
                    systemDocumentsSwapped={dashboard.systemDocumentsSwapped}
                    firstSegments={dashboard.systemFilteredBaseSegments}
                    secondSegments={dashboard.systemSecondFilteredBaseSegments}
                    unfilteredSegments={dashboard.systemFileLevelSegments}
                    systemTaskType={controller.systemTaskType}
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
                  allInPage: controller.ganttAllInPage,
                  groupingMode: dashboard.selectedSheets?.length > 1 ? 'sheet' : 
                    (dashboard.selectedSheets?.length === 1 ? 'default' :
                      ((dashboard.selectedFiles?.length > 0 ? dashboard.selectedFiles.length : (dashboard.documentTree?.length || 0)) === 1 ? 'sheet' : 'file')),
                },
              }}
            />
          ) : null}
        </Suspense>
      </DashboardProvider>
    </ErrorBoundary>
  );
}

export default App;
