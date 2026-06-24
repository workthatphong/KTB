import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

export const SwapDocumentsButton = ({ isSwapping, onSwap }) => {
  return (
    <button
      onClick={onSwap}
      className="flex items-center justify-center w-9 h-9 shrink-0 text-slate-500 bg-white border border-[#d7e8f6] hover:text-[#3860be] hover:border-[#bfe8f8] hover:bg-[#e8f7fd] rounded-xl transition-all shadow-ktb active:scale-95"
      title="Swap Document 1 and Document 2"
    >
      <ArrowRightLeft className={`w-4 h-4 transition-transform duration-300 ${isSwapping ? 'rotate-180 scale-110' : ''}`} />
    </button>
  );
};
