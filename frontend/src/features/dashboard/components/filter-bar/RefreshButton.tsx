// @ts-nocheck
import React from 'react';
import { RefreshCw } from 'lucide-react';

export const RefreshButton = ({ loading, syncing, refreshAll }) => {
  return (
    <button
      onClick={() => refreshAll({
        syncFirst: true,
        syncTimeoutMs: 120000,
        refreshSnapshot: true,
      })}
      disabled={loading || syncing}
      aria-label={loading || syncing ? 'Refreshing data' : 'Refresh data'}
      className="h-9 w-9 justify-center rounded-full border-0 bg-transparent text-[#3860be] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center shadow-none max-sm:mx-0 md:h-10 md:w-auto md:px-4 md:rounded-xl md:border md:border-[#bfe8f8] md:bg-white md:text-sm md:font-semibold md:hover:bg-[#e8f7fd] md:gap-2 md:shadow-ktb transition-all duration-200 active:scale-95"
    >
      <RefreshCw className={`w-4 h-4 ${(loading || syncing) ? 'animate-spin' : ''} transition-transform duration-500`} />
      <span className="hidden md:inline">{loading || syncing ? 'Refreshing...' : 'Refresh Data'}</span>
    </button>
  );
};
