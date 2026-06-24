// @ts-nocheck
import React from 'react';
import { KpiSubtext } from '@/components/shared/KpiSubtext';

export const KpiGridPanel = React.memo(({ kpiData }) => {
  return (
    <div className="grid grid-cols-5 gap-1 sm:gap-3 lg:gap-6 2xl:gap-8 mb-10">
      {kpiData.map((kpi, idx) => (
        <div
          key={kpi.id}
          className={`relative min-w-0 bg-white px-0.5 py-1.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#d7e8f6] shadow-ktb text-center sm:text-left animate-stagger-${Math.min(idx + 1, 5)} cursor-default`}
        >
          <div className={`hidden sm:flex w-10 h-10 rounded-xl ${kpi.bg} items-center justify-center mb-4 relative z-10`}>
            <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
          </div>
          <div className="whitespace-nowrap overflow-visible sm:overflow-hidden sm:truncate tracking-tighter sm:tracking-normal text-[0.56rem] leading-tight sm:text-sm font-semibold mb-0.5 sm:mb-1 text-slate-500 relative z-10">{kpi.label}</div>
          <div className="min-w-0 whitespace-nowrap text-[0.72rem] leading-none sm:text-[1.4rem] lg:text-[2rem] 2xl:text-[2.1rem] font-extrabold text-[#17335f] relative z-10">{kpi.value}</div>
          <div className="hidden sm:block relative z-10 min-w-0">
            <KpiSubtext text={kpi.subtext} />
          </div>
        </div>
      ))}
    </div>
  );
});
