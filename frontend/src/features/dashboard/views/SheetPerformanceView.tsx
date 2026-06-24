// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { UserBreakdownBlock } from './sheet-performance/UserBreakdownBlock';
import { TimePerPageBlock } from './sheet-performance/TimePerPageBlock';
import { TimePerUserBlock } from './sheet-performance/TimePerUserBlock';

export function SheetPerformanceView({ 
  firstDocumentFilterName,
  secondDocumentFilterName,
  firstContributionRows,
  secondContributionRows,
  systemDocumentsSwapped,
  firstSegments,
  secondSegments,
  systemTaskType = 'all'
}) {
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [isStackedView, setIsStackedView] = useState(false);
  const [isTransparentPopup, setIsTransparentPopup] = useState(false);

  const isDurationDisplay = systemTaskType !== 'editDataRecord' && systemTaskType !== 'reviewRecord';

  const uniqueUsers = useMemo(() => {
    const usersSet = new Set();
    const addUsers = (segs) => {
      if (!segs) return;
      for (const seg of segs) {
        if (!seg.segmentType?.startsWith('USER_')) continue;
        const u = String(seg.userName || '').trim();
        const uLower = u.toLowerCase();
        if (!u || uLower === 'system' || uLower === 'idle') continue;
        usersSet.add(u);
      }
    };
    addUsers(firstSegments);
    addUsers(secondSegments);
    return Array.from(usersSet).sort();
  }, [firstSegments, secondSegments]);

  const firstPanelId = useMemo(() => `doc-${firstDocumentFilterName || 'first'}`, [firstDocumentFilterName]);
  const secondPanelId = useMemo(() => `doc-${secondDocumentFilterName || 'second'}`, [secondDocumentFilterName]);

  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17335f]">User Comparison</h1>
          <p className="text-slate-500 mt-1">Compare user time spent and edit volumes across documents.</p>
        </div>
      </div>

      <div className="space-y-6">
        <UserBreakdownBlock
          firstDocumentFilterName={firstDocumentFilterName}
          secondDocumentFilterName={secondDocumentFilterName}
          firstContributionRows={firstContributionRows}
          secondContributionRows={secondContributionRows}
          firstSegments={firstSegments}
          secondSegments={secondSegments}
          systemTaskType={systemTaskType}
          isDurationDisplay={isDurationDisplay}
          firstPanelId={firstPanelId}
          secondPanelId={secondPanelId}
        />

        <TimePerPageBlock
          firstDocumentFilterName={firstDocumentFilterName}
          secondDocumentFilterName={secondDocumentFilterName}
          firstSegments={firstSegments}
          secondSegments={secondSegments}
          systemTaskType={systemTaskType}
          isDurationDisplay={isDurationDisplay}
          uniqueUsers={uniqueUsers}
          userRoleFilter={userRoleFilter}
          setUserRoleFilter={setUserRoleFilter}
          isStackedView={isStackedView}
          setIsStackedView={setIsStackedView}
          isTransparentPopup={isTransparentPopup}
          setIsTransparentPopup={setIsTransparentPopup}
          firstPanelId={firstPanelId}
          secondPanelId={secondPanelId}
        />

        <TimePerUserBlock
          firstDocumentFilterName={firstDocumentFilterName}
          secondDocumentFilterName={secondDocumentFilterName}
          firstSegments={firstSegments}
          secondSegments={secondSegments}
          systemTaskType={systemTaskType}
          isDurationDisplay={isDurationDisplay}
          userRoleFilter={userRoleFilter}
          isStackedView={isStackedView}
          isTransparentPopup={isTransparentPopup}
          systemDocumentsSwapped={systemDocumentsSwapped}
          firstPanelId={firstPanelId}
          secondPanelId={secondPanelId}
        />
      </div>
    </div>
  );
}
