// @ts-nocheck
import { buildSheetKey } from '@/lib/utils';

export function parseSegments(segments) {
  const parsed = [];

  segments.forEach((segment, idx) => {
    const [docFileFromId = '', docPageFromId = ''] = String(segment.documentId || '').split('::');
    const fileName = String(segment.fileName || docFileFromId || 'Unknown File');
    const pageName = String(segment.pageName || docPageFromId || '');
    const sheetKey = buildSheetKey(fileName, pageName);

    const startTs = Date.parse(segment.start || '');
    const endTsRaw = Date.parse(segment.end || '');
    if (!Number.isFinite(startTs) || !Number.isFinite(endTsRaw)) return;

    const documentLabel = pageName ? `${fileName} / ${pageName}` : fileName;
    parsed.push({
      ...segment,
      id: segment.id || `${segment.segmentType || 'UNKNOWN'}-${idx}`,
      segmentType: String(segment.segmentType || 'UNKNOWN'),
      userName: String(segment.userName || 'Unknown User'),
      fileName,
      pageName,
      sheetKey,
      rawStartTs: startTs,
      rawEndTs: Math.max(endTsRaw, startTs + 1000),
      rawStart: segment.start,
      rawEnd: segment.end,
      startTs,
      endTs: Math.max(endTsRaw, startTs + 1000),
      documentLabel,
    });
  });

  return parsed;
}
