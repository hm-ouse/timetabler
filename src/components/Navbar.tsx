import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  CalendarCheck2,
  Share2,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { FestivalData, TimeSimulation, FilterSettings } from '../types';

interface NavbarProps {
  festival: FestivalData;
  timeSim: TimeSimulation;
  setTimeSim: React.Dispatch<React.SetStateAction<TimeSimulation>>;
  currentTimeFormatted: string;
  onOpenSheetModal?: () => void;
  onOpenLineupModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenSettings?: () => void;
  filterSettings: FilterSettings;
  setFilterSettings: React.Dispatch<React.SetStateAction<FilterSettings>>;
}

export const Navbar: React.FC<NavbarProps> = ({
  festival,
  timeSim,
  setTimeSim,
  currentTimeFormatted,
  onOpenSettings,
}) => {
  const [showSimControls, setShowSimControls] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header id="app-header" className="sticky top-0 z-40 bg-[#161420]/95 backdrop-blur border-b border-[#29253b] text-[#e2deec] shadow-md shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 shadow-sm shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center">
                FestSync
                <span className="text-emerald-300 text-[10px] font-bold ml-2 px-2 py-0.5 bg-emerald-500/15 rounded-full border border-emerald-500/30">
                  Festival Planner
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Center / Right Metadata & Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Current Festival Status */}
          <div className="hidden md:block text-right">
            <p className="text-[10px] uppercase tracking-widest text-[#7c768e] font-bold">Current Festival</p>
            <p className="text-xs sm:text-sm text-[#f1edf8] font-medium truncate max-w-[180px]">{festival.name}</p>
          </div>

          <div className="hidden md:block h-8 w-px bg-[#29253b]" />

          {/* Time / Clock Widget with Sim Popover */}
          <div className="relative">
            <button
              id="btn-time-simulation-toggle"
              type="button"
              onClick={() => setShowSimControls(!showSimControls)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-right ${
                timeSim.enabled
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#1f1c2c] border-[#2f2a44] text-[#e2deec] hover:border-[#40395c]'
              }`}
              title="Click to simulate festival time or view live time"
            >
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#8e88a3] font-bold">
                  {timeSim.enabled ? 'Simulated Time' : 'System Clock'}
                </p>
                <p className="text-sm font-mono text-emerald-400 font-bold leading-tight">
                  {timeSim.enabled ? timeSim.simulatedTime : currentTimeFormatted}
                </p>
              </div>
              <Sliders className="w-3.5 h-3.5 text-[#8e88a3]" />
            </button>

            {/* Time simulation dropdown popup */}
            {showSimControls && (
              <div
                id="time-sim-panel"
                className="absolute right-0 top-full mt-2 w-72 bg-[#1a1726] border border-[#322d4a] rounded-2xl p-4 shadow-2xl z-50 text-[#e2deec]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#9d97b0]">Time Simulation</span>
                  <button
                    id="btn-close-sim"
                    type="button"
                    onClick={() => setShowSimControls(false)}
                    className="text-xs text-[#8e88a3] hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-[#b5b0c4] mb-3">
                  Simulate attending the festival to test "Now Playing", past set dimming, and "Jump to Current Time".
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8e88a3]">Simulation Mode</span>
                    <button
                      id="btn-toggle-sim-mode"
                      type="button"
                      onClick={() => setTimeSim((prev) => ({ ...prev, enabled: !prev.enabled }))}
                      className={`px-2.5 py-1 rounded-lg font-medium text-xs transition ${
                        timeSim.enabled ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-[#282338] text-[#b5b0c4]'
                      }`}
                    >
                      {timeSim.enabled ? 'Active' : 'Live Clock'}
                    </button>
                  </div>

                  {timeSim.enabled && (
                    <>
                      <div>
                        <label className="block text-[11px] text-[#8e88a3] mb-1">Simulated Festival Time (HH:MM)</label>
                        <input
                          type="time"
                          value={timeSim.simulatedTime}
                          onChange={(e) => setTimeSim((prev) => ({ ...prev, simulatedTime: e.target.value }))}
                          className="w-full bg-[#100e18] border border-[#2d283e] rounded-xl px-2.5 py-1.5 text-sm text-white font-mono"
                        />
                      </div>

                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {['14:00', '18:30', '20:45', '23:15'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTimeSim((prev) => ({ ...prev, simulatedTime: t }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                              timeSim.simulatedTime === t
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'bg-[#231f32] text-[#b5b0c4] hover:bg-[#2c273e] border border-[#322d4a]'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Settings & Storage Button */}
            {onOpenSettings && (
              <button
                id="btn-navbar-settings"
                type="button"
                onClick={onOpenSettings}
                className="p-2.5 rounded-xl bg-[#1f1c2c] hover:bg-[#282338] border border-[#2f2a44] text-[#8e88a3] hover:text-emerald-300 transition shrink-0"
                title="Settings & Storage Diagnostics"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
