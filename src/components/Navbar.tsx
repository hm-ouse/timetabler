import React from 'react';
import {
  Clock,
  Settings,
} from 'lucide-react';
import { FestivalData, FilterSettings } from '../types';

interface NavbarProps {
  festival: FestivalData;
  currentTimeFormatted: string;
  onOpenSheetModal?: () => void;
  onOpenLineupModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenSettings?: () => void;
  filterSettings?: FilterSettings;
  setFilterSettings?: React.Dispatch<React.SetStateAction<FilterSettings>>;
}

export const Navbar: React.FC<NavbarProps> = ({
  festival,
  currentTimeFormatted,
  onOpenSettings,
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-40 bg-[#161420]/95 backdrop-blur border-b border-[#29253b] text-[#e2deec] shadow-md shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 shadow-sm shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center truncate">
                timetabler
              </h1>
            </div>
          </div>
        </div>

        {/* Right Metadata & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Current Festival Name (Desktop) */}
          <div className="hidden md:block text-right">
            <p className="text-[10px] uppercase tracking-widest text-[#7c768e] font-bold">Current Festival</p>
            <p className="text-xs sm:text-sm text-[#f1edf8] font-medium truncate max-w-[180px]">{festival.name}</p>
          </div>

          <div className="hidden md:block h-7 w-px bg-[#29253b]" />

          {/* Real-time System Clock */}
          <div
            id="navbar-system-clock"
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1f1c2c] border border-[#2f2a44] text-[#e2deec] shrink-0"
            title="Current Real-World Clock"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="text-left">
              <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#8e88a3] font-bold leading-tight">
                Live Clock
              </p>
              <p className="text-xs sm:text-sm font-mono text-emerald-400 font-bold leading-tight">
                {currentTimeFormatted}
              </p>
            </div>
          </div>

          {/* Settings & Storage Button */}
          {onOpenSettings && (
            <button
              id="btn-navbar-settings"
              type="button"
              onClick={onOpenSettings}
              className="p-2 sm:p-2.5 rounded-xl bg-[#1f1c2c] hover:bg-[#282338] border border-[#2f2a44] hover:border-[#3e3754] text-[#b5b0c4] hover:text-emerald-300 transition shrink-0 flex items-center justify-center cursor-pointer"
              title="Settings & Storage Diagnostics"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
