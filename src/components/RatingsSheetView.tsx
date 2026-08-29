import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  Plus,
  Scale,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { UserRating, FestivalData, MatchedScheduleItem } from '../types';

interface RatingsSheetViewProps {
  ratings: UserRating[];
  matchedItems: MatchedScheduleItem[];
  festival: FestivalData;
  onOpenSheetModal: () => void;
}

export const RatingsSheetView: React.FC<RatingsSheetViewProps> = ({
  ratings,
  matchedItems,
  festival,
  onOpenSheetModal,
}) => {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'must_see' | 'recommended' | 'medium' | 'unrated' | 'playing'>('all');

  // Match map
  const festivalArtistMap = useMemo(() => {
    const map = new Map<string, MatchedScheduleItem>();
    matchedItems.forEach((m) => {
      map.set(m.set.artist.toLowerCase().trim(), m);
    });
    return map;
  }, [matchedItems]);

  const unratedCount = useMemo(() => {
    return ratings.filter((r) => !r.isRated).length;
  }, [ratings]);

  const timetableUnratedActs = useMemo(() => {
    const unratedSets = matchedItems.filter((m) => !m.isRated);
    const unique = new Set<string>();
    unratedSets.forEach((s) => unique.add(s.set.artist));
    return unique.size;
  }, [matchedItems]);

  const totalUnratedAlertCount = Math.max(unratedCount, timetableUnratedActs);

  const filteredRatings = useMemo(() => {
    return ratings.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const artistMatch = r.artist.toLowerCase().includes(q);
        const reviewMatch = (r.reviewSummary || '').toLowerCase().includes(q);
        const genreMatch = (r.genre || '').toLowerCase().includes(q);
        if (!artistMatch && !reviewMatch && !genreMatch) return false;
      }

      const match = festivalArtistMap.get(r.artist.toLowerCase().trim());
      if (tierFilter === 'playing') {
        if (!match) return false;
      } else if (tierFilter === 'unrated') {
        if (r.isRated) return false;
      } else if (tierFilter === 'must_see') {
        if (!r.isRated || r.normalizedScore < 85) return false;
      } else if (tierFilter === 'recommended') {
        if (!r.isRated || r.normalizedScore < 70 || r.normalizedScore >= 85) return false;
      } else if (tierFilter === 'medium') {
        if (!r.isRated || r.normalizedScore < 50 || r.normalizedScore >= 70) return false;
      }

      return true;
    });
  }, [ratings, search, tierFilter, festivalArtistMap]);

  return (
    <div id="ratings-sheet-view" className="space-y-3">
      {/* Header & Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161420] border border-[#2a253d]/80 rounded-2xl p-3.5 px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Imported Band Ratings Intelligence</h3>
            <p className="text-xs text-[#8e88a3]">
              {ratings.length} total rated artists • Normalized across scales (/10, /5, /4, /100)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalUnratedAlertCount > 0 && (
            <button
              id="ratings-unrated-alert-chip"
              type="button"
              onClick={() => setTierFilter('unrated')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/45 hover:bg-amber-500/30 text-amber-200 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
              title="Filter by unrated artists"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{totalUnratedAlertCount} Unrated Acts</span>
            </button>
          )}

          <button
            id="btn-edit-import-ratings"
            type="button"
            onClick={onOpenSheetModal}
            className="px-3 py-1.5 bg-[#262137] hover:bg-[#312a47] text-white hover:text-emerald-200 border border-[#362f4e] rounded-xl text-xs font-bold transition"
          >
            Edit / Re-import Google Sheet
          </button>
        </div>
      </div>

      {/* Unrated Acts Alert Warning Banner */}
      {totalUnratedAlertCount > 0 && (
        <div
          id="ratings-sheet-unrated-alert-banner"
          className="flex items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="font-bold text-amber-200">
                {totalUnratedAlertCount} {totalUnratedAlertCount === 1 ? 'Act' : 'Acts'} Need Attention:{' '}
              </span>
              <span className="text-amber-300/80">
                You have unrated artists playing at the festival. Rate them or add notes to ensure they get prioritized accurately.
              </span>
            </div>
          </div>
          <button
            id="btn-filter-unrated-alert"
            type="button"
            onClick={() => setTierFilter('unrated')}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg font-bold text-xs shrink-0 whitespace-nowrap transition"
          >
            View Unrated
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[#7c768e] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search artists, genres, review notes..."
            className="w-full bg-[#161420] border border-[#2a253d]/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#e2deec] placeholder-[#6f6980] focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Tier filter tabs */}
        <div className="flex items-center gap-1 bg-[#100e18] p-1 rounded-xl border border-[#252136] text-xs overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: 'all', label: 'All' },
            { id: 'playing', label: `Playing at Festival` },
            { id: 'must_see', label: 'Must-See (85%+)' },
            { id: 'recommended', label: 'Recommended (70%+)' },
            { id: 'medium', label: 'Medium (50%+)' },
            { id: 'unrated', label: `Unrated (${unratedCount})`, hasAlert: unratedCount > 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTierFilter(tab.id as any)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                tierFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : tab.hasAlert
                  ? 'text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/20'
                  : 'text-[#9d97b0] hover:text-[#e2deec]'
              }`}
            >
              {tab.hasAlert && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#2a253d]/80 rounded-2xl overflow-hidden bg-[#161420] shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#100e18] text-[#8e88a3] border-b border-[#262137] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Artist / Band</th>
                <th className="py-2.5 px-4">Festival Slot</th>
                <th className="py-2.5 px-4">Normalized Score</th>
                <th className="py-2.5 px-4">Raw Sheet Score</th>
                <th className="py-2.5 px-4">Review Summary</th>
                <th className="py-2.5 px-4">Genre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262137]/60 bg-[#161420]">
              {filteredRatings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8e88a3]">
                    <p className="text-sm font-semibold text-[#b5b0c4]">No matching artists found</p>
                    <p className="text-xs text-[#7c768e] mt-1">Try clearing search filters or importing additional bands.</p>
                  </td>
                </tr>
              ) : (
                filteredRatings.map((r, i) => {
                  const match = festivalArtistMap.get(r.artist.toLowerCase().trim());

                  return (
                    <tr key={r.id || i} className="hover:bg-[#201c2e] transition">
                      <td className="py-2.5 px-4 font-bold text-white">{r.artist}</td>
                      <td className="py-2.5 px-4">
                        {match ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span>{match.set.dayName} @ {match.set.stage} ({match.set.startTime})</span>
                          </span>
                        ) : (
                          <span className="text-[#6f6980] text-[11px]">Not playing</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {r.isRated ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400 min-w-[36px]">{r.normalizedScore}%</span>
                            <div className="w-16 h-1.5 bg-[#12101a] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  r.normalizedScore >= 85
                                    ? 'bg-emerald-500'
                                    : r.normalizedScore >= 70
                                    ? 'bg-indigo-500'
                                    : r.normalizedScore >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${r.normalizedScore}%` }}
                              />
                            </div>
                          </div>
                        ) : r.isReviewed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            Notes Only
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#231f32] text-[#8e88a3] border border-[#322d4a]">
                            Unrated
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#dcd6e9]">
                        {r.isRated ? (
                          <>
                            {r.rawScore} <span className="text-[#7c768e] text-[10px]">({r.detectedScale})</span>
                          </>
                        ) : (
                          <span className="text-[#6f6980] text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#dcd6e9] max-w-sm">
                        {r.reviewSummary ? <span className="italic">"{r.reviewSummary}"</span> : <span className="text-[#595368]">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-[#8e88a3]">{r.genre || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
