import os

utils_file = '/workspaces/KTB/frontend/src/features/dashboard/components/dashboard-view/DashboardViewUtils.js'
with open(utils_file, 'r') as f:
    content = f.read()
content = content.replace("'../../../lib/constants.js'", "'../../../../lib/constants.js'")
content = content.replace("'../../../lib/segmentUtils.js'", "'../../../../lib/segmentUtils.js'")
with open(utils_file, 'w') as f:
    f.write(content)

panels_file = '/workspaces/KTB/frontend/src/features/dashboard/components/dashboard-view/DashboardViewPanels.jsx'
with open(panels_file, 'r') as f:
    content = f.read()
content = content.replace("'../../../components/shared/EmptyState.jsx'", "'../../../../components/shared/EmptyState.jsx'")
content = content.replace("'../../../components/shared/KpiSubtext.jsx'", "'../../../../components/shared/KpiSubtext.jsx'")
content = content.replace("'../../charts/DonutWorkloadChart.jsx'", "'../../../charts/DonutWorkloadChart.jsx'")
content = content.replace("'../../charts/UserContributionStackChart.jsx'", "'../../../charts/UserContributionStackChart.jsx'")
content = content.replace("'../../timeline/GanttTimelineChart.jsx'", "'../../../timeline/GanttTimelineChart.jsx'")
content = content.replace("'../../charts/ProcessTimeBreakdownChart.jsx'", "'../../../charts/ProcessTimeBreakdownChart.jsx'")
with open(panels_file, 'w') as f:
    f.write(content)
