import React from 'react';

export function PanelLoader() {
  return (
    <div className="max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-10 w-64 rounded-2xl bg-slate-100" />
          <div className="h-4 w-80 rounded-lg bg-slate-50" />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-3 lg:gap-6 2xl:gap-8 mb-10">
        {Array.from({ length: 5 }, (_, idx) => (
          <div key={idx} className="h-12 sm:h-36 rounded-xl sm:rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
        ))}
      </div>

      <div className="h-[28rem] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2 h-[400px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
        <div className="lg:col-span-3 h-[400px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="h-[400px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
        <div className="h-[400px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
      </div>
    </div>
  );
}

export function DataManagementLoader() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-pulse">
      <div className="h-10 w-64 rounded-2xl bg-slate-100" />
      <div className="h-32 rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-[270px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
        <div className="h-[270px] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
      </div>
      <div className="h-64 rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb" />
    </div>
  );
}
