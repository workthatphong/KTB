// @ts-nocheck
import React from 'react';

export const KpiSubtext = ({ text }) => {
  const content = String(text || '').trim();
  if (!content) return null;
  const parts = content.split('|').map((item) => item.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return <div className="text-xs text-slate-400 mt-2 font-medium leading-snug">{content}</div>;
  }
  return (
    <div className="text-xs text-slate-400 mt-2 font-medium leading-snug space-y-0.5">
      {parts.map((part, idx) => (
        <div key={`${part}-${idx}`} className="truncate" title={part}>{part}</div>
      ))}
    </div>
  );
};
