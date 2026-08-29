import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  Crosshair,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Star,
  Edit3,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { FestivalData, MatchedScheduleItem, FilterSettings, AttendanceStatus } from '../types';
import { timeToMinutes, formatTime24h } from '../utils/timetableParser';
import { getRatingColorMeta, RATING_SCALE_TIERS } from '../utils/ratingColors';

interface TimetableGridProps {
  festival: FestivalData;
  matchedItems: MatchedScheduleItem[];
  filterSettings: FilterSettings;
  setFilterSettings: React.Dispatch<React.SetStateAction<FilterSettings>>;
  currentTimeString: string; // HH:MM
  currentDayId: string;
  onSelectArtist: (item: MatchedScheduleItem) => void;
  onToggleStatus: (setId: string, newStatus: AttendanceStatus) => void;
  onQuickRate?: (artistName: string, currentScore: number, currentReview?: string, currentGenre?: string) => void;
  onOpenLineupModal?: () => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  festival,
  matchedItems,
  filterSettings,
  setFilterSettings,
  currentTimeString,
  currentDayId,
  onSelectArtist,
  onToggleStatus,
  onQuickRate,
  onOpenLineupModal,
}) => {
  const [selectedDayId, setSelectedDayId] = useState<string>(
    festival.days[0]?.id || 'friday'
  );
  const [mobileActiveStage, setMobileActiveStage] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentTimeLineRef = useRef<HTMLDivElement>(null);

  const handleZoomChange = (delta: number) => {
    setZoomLevel((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.min(2.2, Math.max(0.6, next));
    });
  };

  // Sync selected day if festival changes
  useEffect(() => {
    if (festival.days.length > 0 && !festival.days.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(festival.days[0].id);
    }
  }, [festival.days, selectedDayId]);

  // Touch pinch-to-zoom for mobile timetable view
  const pinchStateRef = useRef<{
    initialDist: number;
    initialZoom: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = getDistance(e.touches[0], e.touches[1]);
        pinchStateRef.current = {
          initialDist: dist,
          initialZoom: zoomLevel,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStateRef.current) {
        if (e.cancelable) e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        if (pinchStateRef.current.initialDist > 10) {
          const factor = dist / pinchStateRef.current.initialDist;
          const target = Math.min(2.2, Math.max(0.6, pinchStateRef.current.initialZoom * factor));
          setZoomLevel(Math.round(target * 100) / 100);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStateRef.current = null;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [zoomLevel]);

  // Stages present on this day
  const activeStages = useMemo(() => {
    const stageSet = new Set<string>();
    matchedItems
      .filter((m) => m.set.dayId === selectedDayId)
      .forEach((m) => stageSet.add(m.set.stage));

    if (stageSet.size === 0) {
      return festival.stages.slice(0, 5);
    }
    return Array.from(stageSet);
  }, [matchedItems, selectedDayId, festival.stages]);

  // Visible stages (can be filtered on mobile for single stage focus)
  const displayedStages = useMemo(() => {
    if (mobileActiveStage !== 'all' && activeStages.includes(mobileActiveStage)) {
      return [mobileActiveStage];
    }
    return activeStages;
  }, [activeStages, mobileActiveStage]);

  // Filter items for the selected day
  const dayItems = useMemo(() => {
    return matchedItems.filter((item) => {
      if (item.set.dayId !== selectedDayId) return false;

      // Filter by rating score & unrated visibility
      if (item.isRated) {
        if (
          filterSettings.minScorePercent > 0 &&
          item.normalizedScore < filterSettings.minScorePercent &&
          item.status !== 'attending'
        ) {
          return false;
        }
      } else {
        // Band has not been rated & reviewed (or is unrated)
        // If showUnrated is false, filter it out unless marked attending
        if (filterSettings.showUnrated === false && item.status !== 'attending') {
          return false;
        }
      }

      // Filter by search
      if (filterSettings.searchQuery.trim()) {
        const q = filterSettings.searchQuery.toLowerCase();
        const artistMatch = item.set.artist.toLowerCase().includes(q);
        const stageMatch = item.set.stage.toLowerCase().includes(q);
        const reviewMatch = (item.rating?.reviewSummary || '').toLowerCase().includes(q);
        if (!artistMatch && !stageMatch && !reviewMatch) return false;
      }

      // Filter by elapsed
      if (!filterSettings.showElapsed && item.isElapsed) {
        return false;
      }

      // Filter by attending
      if (filterSettings.onlyAttendingOrMaybe && item.status === 'skipped') {
        return false;
      }

      return true;
    });
  }, [matchedItems, selectedDayId, filterSettings]);

  // Calculate day timeline bounds (e.g. 12:00 to 01:30)
  const { startHour, endHour, totalHours, hourSlots } = useMemo(() => {
    let minHour = 12;
    let maxHour = 24;

    const daySets = matchedItems.filter((m) => m.set.dayId === selectedDayId);
    if (daySets.length > 0) {
      daySets.forEach((m) => {
        const [sh] = m.set.startTime.split(':').map(Number);
        const [eh] = m.set.endTime.split(':').map(Number);
        if (!isNaN(sh)) {
          if (sh >= 6 && sh < minHour) minHour = sh;
        }
        if (!isNaN(eh)) {
          let effEh = eh;
          if (eh < 6) effEh = eh + 24; // past midnight
          if (effEh > maxHour) maxHour = Math.min(effEh + 1, 30);
        }
      });
    }

    minHour = Math.max(8, minHour - 1);
    maxHour = Math.max(minHour + 6, maxHour + 1);

    const slots: { hour: number; label: string }[] = [];
    for (let h = minHour; h <= maxHour; h++) {
      const displayH = h >= 24 ? h - 24 : h;
      slots.push({
        hour: h,
        label: `${displayH.toString().padStart(2, '0')}:00`,
      });
    }

    return {
      startHour: minHour,
      endHour: maxHour,
      totalHours: maxHour - minHour,
      hourSlots: slots,
    };
  }, [matchedItems, selectedDayId]);

  // Pixels per minute scaling based on density and pinch-zoom
  const basePixelsPerMinute =
    filterSettings.timeDensity === 'compact' ? 1.65 : filterSettings.timeDensity === 'spacious' ? 2.8 : 2.2;
  const pixelsPerMinute = basePixelsPerMinute * zoomLevel;
  const hourHeight = 60 * pixelsPerMinute;
  const totalTimelineHeight = totalHours * hourHeight;
  const stageColMinWidth = Math.round(Math.max(120, 160 * Math.sqrt(zoomLevel)));
  const timeColWidth = Math.max(50, Math.round(64 * Math.min(1.25, Math.sqrt(zoomLevel))));

  // Jump to Current Time function
  const handleJumpToCurrentTime = () => {
    if (currentTimeLineRef.current && containerRef.current) {
      currentTimeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (containerRef.current) {
      const firstUpcoming = dayItems.find((item) => !item.isElapsed);
      if (firstUpcoming) {
        const startMin = timeToMinutes(firstUpcoming.set.startTime, 6);
        const topOffset = ((startMin - startHour * 60) * pixelsPerMinute) - 100;
        containerRef.current.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      }
    }
  };

  // Calculate current time line offset
  const currentMinutesFromStart = useMemo(() => {
    const curMin = timeToMinutes(currentTimeString, 6);
    const timelineStartMin = startHour * 60;
    const timelineEndMin = endHour * 60;
    if (curMin >= timelineStartMin && curMin <= timelineEndMin) {
      return (curMin - timelineStartMin) * pixelsPerMinute;
    }
    return null;
  }, [currentTimeString, startHour, endHour, pixelsPerMinute]);

  const stageColors = [
    'border-b-2 border-emerald-400',
    'border-b-2 border-indigo-400',
    'border-b-2 border-purple-400',
    'border-b-2 border-amber-400',
    'border-b-2 border-rose-400',
    'border-b-2 border-teal-400',
    'border-b-2 border-violet-400',
  ];

  return (
    <div id="timetable-grid-container" className="flex flex-col h-full bg-[#161420] rounded-2xl border border-[#2a253d]/80 shadow-xl overflow-hidden min-w-0 box-border">
      {/* Top Bar: Day Selector & Clean Controls */}
      <div className="p-2 sm:p-2.5 border-b border-[#262137] bg-[#12101a] flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0 box-border overflow-hidden">
        {/* Day Tabs */}
        <div className="flex items-center gap-1 bg-[#181523] p-1 rounded-xl border border-[#29253b] text-xs overflow-x-auto no-scrollbar w-full sm:w-auto min-w-0 max-w-full box-border shrink-0">
          {festival.days.map((day) => {
            const countForDay = matchedItems.filter((m) => {
              if (m.set.dayId !== day.id) return false;
              if (m.isRated) {
                return m.normalizedScore >= filterSettings.minScorePercent || m.status === 'attending';
              }
              return filterSettings.showUnrated !== false || m.status === 'attending';
            }).length;

            return (
              <button
                key={day.id}
                id={`day-tab-${day.id}`}
                type="button"
                onClick={() => setSelectedDayId(day.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold text-xs transition shrink-0 whitespace-nowrap min-h-[32px] ${
                  selectedDayId === day.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-[#9d97b0] hover:text-[#e2deec] hover:bg-[#231f32]'
                }`}
              >
                <span>{day.name}</span>
                {countForDay > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      selectedDayId === day.id
                        ? 'bg-slate-950 text-emerald-300 font-bold'
                        : 'bg-[#282438] text-[#8e88a3]'
                    }`}
                  >
                    {countForDay}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View Actions: Jump, Dim Past Sets, and Zoom */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 min-w-0">
          {/* Jump to Current Time Button */}
          <button
            id="btn-jump-to-now"
            type="button"
            onClick={handleJumpToCurrentTime}
            className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg font-semibold text-xs transition shadow-sm h-8 whitespace-nowrap"
            title="Jump to current set / now playing"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Now</span>
          </button>

          {/* Toggle Elapsed Sets */}
          <button
            id="btn-toggle-elapsed-dim"
            type="button"
            onClick={() =>
              setFilterSettings((prev) => ({
                ...prev,
                dimPastSets: !prev.dimPastSets,
              }))
            }
            className={`flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm h-8 whitespace-nowrap ${
              filterSettings.dimPastSets
                ? 'bg-[#221e33] border-[#433c5e] text-indigo-200 hover:border-[#5a507c]'
                : 'bg-[#151320] border-[#29253b] text-[#8e88a3] hover:text-[#e2deec]'
            }`}
            title={filterSettings.dimPastSets ? 'Currently dimming past sets' : 'Dim past sets'}
          >
            {filterSettings.dimPastSets ? (
              <EyeOff className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-[#8e88a3] shrink-0" />
            )}
            <span>{filterSettings.dimPastSets ? 'Past Dimmed' : 'Hide Past'}</span>
          </button>

          {/* Zoom Controls (Touch / Click Pinch-zoom) */}
          <div
            id="timetable-zoom-controls"
            className="flex items-center bg-[#151320] rounded-lg border border-[#29253b] p-0.5 text-xs text-[#8e88a3] h-8 shrink-0 shadow-inner"
            title="Pinch to zoom on mobile or tap +/-"
          >
            <button
              id="btn-zoom-out"
              type="button"
              onClick={() => handleZoomChange(-0.15)}
              disabled={zoomLevel <= 0.6}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#252136] hover:text-white disabled:opacity-30 transition font-bold"
              title="Zoom Out"
            >
              −
            </button>
            <button
              id="btn-zoom-reset"
              type="button"
              onClick={() => setZoomLevel(1.0)}
              className="px-1.5 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 font-bold"
              title="Reset Zoom (100%)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              id="btn-zoom-in"
              type="button"
              onClick={() => handleZoomChange(0.15)}
              disabled={zoomLevel >= 2.2}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#252136] hover:text-white disabled:opacity-30 transition font-bold"
              title="Zoom In"
            >
              +
            </button>
          </div>

          {/* Density Selector on desktop */}
          <div className="hidden lg:flex items-center bg-[#100e18] rounded-lg p-0.5 border border-[#252136] text-xs text-[#8e88a3] h-8">
            {(['compact', 'standard', 'spacious'] as const).map((density) => (
              <button
                key={density}
                type="button"
                onClick={() => setFilterSettings((prev) => ({ ...prev, timeDensity: density }))}
                className={`px-2 py-1 rounded-md capitalize text-[10px] font-medium transition ${
                  filterSettings.timeDensity === density ? 'bg-[#29253b] text-white font-bold' : 'hover:text-[#e2deec]'
                }`}
              >
                {density}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Stage Filter Strip (Allows fast single-stage focusing on small mobile screens) */}
      <div className="md:hidden px-2.5 py-1.5 bg-[#100e18] border-b border-[#262137] flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-[10px] uppercase font-bold text-[#7c768e] shrink-0">Stage:</span>
        <button
          type="button"
          onClick={() => setMobileActiveStage('all')}
          className={`px-2 py-1 rounded-lg shrink-0 font-medium transition min-h-[28px] ${
            mobileActiveStage === 'all'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-[#1e1b2b] text-[#8e88a3]'
          }`}
        >
          All Stages ({activeStages.length})
        </button>
        {activeStages.map((stg) => (
          <button
            key={stg}
            type="button"
            onClick={() => setMobileActiveStage(stg)}
            className={`px-2 py-1 rounded-lg shrink-0 font-medium transition min-h-[28px] ${
              mobileActiveStage === stg
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-[#1e1b2b] text-[#8e88a3]'
            }`}
          >
            {stg}
          </button>
        ))}
      </div>

      {/* Rating Color Scale Legend Bar */}
      <div className="px-2.5 sm:px-3 py-1 bg-[#0f0d16] border-b border-[#252136] flex items-center justify-between text-[10px] overflow-x-auto no-scrollbar">
        <span className="font-bold text-[#7c768e] uppercase tracking-widest text-[9px] mr-2 shrink-0">
          Rating Scale:
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          {RATING_SCALE_TIERS.map((tier) => (
            <div key={tier.minScore} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: tier.solidHex }} />
              <span className="font-mono text-[#b5b0c4] font-medium">{tier.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timetable Grid Body */}
      <div
        ref={containerRef}
        id="timetable-grid-scroll-area"
        className="flex-1 overflow-x-auto overflow-y-auto relative scroll-smooth bg-[#0d0c13] select-none touch-pan-x touch-pan-y"
      >
        <div
          className="flex flex-col relative"
          style={{
            minWidth: `${timeColWidth + displayedStages.length * stageColMinWidth}px`,
            height: `${totalTimelineHeight + 50}px`,
          }}
        >
          {/* Stage Headers (Sticky Top) */}
          <div className="sticky top-0 z-20 flex bg-[#161420]/95 backdrop-blur border-b border-[#262137] text-[#e2deec] text-xs font-semibold uppercase tracking-wider shadow-sm">
            {/* Time Column Header */}
            <div
              style={{ width: `${timeColWidth}px` }}
              className="shrink-0 py-2.5 px-2 text-center text-[10px] uppercase tracking-widest text-[#7c768e] font-bold border-r border-[#262137]"
            >
              Time
            </div>
            {/* Stage Columns */}
            <div
              className="flex-1 grid"
              style={{ gridTemplateColumns: `repeat(${displayedStages.length}, minmax(${stageColMinWidth}px, 1fr))` }}
            >
              {displayedStages.map((stage, sIdx) => (
                <div
                  key={stage}
                  className={`py-2 px-3 truncate text-center border-r border-[#262137]/80 font-bold text-xs text-[#f1edf8] uppercase tracking-wider ${stageColors[sIdx % stageColors.length]}`}
                >
                  {stage}
                </div>
              ))}
            </div>
          </div>

          {/* Grid Canvas */}
          <div className="flex-1 flex relative">
            {/* Left Time Axis */}
            <div
              style={{ width: `${timeColWidth}px` }}
              className="shrink-0 relative border-r border-[#262137] select-none bg-[#12101a]/80"
            >
              {hourSlots.map((slot, index) => (
                <div
                  key={slot.hour}
                  className="absolute left-0 right-0 border-t border-[#262137]/80 text-[11px] font-mono text-[#7c768e] pl-2 pt-0.5 font-semibold"
                  style={{ top: `${index * hourHeight}px` }}
                >
                  {slot.label}
                </div>
              ))}
            </div>

            {/* Stage Columns Canvas */}
            <div
              className="flex-1 grid relative"
              style={{ gridTemplateColumns: `repeat(${displayedStages.length}, minmax(${stageColMinWidth}px, 1fr))` }}
            >
              {/* Horizontal Hour Grid Lines */}
              {hourSlots.map((slot, index) => (
                <div
                  key={`line-${slot.hour}`}
                  className="absolute left-0 right-0 border-t border-[#262137]/50 pointer-events-none"
                  style={{ top: `${index * hourHeight}px` }}
                />
              ))}

              {/* Vertical Stage Dividers */}
              {displayedStages.map((stage) => (
                <div
                  key={`col-border-${stage}`}
                  className="border-r border-[#262137]/40 h-full relative"
                />
              ))}

              {/* Current Time Indicator Line (Cross-stage bar) */}
              {currentMinutesFromStart !== null && (
                <div
                  ref={currentTimeLineRef}
                  id="current-time-marker-line"
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: `${currentMinutesFromStart}px` }}
                >
                  <div className="h-0.5 w-full bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  <div className="absolute left-2 -top-2.5 px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-mono font-black text-[10px] shadow uppercase">
                    NOW: {currentTimeString}
                  </div>
                </div>
              )}

              {/* Placed Festival Sets */}
              {dayItems.map((item) => {
                const stageIndex = displayedStages.indexOf(item.set.stage);
                if (stageIndex === -1) return null;

                const startMin = timeToMinutes(item.set.startTime, 6);
                const endMin = timeToMinutes(item.set.endTime, 6);
                const timelineStartMin = startHour * 60;

                const top = (startMin - timelineStartMin) * pixelsPerMinute;
                const height = Math.max(44, (endMin - startMin) * pixelsPerMinute);

                // Multi-Tier Color Coded Meta from ratingColors (handles isRated properly)
                const colorMeta = getRatingColorMeta(item.normalizedScore, item.isRated);

                // If elapsed and dimming is on
                const isDimmed = filterSettings.dimPastSets && item.isElapsed;

                // Card density tiers based on calculated height
                const isShortCard = height < 58;
                const isMediumCard = height >= 58 && height < 84;

                return (
                  <div
                    key={item.id}
                    id={`set-card-${item.id}`}
                    onClick={() => onSelectArtist(item)}
                    className={`absolute rounded-xl flex flex-col justify-between border cursor-pointer transition-all hover:scale-[1.01] hover:z-30 backdrop-blur-[2px] ${
                      isShortCard ? 'px-2 py-1' : isMediumCard ? 'px-2 py-1.5' : 'p-2'
                    } ${colorMeta.bgClass} ${colorMeta.borderClass} ${colorMeta.borderLeftClass} ${colorMeta.glowClass} ${
                      isDimmed ? 'opacity-35 grayscale-[50%]' : ''
                    } ${item.isCurrentlyPlaying ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : ''}`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `calc(${(stageIndex / displayedStages.length) * 100}% + 3px)`,
                      width: `calc(${100 / displayedStages.length}% - 6px)`,
                    }}
                    title={`${item.set.artist} (${item.set.startTime} - ${item.set.endTime}) | ${
                      item.isRated ? `Rating: ${item.normalizedScore}% (${colorMeta.tierName})` : 'Unrated Band'
                    }${item.rating?.reviewSummary ? `\nNote: "${item.rating.reviewSummary}"` : ''}`}
                  >
                    {/* Top Row: Time & Badges */}
                    <div className="flex items-center justify-between gap-1 overflow-hidden leading-none">
                      <span className="font-mono text-[9px] sm:text-[10px] text-[#cfc9de] font-semibold shrink-0">
                        {item.set.startTime} - {item.set.endTime}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.hasClash && (
                          <span
                            className="px-1 py-0.2 rounded text-[8px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 flex items-center gap-0.5"
                            title="Clashes with another liked act!"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span className="hidden sm:inline">CLASH</span>
                          </span>
                        )}
                        {item.isRated ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onQuickRate) {
                                onQuickRate(item.set.artist, item.normalizedScore, item.rating?.reviewSummary, item.rating?.genre);
                              } else {
                                onSelectArtist(item);
                              }
                            }}
                            className={`px-1.5 py-0.2 rounded-lg text-[9px] font-mono font-bold transition hover:scale-105 ${colorMeta.badgeClass}`}
                            title="Click to re-rate this act"
                          >
                            {item.normalizedScore}%
                          </button>
                        ) : item.isReviewed ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onQuickRate) {
                                onQuickRate(item.set.artist, 75, item.rating?.reviewSummary, item.rating?.genre);
                              } else {
                                onSelectArtist(item);
                              }
                            }}
                            className="px-1.5 py-0.2 rounded-lg text-[8px] font-medium bg-[#221e33] text-cyan-300 hover:bg-[#2c2742] border border-cyan-500/35 flex items-center gap-0.5 transition"
                            title="Act has review notes but no numeric score. Click to rate."
                          >
                            <Sparkles className="w-2 h-2 text-cyan-400" />
                            <span>Notes</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onQuickRate) {
                                onQuickRate(item.set.artist, 70, '', '');
                              } else {
                                onSelectArtist(item);
                              }
                            }}
                            className="px-1.5 py-0.2 rounded-lg text-[8px] font-medium bg-[#221e33] text-[#b5b0c4] hover:text-white hover:bg-[#2c2742] border border-[#3c3754] transition"
                            title="Unrated band. Click to rate."
                          >
                            + Rate
                          </button>
                        )}

                        {/* Inline mini attendance trigger for short and medium cards */}
                        {(isShortCard || isMediumCard) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus: AttendanceStatus =
                                item.status === 'attending' ? 'maybe' : item.status === 'maybe' ? 'skipped' : 'attending';
                              onToggleStatus(item.id, nextStatus);
                            }}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold transition shrink-0 ${
                              item.status === 'attending'
                                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                                : item.status === 'maybe'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-[#221e33] text-[#7c768e] hover:text-[#b5b0c4]'
                            }`}
                            title={`Status: ${item.status}. Click to cycle status.`}
                          >
                            {item.status === 'attending' ? '✓' : item.status === 'maybe' ? '?' : '✕'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Artist Name & Notes */}
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1">
                        <h4 className="font-bold text-xs sm:text-[13px] text-white truncate leading-tight">
                          {item.set.artist}
                        </h4>
                        {item.rating?.reviewSummary && (isShortCard || isMediumCard) && (
                          <span title={`Note: "${item.rating.reviewSummary}"`} className="text-cyan-400 shrink-0">
                            <MessageSquare className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      {item.rating?.reviewSummary && !isShortCard && !isMediumCard && (
                        <p
                          className="text-[10px] text-[#b5b0c4] line-clamp-1 italic mt-0.5"
                          title={`Note: "${item.rating.reviewSummary}"`}
                        >
                          "{item.rating.reviewSummary}"
                        </p>
                      )}
                    </div>

                    {/* Card Bottom: Only rendered on tall cards */}
                    {!isShortCard && !isMediumCard && (
                      <div className="flex items-center justify-between text-[10px] text-[#8e88a3] pt-1 border-t border-[#2d283e]/60">
                        <span className="truncate text-[10px] opacity-80">{item.set.stage}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus: AttendanceStatus =
                                item.status === 'attending' ? 'maybe' : item.status === 'maybe' ? 'skipped' : 'attending';
                              onToggleStatus(item.id, nextStatus);
                            }}
                            className={`px-2 py-0.5 rounded-lg font-bold transition ${
                              item.status === 'attending'
                                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                : item.status === 'maybe'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-[#221e33] text-[#7c768e] hover:text-[#b5b0c4]'
                            }`}
                          >
                            {item.status === 'attending' ? '✓ Going' : item.status === 'maybe' ? '? Maybe' : '✕ Skip'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Empty Lineup Call to Action */}
        {festival.sets.length === 0 && (
          <div
            id="empty-timetable-overlay"
            className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-[#0d0c13]/85 backdrop-blur-xs"
          >
            <div className="max-w-md w-full bg-[#161420] border border-[#2a253d] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">No Timetable Sets Loaded</h3>
                <p className="text-xs text-[#9d97b0] leading-relaxed">
                  Import your festival schedule by pasting spreadsheet timetable rows (Stage, Act, Start, End, Day) or uploading a CSV file.
                </p>
              </div>
              {onOpenLineupModal && (
                <button
                  id="btn-empty-grid-open-lineup"
                  type="button"
                  onClick={onOpenLineupModal}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Import Festival Timetable</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

