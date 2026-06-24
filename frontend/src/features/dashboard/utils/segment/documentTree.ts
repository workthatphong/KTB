// @ts-nocheck
export function buildDocumentTree(sources, parsedSegments) {
  const fileMap = new Map();

  (sources || []).forEach((source) => {
    const fileName = String(source.fileName || source.name || 'Unknown File');
    if (!fileMap.has(fileName)) fileMap.set(fileName, new Set());
    (source.pages || []).forEach((page) => {
      if (page) fileMap.get(fileName).add(String(page));
    });
  });

  parsedSegments.forEach((segment) => {
    if (!fileMap.has(segment.fileName)) fileMap.set(segment.fileName, new Set());
    if (segment.pageName) fileMap.get(segment.fileName).add(segment.pageName);
  });

  return Array.from(fileMap.entries())
    .map(([fileName, sheetSet]) => ({
      fileName,
      sheets: Array.from(sheetSet).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}
