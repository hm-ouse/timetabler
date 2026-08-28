import React from 'react';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ArrowRightLeft,
  Star,
} from 'lucide-react';
import { MatchedScheduleItem, AttendanceStatus } from '../types';
import { getRatingColorMeta } from '../utils/ratingColors';

interface ClashInspectorViewProps {
  items: MatchedScheduleItem[];
  onToggleStatus: (setId: string, newStatus: AttendanceStatus) => void;
  onSelectArtist: (item: MatchedScheduleItem) => void;
  onQuickRate?: (artistName: string, currentScore: number, currentReview?: string, currentGenre?: string) => void;
}

export const ClashInspectorView: React.FC<ClashInspectorViewProps> = ({
  items,
  onToggleStatus,
  onSelectArtist,
  onQuickRate,
}) => {
  // Collect all unique clash pairs
  const clashPairs: { itemA: MatchedScheduleItem; itemB: MatchedScheduleItem }[] = [];
  const handled = new Set<string>();

  items.forEach((item) => {
    if (item.hasClash && item.clashingSetIds.length > 0) {
      item.clashingSetIds.forEach((otherId) => {
        const key = [item.id, otherId].sort().join('--');
        if (!handled.has(key)) {
          handled.add(key);
          const other = items.find((x) => x.id === otherId);
          if (other) {
            clashPairs.push({ itemA: item, itemB: other });
          }
        }
      });
    }
  });

  if (clashPairs.length === 0) {
    return (
      <div id="no-clashes-container" className="p-12 text-center bg-[#161420] rounded-2xl border border-[#29253b] space-y-3 shadow-md">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">No Timetable Clashes Detected</h3>
        <p className="text-xs text-[#8e88a3] max-w-md mx-auto">
          None of your high-rated artists overlap on the schedule. You can catch every scheduled performance cleanly.
        </p>
      </div>
    );
  }

  return (
    <div id="clash-inspector-container" className="space-y-3">
      <div className="bg-[#161420] border border-[#29253b] rounded-2xl p-3.5 px-4 flex items-center justify-between shadow-sm">
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Clash Inspector ({clashPairs.length} Schedule Conflicts)</span>
          </h3>
          <p className="text-xs text-[#8e88a3] mt-0.5">
            Resolve overlapping set times by selecting your primary pick or splitting time between stages.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {clashPairs.map(({ itemA, itemB }) => {
          const colorMetaA = getRatingColorMeta(itemA.normalizedScore, itemA.isRated);
          const colorMetaB = getRatingColorMeta(itemB.normalizedScore, itemB.isRated);

          return (
            <div
              key={`clash-card-${itemA.id}-${itemB.id}`}
              className="p-4 rounded-2xl bg-[#161420] border border-[#29253b] shadow-md space-y-3"
            >
              {/* Header info */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8e88a3] border-b border-[#262137] pb-2">
                <span className="font-bold text-[#e2deec] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>{itemA.set.dayName || itemA.set.dayId} Conflict</span>
                </span>
                <span className="font-mono text-emerald-400 text-xs font-semibold">
                  {itemA.set.startTime} - {itemA.set.endTime} vs {itemB.set.startTime} - {itemB.set.endTime}
                </span>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A */}
                <div
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between backdrop-blur-[2px] ${colorMetaA.bgClass} ${colorMetaA.borderClass} ${colorMetaA.borderLeftClass} ${
                    itemA.status === 'attending'
                      ? 'ring-2 ring-emerald-400 shadow-md'
                      : 'hover:border-[#423b5d]'
                  }`}
                  onClick={() => onSelectArtist(itemA)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight">{itemA.set.artist}</h4>
                        <p className="text-xs text-[#cfc9de] flex items-center gap-1 mt-0.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{itemA.set.stage}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-mono font-black ${colorMetaA.badgeClass}`}>
                          {itemA.isRated ? `${itemA.normalizedScore}%` : itemA.isReviewed ? 'Notes' : 'Unrated'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#b5b0c4] italic mt-2.5 line-clamp-2 bg-[#100e18]/70 p-2.5 rounded-xl border border-[#262137]/80">
                      "{itemA.rating?.reviewSummary || (itemA.isRated ? 'No review summary provided.' : 'Unrated act')}"
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(itemA.id, 'attending');
                        onToggleStatus(itemB.id, 'skipped');
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition min-h-[44px] flex items-center justify-center ${
                        itemA.status === 'attending'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-[#1f1c2c] text-[#e2deec] hover:bg-[#282338] border border-[#2f2a44]'
                      }`}
                    >
                      {itemA.status === 'attending' ? '✓ Selected Pick' : `Choose ${itemA.set.artist}`}
                    </button>
                  </div>
                </div>

                {/* Option B */}
                <div
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between backdrop-blur-[2px] ${colorMetaB.bgClass} ${colorMetaB.borderClass} ${colorMetaB.borderLeftClass} ${
                    itemB.status === 'attending'
                      ? 'ring-2 ring-emerald-400 shadow-md'
                      : 'hover:border-[#423b5d]'
                  }`}
                  onClick={() => onSelectArtist(itemB)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight">{itemB.set.artist}</h4>
                        <p className="text-xs text-[#cfc9de] flex items-center gap-1 mt-0.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{itemB.set.stage}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-mono font-black ${colorMetaB.badgeClass}`}>
                          {itemB.isRated ? `${itemB.normalizedScore}%` : itemB.isReviewed ? 'Notes' : 'Unrated'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#b5b0c4] italic mt-2.5 line-clamp-2 bg-[#100e18]/70 p-2.5 rounded-xl border border-[#262137]/80">
                      "{itemB.rating?.reviewSummary || (itemB.isRated ? 'No review summary provided.' : 'Unrated act')}"
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(itemB.id, 'attending');
                        onToggleStatus(itemA.id, 'skipped');
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition min-h-[44px] flex items-center justify-center ${
                        itemB.status === 'attending'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-[#1f1c2c] text-[#e2deec] hover:bg-[#282338] border border-[#2f2a44]'
                      }`}
                    >
                      {itemB.status === 'attending' ? '✓ Selected Pick' : `Choose ${itemB.set.artist}`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Compromise / Split Action */}
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onToggleStatus(itemA.id, 'attending');
                    onToggleStatus(itemB.id, 'maybe');
                  }}
                  className="text-xs text-[#b5b0c4] hover:text-emerald-300 flex items-center gap-1.5 transition py-1.5 px-3 rounded-xl hover:bg-[#1f1c2c] border border-transparent hover:border-[#2f2a44]"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Split Set: Watch first half of {itemA.set.artist} then run to {itemB.set.artist}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

