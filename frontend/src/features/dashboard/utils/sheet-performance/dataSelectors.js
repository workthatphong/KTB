export function selectIdleTimeChartData(data, mode = 'all') {
  const safeData = Array.isArray(data) ? data : [];
  if (mode === 'firstSpread') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.firstSpreadIdleValue) || 0 }));
  if (mode === 'secondSpread') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.secondSpreadIdleValue) || 0 }));
  if (mode === 'avgReviewEdit') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.avgReviewEditIdleValue) || 0 }));
  return safeData.map((entry) => ({ name: entry.name, value: Number(entry.value) || 0 }));
}

export function selectSystemTimeChartData(data, mode = 'all') {
  const safeData = Array.isArray(data) ? data : [];
  if (mode === 'firstSpread') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.firstSpreadValue) || 0 }));
  if (mode === 'secondSpread') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.secondSpreadValue) || 0 }));
  return safeData.map((entry) => ({ name: entry.name, value: Number(entry.value) || 0 }));
}

export function selectUserTimeChartData(data, mode = 'all') {
  const safeData = Array.isArray(data) ? data : [];
  if (mode === 'upload') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.uploadValue) || 0 }));
  if (mode === 'review') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.reviewValue) || 0 }));
  if (mode === 'editData') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.editDataValue) || 0 }));
  if (mode === 'editMeta') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.editMetaValue) || 0 }));
  if (mode === 'reviewCount') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.reviewCountValue) || 0 }));
  if (mode === 'editDataCount') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.editDataCountValue) || 0 }));
  if (mode === 'editMetaCount') return safeData.map((entry) => ({ name: entry.name, value: Number(entry.editMetaCountValue) || 0 }));
  return safeData.map((entry) => ({ name: entry.name, value: Number(entry.value) || 0 }));
}

export function selectTotalTimeChartData(data, mode = 'all') {
  const safeData = Array.isArray(data) ? data : [];
  if (mode === 'complete') {
    return safeData.filter(entry => entry.isCompleted).map((entry) => ({ name: entry.name, value: Number(entry.timeToCompleteSeconds) || 0 }));
  }
  return safeData.map((entry) => ({ name: entry.name, value: Number(entry.value) || 0 }));
}

export function sortSheetPerformanceChartData(data, sortOrder = 'desc') {
  const safeData = Array.isArray(data) ? data : [];
  if (sortOrder !== 'asc' && sortOrder !== 'desc') return safeData;
  const direction = sortOrder === 'asc' ? 1 : -1;
  return safeData.slice().sort((a, b) => {
    const diff = (Number(a?.value) || 0) - (Number(b?.value) || 0);
    if (diff !== 0) return diff * direction;
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'th');
  });
}
