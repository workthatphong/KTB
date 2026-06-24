import React from 'react';
import { formatDuration } from '@/lib/utils.js';
import { isIdleContextSegment, isProcessingEquivalentIdleSegment } from '@/features/dashboard/utils/segmentUtils.js';
import { SheetBreakdownChart } from '@/features/charts/SheetBreakdownChart.jsx';

const KpiBreakdownView = React.memo(({ kpiId, segments, expanded = false }) => {
  const chartData = React.useMemo(() => {
    const sheetMap = new Map();
    // Numeric IDs from buildKpiData: 1=User, 6=System, 8=Idle, 7=Total, 2=Users count
    const isDurationMetric = kpiId !== '2';

    // Filter segments based on KPI type to ensure each card shows its own relevant data
    const filteredSegments = segments.filter(s => {
      const type = String(s.segmentType || '');
      // User Time (id: 1)
      if (kpiId === '1' || kpiId === 'total-users') { // Support both string and numeric IDs
        return type.startsWith('USER_');
      }
      // System Time (id: 6)
      if (kpiId === '6' || kpiId === 'system-time') {
        return type.startsWith('SYSTEM_') || isProcessingEquivalentIdleSegment(type);
      }
      // Idle Time (id: 8)
      if (kpiId === '8' || kpiId === 'idle-time') {
        return isIdleContextSegment(type);
      }
      // Total Lead Time (id: 7) - uses all segments to calculate spans per sheet later
      if (kpiId === '7' || kpiId === 'total-time') {
        return true; 
      }
      // Contributing Users Count (id: 2)
      if (kpiId === '2') {
        return type.startsWith('USER_');
      }
      return true;
    });

    if (kpiId === '7' || kpiId === 'total-time') {
      // For Total Lead Time, we calculate the span (MaxEnd - MinStart) per sheet
      const spans = new Map();
      filteredSegments.forEach(s => {
        const key = s.sheetKey || s.fileName;
        const label = s.pageName || s.fileName;
        if (!spans.has(key)) {
          spans.set(key, { name: label, minStart: s.startTs, maxEnd: s.endTs });
        } else {
          const entry = spans.get(key);
          entry.minStart = Math.min(entry.minStart, s.startTs);
          entry.maxEnd = Math.max(entry.maxEnd, s.endTs);
        }
      });
      spans.forEach((val, key) => {
        sheetMap.set(key, { name: val.name, value: Math.max(0, (val.maxEnd - val.minStart) / 1000) });
      });
    } else if (kpiId === '2') {
      // For Contributing Users, we count unique userNames per sheet
      const userSets = new Map();
      filteredSegments.forEach(s => {
        const key = s.sheetKey || s.fileName;
        const label = s.pageName || s.fileName;
        const user = String(s.userName || '').trim();
        if (!user || user.toLowerCase() === 'system') return;
        
        if (!userSets.has(key)) {
          userSets.set(key, { name: label, users: new Set() });
        }
        userSets.get(key).users.add(user);
      });
      userSets.forEach((val, key) => {
        sheetMap.set(key, { name: val.name, value: val.users.size });
      });
    } else {
      // Normal duration or occurrence sum
      filteredSegments.forEach((s) => {
        const key = s.sheetKey || s.fileName;
        const label = s.pageName || s.fileName;
        if (!sheetMap.has(key)) {
          sheetMap.set(key, { name: label, value: 0 });
        }
        const entry = sheetMap.get(key);
        entry.value += (Number(s.durationSeconds) || 0);
      });
    }

    // Sort alphabetically by sheet name as requested (ห้เรียงามชื่อไม่ใช่มากไปน้อย)
    return Array.from(sheetMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [segments, kpiId]);

  const isDurationDisplay = kpiId !== '2';

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      <div className="bg-slate-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-slate-100 flex-1 min-h-[300px] sm:min-h-[400px]">
        <SheetBreakdownChart 
          data={chartData} 
          isDuration={isDurationDisplay} 
          expanded={expanded} 
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {chartData.slice(0, 6).map((item, idx) => {
          const avg = chartData.reduce((a,b)=>a+b.value,0)/Math.max(1, chartData.length);
          return (
            <div key={item.name} className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{item.name}</div>
                <div className="text-base sm:text-lg font-extrabold text-[#17335f]">
                  {isDurationDisplay ? formatDuration(item.value) : item.value.toLocaleString()}
                </div>
              </div>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${item.value >= avg ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                #{idx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});


export { KpiBreakdownView };
