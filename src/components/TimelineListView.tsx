import React from 'react';
import { MatchedScheduleItem, FestivalData, AttendanceStatus } from '../types';
import { downloadIcsFile, exportScheduleCsv } from '../utils/calendarExport';
import { getRatingColorMeta } from '../utils/ratingColors';
import { timeToMinutes, formatTime24h } from '../utils/timetableParser';

interface TimelineListViewProps {
  festival: FestivalData;
  items: MatchedScheduleItem[];
  currentTimeString?: string;
  dimPastSets?: boolean;
  minScoreCutoff?: number;
  onCutoffChange?: (newCutoff: number) => void;
  onSelectArtist: (item: MatchedScheduleItem) => void;
  onToggleStatus?: (setId: string, newStatus: AttendanceStatus) => void;
  onQuickRate?: (artistName: string, currentScore: number, currentReview?: string, currentGenre?: string) => void;
}

/**
 * Converts 24h or date-time string to 12-hour AM/PM format (e.g. 19:30 -> 7:30 PM, 02:30 -> 2:30 AM)
 */
function format12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const time24 = formatTime24h(timeStr);
  const parts = time24.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].padStart(2, '0');
  const period = h >= 12 && h < 24 ? 'PM' : 'AM';
  if (h === 0 || h === 24) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

function formatTimeRange(start: string, end: string): string {
  return `${format12Hour(start)}–${format12Hour(end)}`;
}

/**
 * Get dot color and text label using the app's unified rating scale color scheme
 */
function getScoreDisplay(item: MatchedScheduleItem): { dot: string; textClass: string; label: string } {
  if (!item.isRated) {
    if (item.isReviewed) {
      return { dot: '#06b6d4', textClass: 'text-cyan-300', label: 'Notes' };
    }
    return { dot: '#8e88a3', textClass: 'text-[#8e88a3]', label: 'Unrated' };
  }

  const meta = getRatingColorMeta(item.normalizedScore, true);
  return {
    dot: meta.solidHex,
    textClass: meta.textClass,
    label: `${item.normalizedScore}%`,
  };
}

export const TimelineListView: React.FC<TimelineListViewProps> = ({
  festival,
  items,
  onSelectArtist,
}) => {
  // Calculate clashes count among picks
  const clashCount = items.filter((item) => item.hasClash).length;

  // Group items by Day
  const groupedByDay = festival.days.map((day) => {
    const daySets = items
      .filter((item) => item.set.dayId === day.id)
      .sort((a, b) => timeToMinutes(a.set.startTime, 6) - timeToMinutes(b.set.startTime, 6));

    return {
      day,
      sets: daySets,
    };
  });

  return (
    <div id="timeline-list-view" className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Clash Alert Notification Banner */}
      {clashCount > 0 && (
        <div
          id="clash-alert-banner"
          className="bg-[#241217] border border-[#521b27] rounded-2xl p-4 px-5 flex flex-wrap items-center gap-2 shadow-lg"
        >
          <span className="font-bold text-[#f43f5e] text-sm tracking-tight">
            {clashCount} {clashCount === 1 ? 'clash' : 'clashes'}
          </span>
          <span className="text-[#b5a8bc] text-sm">
            in your picks — overlapping sets are marked in red below.
          </span>
        </div>
      )}

      {/* 2. Days Lineup Tables */}
      <div className="space-y-8">
        {groupedByDay.map(({ day, sets }) => {
          if (sets.length === 0) return null;

          return (
            <section key={day.id} id={`day-section-${day.id}`} className="space-y-3">
              {/* Day Header in Bold Yellow Display Typography */}
              <div className="flex items-center justify-between pb-1 border-b border-[#252136]">
                <h2 className="text-[#facc15] font-black text-lg sm:text-2xl tracking-wider uppercase font-mono">
                  {day.name}
                </h2>
                <span className="text-xs font-mono text-[#8e88a3] font-semibold">
                  {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                </span>
              </div>

              {/* Mobile Card Layout (xs to md) */}
              <div className="md:hidden space-y-2">
                {sets.map((item) => {
                  const scoreInfo = getScoreDisplay(item);
                  const isClash = item.hasClash;

                  return (
                    <div
                      key={item.id}
                      id={`timeline-card-mobile-${item.id}`}
                      onClick={() => onSelectArtist(item)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        isClash
                          ? 'bg-[#26131a]/85 border-[#ef4444]/40 hover:bg-[#301621]'
                          : 'bg-[#161420] border-[#2a253d]/80 hover:border-[#3e3754]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-white tracking-tight truncate">
                              {item.set.artist}
                            </span>
                            {isClash && (
                              <span className="px-1.5 py-0.5 rounded border border-[#ef4444]/80 text-[#f87171] font-mono text-[9px] font-bold lowercase bg-[#450a0a]/50">
                                clash
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#8e88a3] font-medium block">
                            {item.set.stage}
                          </span>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="font-mono font-bold text-xs text-[#facc15] whitespace-nowrap">
                            {formatTimeRange(item.set.startTime, item.set.endTime)}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: scoreInfo.dot }}
                            />
                            <span className={`font-mono font-bold text-xs ${scoreInfo.textClass}`}>
                              {scoreInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {item.rating?.reviewSummary && (
                        <p className="text-xs text-[#b5b0c4] line-clamp-2 pt-1 border-t border-[#252136]">
                          {item.rating.reviewSummary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#2a253d]/80 bg-[#161420] shadow-md">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#2a253d] text-[11px] font-bold uppercase tracking-widest text-[#7c768e] bg-[#12101a]">
                      <th className="py-3 px-3 w-[20%] font-semibold">TIME</th>
                      <th className="py-3 px-3 w-[22%] font-semibold">ARTIST</th>
                      <th className="py-3 px-3 w-[18%] font-semibold">STAGE</th>
                      <th className="py-3 px-3 w-[14%] font-semibold">SCORE</th>
                      <th className="py-3 px-3 w-[26%] font-semibold">YOUR REVIEW</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#231f34]">
                    {sets.map((item) => {
                      const scoreInfo = getScoreDisplay(item);
                      const isClash = item.hasClash;

                      return (
                        <tr
                          key={item.id}
                          id={`timeline-row-${item.id}`}
                          onClick={() => onSelectArtist(item)}
                          className={`transition cursor-pointer ${
                            isClash
                              ? 'bg-[#26131a]/85 hover:bg-[#301621]'
                              : 'bg-transparent hover:bg-[#1b172a]/70'
                          }`}
                        >
                          {/* TIME column */}
                          <td className="py-3.5 px-3 font-mono font-bold text-xs sm:text-sm text-[#facc15] whitespace-nowrap">
                            {formatTimeRange(item.set.startTime, item.set.endTime)}
                          </td>

                          {/* ARTIST column */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm sm:text-base text-white tracking-tight">
                                {item.set.artist}
                              </span>
                              {isClash && (
                                <span
                                  className="px-1.5 py-0.5 rounded border border-[#ef4444]/80 text-[#f87171] font-mono text-[10px] font-bold lowercase bg-[#450a0a]/50 leading-none"
                                  title="Clashes with another performance in your schedule"
                                >
                                  clash
                                </span>
                              )}
                            </div>
                          </td>

                          {/* STAGE column */}
                          <td className="py-3.5 px-3 text-xs sm:text-sm text-[#cfc9de] font-medium whitespace-nowrap">
                            {item.set.stage}
                          </td>

                          {/* SCORE column */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                                style={{ backgroundColor: scoreInfo.dot }}
                              />
                              <span
                                className={`font-mono font-bold text-xs sm:text-sm ${scoreInfo.textClass}`}
                              >
                                {scoreInfo.label}
                              </span>
                            </div>
                          </td>

                          {/* YOUR REVIEW column */}
                          <td className="py-3.5 px-3 text-xs sm:text-sm text-[#c8c2d6]">
                            <span className="line-clamp-2">
                              {item.rating?.reviewSummary || (item.isRated ? '—' : 'Unrated act')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {/* 3. Bottom Action Buttons: Download CSV & Download Calendar (.ics) */}
      <div id="timeline-action-buttons" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
        <button
          id="btn-download-csv"
          type="button"
          onClick={() => exportScheduleCsv(items, festival)}
          className="flex-1 sm:flex-initial px-6 py-3 bg-[#eab308] hover:bg-[#facc15] text-slate-950 font-bold rounded-xl text-sm transition shadow-md shadow-amber-950/30 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Download CSV</span>
        </button>

        <button
          id="btn-download-calendar-ics"
          type="button"
          onClick={() => downloadIcsFile(items, festival)}
          className="flex-1 sm:flex-initial px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-950/30 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Download calendar (.ics)</span>
        </button>
      </div>
    </div>
  );
};


