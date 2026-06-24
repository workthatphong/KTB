import React from 'react';
import { FilterPopover } from '@/components/shared/FilterPopover.jsx';
import { ListTodo } from 'lucide-react';

export const TaskTypeFilter = ({
  systemTaskType,
  setSystemTaskType,
  openDropdown,
  setOpenDropdown
}) => {
  const getSummary = () => {
    switch(systemTaskType) {
      case 'all': return 'Review & Edit Data Time';
      case 'editData': return 'Edit Data Time';
      case 'editDataRecord': return 'Edit Data Record';
      case 'reviewRecord': return 'Review Count';
      default: return 'Review time';
    }
  };

  const options = [
    { id: 'all', label: 'Review & Edit Data Time' },
    { id: 'editData', label: 'Edit Data Time' },
    { id: 'review', label: 'Review time' },
    { id: 'editDataRecord', label: 'Edit Data Record' },
    { id: 'reviewRecord', label: 'Review count' }
  ];

  return (
    <FilterPopover
      id="taskType"
      title="Task Type"
      summary={getSummary()}
      openDropdown={openDropdown}
      setOpenDropdown={setOpenDropdown}
      icon={ListTodo}
      active={systemTaskType !== 'all'}
      minWidthClass="w-[140px]"
      panelClassName="w-[200px]"
    >
      <div className="p-1.5 flex flex-col gap-0.5">
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => { setSystemTaskType(opt.id); setOpenDropdown(''); }}
            className={`w-full text-left px-3 py-2 text-[13px] font-semibold rounded-lg transition-colors ${systemTaskType === opt.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </FilterPopover>
  );
};
