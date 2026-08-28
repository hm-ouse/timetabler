import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Filter,
  Grid,
  List,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  HelpCircle,
  Sliders,
  CalendarCheck2,
  ArrowRight,
  TrendingUp,
  Music,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp,
  BarChart2,
} from 'lucide-react';
import {
  UserRating,
  FestivalData,
  FilterSettings,
  TimeSimulation,
  MatchedScheduleItem,
  AttendanceStatus,
  SheetParseResult,
} from './types';
import { SAMPLE_FESTIVALS, SAMPLE_RATING_SHEETS } from './data/samplePresets';
import { parseSheetContent } from './utils/sheetParser';
import { matchScheduleWithRatings } from './utils/matcher';
import {
  validateAndCleanStorage,
  loadStoredFestival,
  saveStoredFestival,
  loadStoredRatings,
  saveStoredRatings,
  loadStoredStatusOverrides,
  saveStoredStatusOverrides,
  loadStoredFilterSettings,
  saveStoredFilterSettings,
  loadStoredSidebarState,
  saveStoredSidebarState,
  resetAllStorageData,
} from './utils/storageManager';
import { Navbar } from './components/Navbar';
import { TimetableGrid } from './components/TimetableGrid';
import { TimelineListView } from './components/TimelineListView';
import { ClashInspectorView } from './components/ClashInspectorView';
import { RatingsSheetView } from './components/RatingsSheetView';
import { SheetManagerModal } from './components/SheetManagerModal';
import { LineupManagerModal } from './components/LineupManagerModal';
import { ArtistDetailModal } from './components/ArtistDetailModal';
import { CalendarExportModal } from './components/CalendarExportModal';
import { QuickRateModal } from './components/QuickRateModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  // 1. Initial State Initialization with safe persistence
  const [festival, setFestival] = useState<FestivalData>(() => {
    const saved = loadStoredFestival();
    return saved || SAMPLE_FESTIVALS[0];
  });

  const [ratings, setRatings] = useState<UserRating[]>(() => {
    const saved = loadStoredRatings();
    if (saved && saved.ratings.length > 0) {
      return saved.ratings;
    }
    const parsed = parseSheetContent(SAMPLE_RATING_SHEETS[0].csvContent, 'auto');
    return parsed.ratings;
  });

  const [sheetMeta, setSheetMeta] = useState<SheetParseResult | undefined>(() => {
    const saved = loadStoredRatings();
    if (saved && saved.meta) {
      return saved.meta;
    }
    return parseSheetContent(SAMPLE_RATING_SHEETS[0].csvContent, 'auto');
  });

  const [rawCsv, setRawCsv] = useState<string>(() => {
    const saved = loadStoredRatings();
    return saved?.rawCsv || SAMPLE_RATING_SHEETS[0].csvContent;
  });

  // Collapsible sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return loadStoredSidebarState();
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      saveStoredSidebarState(next);
      return next;
    });
  };

  // User attendance status overrides by set id
  const [userStatusOverrides, setUserStatusOverrides] = useState<Record<string, AttendanceStatus>>(() => {
    return loadStoredStatusOverrides();
  });

  // Filter and view configurations
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(() => {
    const saved = loadStoredFilterSettings();
    const defaults: FilterSettings = {
      minScorePercent: 60, // Filters for medium to high ratings (>= 60%)
      scoreTiers: ['must_see', 'recommended', 'medium'],
      showUnrated: true, // Keep unrated and unreviewed bands on schedule
      showElapsed: true,
      dimPastSets: true,
      timeDensity: 'standard',
      onlyAttendingOrMaybe: false,
      searchQuery: '',
      activeView: 'grid',
    };
    return saved ? { ...defaults, ...saved } : defaults;
  });

  const handleUpdateFilterSettings = (updater: React.SetStateAction<FilterSettings>) => {
    setFilterSettings((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStoredFilterSettings(next);
      return next;
    });
  };

  // Run initial storage health validation on mount
  useEffect(() => {
    validateAndCleanStorage();
  }, []);

  // Time simulation state for festival testing
  const [timeSim, setTimeSim] = useState<TimeSimulation>({
    enabled: true,
    simulatedTime: '20:45',
    simulatedDayId: 'friday',
    autoAdvance: false,
  });

  // Real-world clock tick
  const [realClock, setRealClock] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setRealClock(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const activeTimeString = timeSim.enabled ? timeSim.simulatedTime : realClock;

  // Active Modals state
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedArtistItem, setSelectedArtistItem] = useState<MatchedScheduleItem | null>(null);
  const [quickRateState, setQuickRateState] = useState<{
    isOpen: boolean;
    artistName: string;
    score: number;
    review?: string;
    genre?: string;
  }>({
    isOpen: false,
    artistName: '',
    score: 75,
  });

  // 2. Compute Schedule Matching & Clashes
  const matchedScheduleItems = useMemo(() => {
    return matchScheduleWithRatings(
      festival.sets,
      ratings,
      filterSettings.minScorePercent,
      { dayId: timeSim.enabled ? timeSim.simulatedDayId : 'friday', time: activeTimeString },
      userStatusOverrides,
      8
    );
  }, [festival.sets, ratings, filterSettings.minScorePercent, timeSim, activeTimeString, userStatusOverrides]);

  // Real-time lookup for currently selected artist modal item so rating/review changes reflect live
  const activeSelectedArtistItem = useMemo(() => {
    if (!selectedArtistItem) return null;
    return matchedScheduleItems.find((m) => m.id === selectedArtistItem.id) || selectedArtistItem;
  }, [selectedArtistItem, matchedScheduleItems]);

  // Sidebar stats view tab state
  const [statsViewMode, setStatsViewMode] = useState<'sheet' | 'festival'>('sheet');

  // Statistics calculation for both Sheet preferences and Festival lineup matches
  const sheetStats = useMemo(() => {
    const total = ratings.length;
    const mustSee = ratings.filter((r) => r.isRated && r.normalizedScore >= 85).length;
    const recommended = ratings.filter((r) => r.isRated && r.normalizedScore >= 70 && r.normalizedScore < 85).length;
    const medium = ratings.filter((r) => r.isRated && r.normalizedScore >= 50 && r.normalizedScore < 70).length;
    const low = ratings.filter((r) => r.isRated && r.normalizedScore < 50).length;
    const unrated = ratings.filter((r) => !r.isRated).length;
    const ratedCount = ratings.filter((r) => r.isRated).length;

    return {
      total,
      mustSee,
      recommended,
      medium,
      low,
      unrated,
      ratedCount,
    };
  }, [ratings]);

  const festivalStats = useMemo(() => {
    const totalSets = festival.sets.length;
    const matchedSets = matchedScheduleItems.filter((m) => m.isRated).length;
    const liked = matchedScheduleItems.filter(
      (m) => (m.isRated && m.normalizedScore >= filterSettings.minScorePercent) || m.status === 'attending'
    );
    const mustSee = liked.filter((m) => m.isRated && m.tier === 'must_see').length;
    const recommended = liked.filter((m) => m.isRated && m.tier === 'recommended').length;
    const medium = liked.filter((m) => m.isRated && m.tier === 'medium').length;
    const unratedSlots = matchedScheduleItems.filter((m) => !m.isRated).length;
    const clashes = liked.filter((m) => m.hasClash).length;

    return {
      totalSets,
      matchedSets,
      totalLiked: liked.length,
      mustSee,
      recommended,
      medium,
      unratedSlots,
      clashes: Math.floor(clashes / 2),
    };
  }, [festival.sets.length, matchedScheduleItems, filterSettings.minScorePercent]);

  // Backward compatibility alias for navbar / export
  const stats = festivalStats;

  // Handle Attendance status toggle
  const handleToggleStatus = (setId: string, newStatus: AttendanceStatus) => {
    setUserStatusOverrides((prev) => {
      const next = {
        ...prev,
        [setId]: newStatus,
      };
      saveStoredStatusOverrides(next);
      return next;
    });
  };

  // Handle Ratings Update from modal or paste
  const handleUpdateRatings = (newRatings: UserRating[], meta: SheetParseResult, newRawCsv: string) => {
    setRatings(newRatings);
    setSheetMeta(meta);
    setRawCsv(newRawCsv);
    saveStoredRatings(newRatings, newRawCsv);
  };

  // Handle Festival Lineup Update (persists across sessions)
  const handleUpdateFestival = (newFest: FestivalData) => {
    setFestival(newFest);
    saveStoredFestival(newFest);
  };

  // Reset all application data and storage back to default initial state
  const handleResetAllData = () => {
    resetAllStorageData();
    setFestival(SAMPLE_FESTIVALS[0]);
    const defaultParsed = parseSheetContent(SAMPLE_RATING_SHEETS[0].csvContent, 'auto');
    setRatings(defaultParsed.ratings);
    setSheetMeta(defaultParsed);
    setRawCsv(SAMPLE_RATING_SHEETS[0].csvContent);
    setUserStatusOverrides({});
    setFilterSettings({
      minScorePercent: 60,
      scoreTiers: ['must_see', 'recommended', 'medium'],
      showUnrated: true,
      showElapsed: true,
      dimPastSets: true,
      timeDensity: 'standard',
      onlyAttendingOrMaybe: false,
      searchQuery: '',
      activeView: 'grid',
    });
  };

  // Restore backup from JSON
  const handleRestoreBackup = (backup: {
    festival?: FestivalData;
    ratings?: UserRating[];
    rawCsv?: string;
    statusOverrides?: Record<string, AttendanceStatus>;
  }) => {
    if (backup.festival) {
      setFestival(backup.festival);
      saveStoredFestival(backup.festival);
    }
    if (backup.ratings) {
      setRatings(backup.ratings);
      if (backup.rawCsv) {
        setRawCsv(backup.rawCsv);
        try {
          setSheetMeta(parseSheetContent(backup.rawCsv, 'auto'));
        } catch {
          // fallback
        }
      }
      saveStoredRatings(backup.ratings, backup.rawCsv);
    }
    if (backup.statusOverrides) {
      setUserStatusOverrides(backup.statusOverrides);
      saveStoredStatusOverrides(backup.statusOverrides);
    }
  };

  // Handle Re-Rating / In-App Rating update (supports (artist, score, review, genre, scale))
  const handleRateArtist = (
    artistName: string,
    score: number,
    reviewSummary?: string,
    genre?: string,
    scale: string = 'percent'
  ) => {
    let normalized = score;
    if (scale === '1-10') normalized = Math.round((score / 10) * 100);
    else if (scale === '1-5') normalized = Math.round((score / 5) * 100);
    else if (scale === '1-4') normalized = Math.round((score / 4) * 100);
    else normalized = Math.round(score);

    setRatings((prev) => {
      const idx = prev.findIndex(
        (r) => r.artist.toLowerCase().trim() === artistName.toLowerCase().trim()
      );
      const existing = idx >= 0 ? prev[idx] : undefined;
      const finalReview =
        typeof reviewSummary === 'string'
          ? reviewSummary
          : existing && existing.reviewSummary
          ? existing.reviewSummary
          : '';
      const finalGenre =
        typeof genre === 'string' && genre.trim().length > 0
          ? genre
          : existing
          ? existing.genre
          : undefined;

      const updatedRating: UserRating = {
        id: existing ? existing.id : `custom-rate-${Date.now()}`,
        artist: artistName,
        rawScore: score,
        detectedScale: scale === 'percent' ? 'Scale %' : scale,
        normalizedScore: normalized,
        isRated: true,
        isReviewed: finalReview.trim().length > 0,
        reviewSummary: finalReview,
        genre: finalGenre,
      };

      let next: UserRating[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = updatedRating;
      } else {
        next = [...prev, updatedRating];
      }

      saveStoredRatings(next);
      return next;
    });
  };

  return (
    <div id="festival-planner-root" className="min-h-screen bg-[#0d0c13] text-[#e2deec] flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* High-Density Top Navigation */}
      <Navbar
        festival={festival}
        timeSim={timeSim}
        setTimeSim={setTimeSim}
        currentTimeFormatted={realClock}
        filterSettings={filterSettings}
        setFilterSettings={handleUpdateFilterSettings}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main High-Density Workspace Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-5 flex flex-col lg:flex-row gap-3.5 overflow-hidden">
        {/* Mobile Accordion Toggle for Preferences Sidebar */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-[#161420] border border-[#2a253d]/80 rounded-xl text-xs font-semibold text-[#b7b2c6] shadow-sm hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <span>Data Intelligence & Preferences ({ratings.length} artists)</span>
            </div>
            {isMobileSidebarOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Collapsed Sidebar Rail for Desktop */}
        {isSidebarCollapsed && (
          <aside className="hidden lg:flex lg:w-14 bg-[#161420] border border-[#2a253d]/80 rounded-2xl p-2 flex-col items-center justify-between gap-3 shrink-0 shadow-lg transition-all duration-300">
            <div className="flex flex-col items-center gap-2.5 w-full">
              {/* Expand Toggle Button */}
              <button
                id="btn-sidebar-expand"
                type="button"
                onClick={toggleSidebar}
                className="p-2 rounded-xl text-[#9e98b3] hover:text-white hover:bg-[#231f32] transition w-full flex items-center justify-center"
                title="Expand intelligence & setup sidebar"
              >
                <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
              </button>

              <div className="w-8 h-px bg-[#2a253d]/80 my-0.5" />

              {/* Setup Step 1: Ratings Sheet Mini Icon */}
              <button
                id="btn-mini-setup-ratings"
                type="button"
                onClick={() => setIsSheetModalOpen(true)}
                className="p-2 rounded-xl text-[#9e98b3] hover:text-emerald-300 hover:bg-[#231f32] transition relative group flex items-center justify-center"
                title={`App Setup (Step 1): Manage Ratings Sheet (${ratings.length} artists)`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
              </button>

              {/* Setup Step 2: Festival Lineup Mini Icon */}
              <button
                id="btn-mini-setup-lineup"
                type="button"
                onClick={() => setIsLineupModalOpen(true)}
                className="p-2 rounded-xl text-[#9e98b3] hover:text-indigo-300 hover:bg-[#231f32] transition relative group flex items-center justify-center"
                title={`App Setup (Step 2): Festival Lineup (${festival.name})`}
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
              </button>

              <div className="w-8 h-px bg-[#2a253d]/80 my-0.5" />

              {/* Sheet Table View Mini Indicator */}
              <button
                type="button"
                onClick={() => setFilterSettings((prev) => ({ ...prev, activeView: 'ratings' }))}
                className="p-2 rounded-xl text-[#9e98b3] hover:text-white hover:bg-[#231f32] transition flex flex-col items-center justify-center gap-0.5 text-[9px] font-mono font-bold"
                title={`View ${sheetStats.total} imported artists table`}
              >
                <Layers className="w-4 h-4 text-[#a89fc0]" />
                <span className="text-[10px] text-emerald-400">{sheetStats.mustSee}</span>
              </button>

              {/* Clash Mini Indicator */}
              {festivalStats.clashes > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterSettings((prev) => ({ ...prev, activeView: 'clashes' }))}
                  className="p-2 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40 transition flex flex-col items-center justify-center gap-0.5 text-[9px] font-mono font-bold"
                  title={`${festivalStats.clashes} timetable clashes detected`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{festivalStats.clashes}</span>
                </button>
              )}
            </div>

            {/* Bottom Export Mini Button */}
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="p-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white transition flex items-center justify-center shadow-md shadow-emerald-950/40 w-full"
              title="Export schedule to calendar"
            >
              <CalendarCheck2 className="w-4 h-4" />
            </button>
          </aside>
        )}

        {/* Full Left Side: Data Intelligence & Preference Stats Rail (Desktop expanded or mobile toggled) */}
        {(!isSidebarCollapsed || isMobileSidebarOpen) && (
          <aside className={`w-full lg:w-80 bg-[#161420] border border-[#2a253d]/80 rounded-2xl p-4 flex flex-col gap-4 shrink-0 shadow-xl transition-all duration-300 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
            {/* Header with Title, Subtitle and Collapse Button */}
            <div className="pb-2 border-b border-[#262137]/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs uppercase tracking-widest text-white font-bold">
                    Intelligence Hub
                  </span>
                </div>
                <button
                  id="btn-sidebar-collapse"
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden lg:flex p-1.5 rounded-lg text-[#9d97b0] hover:text-white hover:bg-[#231f32] transition items-center justify-center"
                  title="Collapse sidebar to maximize timetable canvas"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-[#8e88a3] mt-1 leading-snug">
                Configure your data sources below to generate your personalized festival schedule.
              </p>
            </div>

            {/* App Setup & Data Sources Section */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-widest text-[#a59eb8] font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>1. App Setup & Sources</span>
                </label>
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Required
                </span>
              </div>

              {/* Source 1: Artist Ratings Sheet */}
              <div className="bg-[#1e1b2b] rounded-xl p-3 border border-[#2d283e]/80 shadow-sm hover:border-[#3e3754] transition space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">Your Ratings Sheet</h4>
                      <p className="text-[10px] text-[#8e88a3]">Personal artist scores & reviews</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25 shrink-0">
                    {ratings.length} acts
                  </span>
                </div>

                <div className="bg-[#12101a] rounded-lg p-2 border border-[#252136] text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7c768e]">Active Tab:</span>
                    <span className="text-emerald-300 font-semibold truncate max-w-[130px]" title={sheetMeta?.activeTabName || 'Main Sheet'}>
                      {sheetMeta?.activeTabName || 'Main Sheet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7c768e]">Must-Sees (85%+):</span>
                    <span className="text-emerald-400 font-mono font-bold">{sheetStats.mustSee}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    id="btn-sidebar-setup-ratings"
                    type="button"
                    onClick={() => setIsSheetModalOpen(true)}
                    className="flex-1 py-1.5 px-2.5 bg-[#262137] hover:bg-[#312a47] text-white hover:text-emerald-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#362f4e]"
                    title="Import or edit your artist ratings sheet"
                  >
                    <Layers className="w-3 h-3 text-emerald-400" />
                    <span>Manage Sheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSettings((prev) => ({ ...prev, activeView: 'ratings' }))}
                    className="py-1.5 px-2 bg-[#171522] hover:bg-[#231f32] text-[#b5b0c4] hover:text-white rounded-lg text-xs font-medium transition border border-[#262137]"
                    title="View full ratings sheet table"
                  >
                    Table
                  </button>
                </div>
              </div>

              {/* Source 2: Festival Lineup & Timetable */}
              <div className="bg-[#1e1b2b] rounded-xl p-3 border border-[#2d283e]/80 shadow-sm hover:border-[#3e3754] transition space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">Festival Timetable</h4>
                      <p className="text-[10px] text-[#8e88a3]">Clashfinder schedule & stages</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/25 shrink-0">
                    {festival.days.length} days
                  </span>
                </div>

                <div className="bg-[#12101a] rounded-lg p-2 border border-[#252136] text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7c768e]">Event:</span>
                    <span className="text-[#e2deec] font-semibold truncate max-w-[140px]" title={festival.name}>
                      {festival.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7c768e]">Total Sets:</span>
                    <span className="text-indigo-300 font-mono font-bold">{festivalStats.totalSets} performances</span>
                  </div>
                </div>

                <button
                  id="btn-sidebar-setup-lineup"
                  type="button"
                  onClick={() => setIsLineupModalOpen(true)}
                  className="w-full py-1.5 px-2.5 bg-[#262137] hover:bg-[#312a47] text-white hover:text-indigo-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#362f4e]"
                  title="Import Clashfinder or switch festival lineup"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Change Lineup</span>
                </button>
              </div>
            </section>

            {/* Preference Stats with Progress Bars */}
            <section className="flex-1 flex flex-col gap-2.5 pt-1 border-t border-[#262137]/80">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-widest text-[#a59eb8] font-bold block">
                  2. Preference Stats
                </label>
                {/* Toggle between Sheet breakdown and Festival Lineup stats */}
                <div className="flex items-center bg-[#15131e] p-0.5 rounded-lg border border-[#2a253d]/80 text-[10px]">
                  <button
                    id="btn-stats-tab-sheet"
                    type="button"
                    onClick={() => setStatsViewMode('sheet')}
                    className={`px-2 py-1 rounded-md transition ${
                      statsViewMode === 'sheet'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'text-[#9d97b0] hover:text-[#e2deec]'
                    }`}
                    title="View breakdown of all artists in your imported ratings sheet"
                  >
                    Sheet ({sheetStats.total})
                  </button>
                  <button
                    id="btn-stats-tab-festival"
                    type="button"
                    onClick={() => setStatsViewMode('festival')}
                    className={`px-2 py-1 rounded-md transition ${
                      statsViewMode === 'festival'
                        ? 'bg-indigo-500 text-white font-bold shadow-sm'
                        : 'text-[#9d97b0] hover:text-[#e2deec]'
                    }`}
                    title="View breakdown of sets on the current festival timetable"
                  >
                    Lineup ({festivalStats.totalSets})
                  </button>
                </div>
              </div>

              {statsViewMode === 'sheet' ? (
                /* 1. Sheet Ratings Breakdown (All Artists in Sheet) */
                <div className="space-y-2">
                  <div className="bg-[#1e1b2b]/90 p-2.5 rounded-xl border border-[#2d283e]/60">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#b5b0c4] font-medium">Must-See Acts (85%+)</span>
                      <span className="font-mono font-bold text-emerald-400">{sheetStats.mustSee}</span>
                    </div>
                    <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((sheetStats.mustSee / Math.max(1, sheetStats.total)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#1e1b2b]/90 p-2.5 rounded-xl border border-[#2d283e]/60">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#b5b0c4] font-medium">Recommended (70-84%)</span>
                      <span className="font-mono font-bold text-indigo-300">{sheetStats.recommended}</span>
                    </div>
                    <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((sheetStats.recommended / Math.max(1, sheetStats.total)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#1e1b2b]/90 p-2.5 rounded-xl border border-[#2d283e]/60">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#b5b0c4] font-medium">Medium (50-69%)</span>
                      <span className="font-mono font-bold text-amber-300">{sheetStats.medium}</span>
                    </div>
                    <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((sheetStats.medium / Math.max(1, sheetStats.total)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {sheetStats.low > 0 && (
                    <div className="bg-[#1e1b2b]/90 p-2.5 rounded-xl border border-[#2d283e]/60">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#b5b0c4] font-medium">Low / Skip (&lt;50%)</span>
                        <span className="font-mono font-bold text-rose-400">{sheetStats.low}</span>
                      </div>
                      <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.round((sheetStats.low / Math.max(1, sheetStats.total)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {sheetStats.unrated > 0 && (
                    <div className="bg-[#1e1b2b]/90 p-2.5 rounded-xl border border-[#2d283e]/60">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#b5b0c4] font-medium">Unrated / Notes Only</span>
                        <span className="font-mono font-bold text-[#8e88a3]">{sheetStats.unrated}</span>
                      </div>
                      <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#38334d] h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.round((sheetStats.unrated / Math.max(1, sheetStats.total)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* 2. Festival Timetable Lineup Breakdown */
                <div className="space-y-2">
                  <div className="bg-[#1e1b2b]/90 p-2.5 rounded-xl border border-[#2d283e]/60">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#b5b0c4] font-medium">Lineup Matches</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {festivalStats.matchedSets} / {festivalStats.totalSets}
                      </span>
                    </div>
                    <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((festivalStats.matchedSets / Math.max(1, festivalStats.totalSets)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#1e1b2b]/90 p-2.5 rounded-xl border border-[#2d283e]/60">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#b5b0c4] font-medium">Must-See on Stage</span>
                      <span className="font-mono font-bold text-emerald-400">{festivalStats.mustSee}</span>
                    </div>
                    <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((festivalStats.mustSee / Math.max(1, festivalStats.totalSets)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#1e1b2b]/90 p-2.5 rounded-xl border border-[#2d283e]/60">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#b5b0c4] font-medium">Recommended on Stage</span>
                      <span className="font-mono font-bold text-indigo-300">{festivalStats.recommended}</span>
                    </div>
                    <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((festivalStats.recommended / Math.max(1, festivalStats.totalSets)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#1e1b2b]/90 p-2.5 rounded-xl border border-[#2d283e]/60">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#b5b0c4] font-medium">Unrated Festival Slots</span>
                      <span className="font-mono font-bold text-[#8e88a3]">{festivalStats.unratedSlots}</span>
                    </div>
                    <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#38334d] h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((festivalStats.unratedSlots / Math.max(1, festivalStats.totalSets)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule Clashes Card */}
              <div
                onClick={() => setFilterSettings((prev) => ({ ...prev, activeView: 'clashes' }))}
                className={`p-2.5 rounded-xl border cursor-pointer transition ${
                  festivalStats.clashes > 0
                    ? 'bg-rose-950/30 border-rose-500/40 hover:bg-rose-900/40'
                    : 'bg-[#1e1b2b]/90 border-[#2d283e]/60'
                }`}
              >
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#b5b0c4] font-medium">Schedule Clashes</span>
                  <span className={`font-mono font-bold ${festivalStats.clashes > 0 ? 'text-rose-400' : 'text-[#8e88a3]'}`}>
                    {festivalStats.clashes}
                  </span>
                </div>
                <div className="w-full bg-[#13111c] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      festivalStats.clashes > 0 ? 'bg-rose-500' : 'bg-[#38334d]'
                    }`}
                    style={{ width: `${Math.min(100, festivalStats.clashes * 20)}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Export CTA Button */}
            <button
              id="btn-sidebar-export"
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="w-full py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5"
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Export to Calendar</span>
            </button>
          </aside>
        )}

        {/* Right Side: Main Timetable Canvas */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* High-Density Toolbar: Tabs, Score Slider, and Search */}
          <section id="planner-toolbar" className="p-3 bg-[#161420] border border-[#2a253d]/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-[#100e18] p-1 rounded-xl border border-[#252136] text-xs">
              <button
                id="view-tab-grid"
                type="button"
                onClick={() => setFilterSettings((prev) => ({ ...prev, activeView: 'grid' }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                  filterSettings.activeView === 'grid'
                    ? 'bg-emerald-500 text-slate-950 shadow font-bold'
                    : 'text-[#9d97b0] hover:text-[#e2deec]'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Timetable Grid</span>
              </button>

              <button
                id="view-tab-list"
                type="button"
                onClick={() => setFilterSettings((prev) => ({ ...prev, activeView: 'list' }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                  filterSettings.activeView === 'list'
                    ? 'bg-emerald-500 text-slate-950 shadow font-bold'
                    : 'text-[#9d97b0] hover:text-[#e2deec]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Timeline List</span>
              </button>

              <button
                id="view-tab-clashes"
                type="button"
                onClick={() => setFilterSettings((prev) => ({ ...prev, activeView: 'clashes' }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                  filterSettings.activeView === 'clashes'
                    ? 'bg-rose-600 text-white shadow font-bold'
                    : 'text-[#9d97b0] hover:text-[#e2deec]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Clash Inspector</span>
                {stats.clashes > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 rounded text-[10px] font-mono border border-rose-800/60">
                    {stats.clashes}
                  </span>
                )}
              </button>

              <button
                id="view-tab-ratings"
                type="button"
                onClick={() => setFilterSettings((prev) => ({ ...prev, activeView: 'ratings' }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                  filterSettings.activeView === 'ratings'
                    ? 'bg-emerald-600 text-white shadow font-bold'
                    : 'text-[#9d97b0] hover:text-[#e2deec]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Ratings Sheet ({ratings.length})</span>
              </button>
            </div>

            {/* Right Toolbar Controls: Score Slider & Search */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Toggle Unrated Bands */}
              <button
                id="btn-toggle-show-unrated"
                type="button"
                onClick={() =>
                  setFilterSettings((prev) => ({
                    ...prev,
                    showUnrated: !prev.showUnrated,
                  }))
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition ${
                  filterSettings.showUnrated
                    ? 'bg-[#1e1b2b] border-[#312c44] text-[#e2deec] hover:bg-[#252236]'
                    : 'bg-[#14121d] border-[#221f30] text-[#7c768e] line-through opacity-70'
                }`}
                title="Toggle unrated acts on the timetable"
              >
                <Sparkles className={`w-3.5 h-3.5 ${filterSettings.showUnrated ? 'text-amber-400' : 'text-[#7c768e]'}`} />
                <span>Unrated Acts</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#100e18] text-[#8e88a3] border border-[#272338]">
                  {festivalStats.unratedSlots}
                </span>
              </button>

              {/* Rating Filter Slider */}
              <div className="flex items-center gap-2 bg-[#100e18] px-3 py-1.5 rounded-xl border border-[#252136] text-xs">
                <span className="text-[#9d97b0] font-medium text-[11px] uppercase tracking-wider">Min Score:</span>
                <input
                  id="slider-min-score"
                  type="range"
                  min="0"
                  max="85"
                  step="5"
                  value={filterSettings.minScorePercent}
                  onChange={(e) =>
                    setFilterSettings((prev) => ({
                      ...prev,
                      minScorePercent: Number(e.target.value),
                    }))
                  }
                  className="w-20 sm:w-24 accent-emerald-500 cursor-pointer"
                />
                <span className="font-mono font-bold text-emerald-400 min-w-[36px] text-xs">
                  ≥{filterSettings.minScorePercent}%
                </span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#7c768e] absolute left-2.5 top-2.5" />
                <input
                  id="input-global-search"
                  type="text"
                  value={filterSettings.searchQuery}
                  onChange={(e) =>
                    setFilterSettings((prev) => ({
                      ...prev,
                      searchQuery: e.target.value,
                    }))
                  }
                  placeholder="Search act, stage, note..."
                  className="bg-[#100e18] border border-[#252136] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#f1edf8] placeholder-[#6f6980] focus:outline-none focus:border-emerald-500/70 w-36 sm:w-48 transition"
                />
              </div>
            </div>
          </section>

          {/* View Switcher Output */}
          <section id="active-view-container" className="flex-1 min-h-[540px]">
            {filterSettings.activeView === 'grid' && (
              <TimetableGrid
                festival={festival}
                matchedItems={matchedScheduleItems}
                filterSettings={filterSettings}
                setFilterSettings={setFilterSettings}
                currentTimeString={activeTimeString}
                currentDayId={timeSim.enabled ? timeSim.simulatedDayId : 'friday'}
                onSelectArtist={(item) => setSelectedArtistItem(item)}
                onToggleStatus={handleToggleStatus}
                onQuickRate={(artistName, score, review, genre) => {
                  setQuickRateState({
                    isOpen: true,
                    artistName,
                    score,
                    review,
                    genre,
                  });
                }}
              />
            )}

            {filterSettings.activeView === 'list' && (
              <TimelineListView
                festival={festival}
                items={matchedScheduleItems.filter((m) => {
                  if (m.status === 'skipped') return false;
                  if (m.isRated) {
                    return m.normalizedScore >= filterSettings.minScorePercent || m.status === 'attending';
                  }
                  return filterSettings.showUnrated !== false || m.status === 'attending';
                })}
                currentTimeString={activeTimeString}
                dimPastSets={filterSettings.dimPastSets}
                minScoreCutoff={filterSettings.minScorePercent}
                onCutoffChange={(val) => setFilterSettings((prev) => ({ ...prev, minScorePercent: val }))}
                onSelectArtist={(item) => setSelectedArtistItem(item)}
                onToggleStatus={handleToggleStatus}
                onQuickRate={(artistName, score, review, genre) => {
                  setQuickRateState({
                    isOpen: true,
                    artistName,
                    score,
                    review,
                    genre,
                  });
                }}
              />
            )}

            {filterSettings.activeView === 'clashes' && (
              <ClashInspectorView
                items={matchedScheduleItems.filter((m) => {
                  if (m.isRated) {
                    return m.normalizedScore >= filterSettings.minScorePercent || m.status === 'attending';
                  }
                  return filterSettings.showUnrated !== false || m.status === 'attending';
                })}
                onToggleStatus={handleToggleStatus}
                onSelectArtist={(item) => setSelectedArtistItem(item)}
                onQuickRate={(artistName, score, review, genre) => {
                  setQuickRateState({
                    isOpen: true,
                    artistName,
                    score,
                    review,
                    genre,
                  });
                }}
              />
            )}

            {filterSettings.activeView === 'ratings' && (
              <RatingsSheetView
                ratings={ratings}
                matchedItems={matchedScheduleItems}
                festival={festival}
                onOpenSheetModal={() => setIsSheetModalOpen(true)}
              />
            )}
          </section>
        </div>
      </main>

      {/* High-Density Global Status Footer Bar */}
      <footer className="h-8 bg-[#14121d] border-t border-[#262137] flex items-center px-4 sm:px-6 justify-between shrink-0 text-[#8e88a3]">
        <div className="flex items-center gap-3 sm:gap-6 text-[10px] text-[#8e88a3] uppercase font-medium tracking-wide">
          <span>{festival.stages.length} Stages Synced</span>
          <span className="hidden sm:inline text-[#4a4361]">•</span>
          <span>{stats.totalLiked} High Rated Matches</span>
          <span className="hidden sm:inline text-[#4a4361]">•</span>
          <span className="hidden md:inline font-mono text-[#7c768e]">Normalized Linear % Map</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-footer-storage"
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 text-[10px] text-[#9d97b0] hover:text-emerald-300 uppercase font-bold tracking-widest transition"
            title="Open Storage Diagnostics & Settings"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Local Storage Synced</span>
          </button>
        </div>
      </footer>

      {/* Modals */}
      {isSheetModalOpen && (
        <SheetManagerModal
          isOpen={isSheetModalOpen}
          onClose={() => setIsSheetModalOpen(false)}
          ratings={ratings}
          sheetMeta={sheetMeta}
          onUpdateRatings={handleUpdateRatings}
          currentRawCsv={rawCsv}
        />
      )}

      {isLineupModalOpen && (
        <LineupManagerModal
          isOpen={isLineupModalOpen}
          onClose={() => setIsLineupModalOpen(false)}
          currentFestival={festival}
          onUpdateFestival={handleUpdateFestival}
        />
      )}

      {activeSelectedArtistItem && (
        <ArtistDetailModal
          item={activeSelectedArtistItem}
          festival={festival}
          onClose={() => setSelectedArtistItem(null)}
          onRateArtist={(name, score, review, genre) => {
            handleRateArtist(name, score, review, genre);
          }}
          onToggleStatus={(setId, status) => {
            handleToggleStatus(setId, status);
            if (selectedArtistItem) {
              setSelectedArtistItem({
                ...selectedArtistItem,
                status,
              });
            }
          }}
        />
      )}

      {quickRateState.isOpen && (
        <QuickRateModal
          isOpen={quickRateState.isOpen}
          artistName={quickRateState.artistName}
          currentScorePercent={quickRateState.score}
          currentReview={quickRateState.review}
          currentGenre={quickRateState.genre}
          onClose={() => setQuickRateState((prev) => ({ ...prev, isOpen: false }))}
          onSaveRating={(name, newScore, review, genre) => {
            handleRateArtist(name, newScore, review, genre);
          }}
        />
      )}

      {isExportModalOpen && (
        <CalendarExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          items={matchedScheduleItems}
          festival={festival}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onResetComplete={handleResetAllData}
          onRestoreBackup={handleRestoreBackup}
        />
      )}
    </div>
  );
};

export default App;
