import React from 'react';

export const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-6 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
    <Icon className="w-8 h-8 text-slate-300" />
    <div className="text-sm font-semibold text-slate-500">{title}</div>
    <div className="text-xs text-slate-400">{subtitle}</div>
  </div>
);
